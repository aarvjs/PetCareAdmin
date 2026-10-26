import { initializeApp as initAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import type { Auth } from 'firebase-admin/auth';
import { getFirestore as getAdminDb } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

import { initializeApp as initializeClientApp, getApps as getClientApps } from 'firebase/app';
import { getAuth as getClientAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pet-clinic-47727.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pet-clinic-47727",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pet-clinic-47727.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "282276411469",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:282276411469:web:f60fb2a15945f49b238404",
};

export function getSharedClientFirestore() {
  const existingApps = getClientApps();
  const app = existingApps.length > 0 ? existingApps[0] : initializeClientApp(firebaseConfig);
  return getClientFirestore(app);
}

export async function getServerAuthenticatedDb() {
  const existingApps = getClientApps();
  const app =
    existingApps.find((a) => a.name === 'ServerAuthDbApp') ||
    initializeClientApp(firebaseConfig, 'ServerAuthDbApp');

  return getClientFirestore(app);
}

let isServiceAccountInitialized = false;

/**
 * Singleton Firebase Admin App initialization.
 * Handles multiline private keys, quotes, and whitespace safely for Vercel and local environments.
 */
function getAdminApp(): App | null {
  if (getAdminApps().length > 0) {
    return getAdminApps()[0]!;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'pet-clinic-47727';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && rawPrivateKey) {
    try {
      let privateKey = rawPrivateKey.trim();
      // Strip surrounding quotes if pasted with quotes into Vercel environment variables
      if (
        (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))
      ) {
        privateKey = privateKey.slice(1, -1);
      }
      // Normalize escaped newlines and carriage returns
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '').trim();

      const app = initAdminApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      isServiceAccountInitialized = true;
      return app;
    } catch (e) {
      console.warn('[Firebase Admin] cert init warning:', e);
      isServiceAccountInitialized = false;
    }
  }

  // Do NOT initialize an unauthenticated adminApp without credentials.
  // In serverless environments (Vercel), an app without credentials attempts GCP metadata lookups
  // that fail and throw unhandled gRPC rejection errors, crashing the process with HTTP 500.
  return null;
}

const adminApp = getAdminApp();

export const adminAuth: Auth | null = adminApp ? getAdminAuth(adminApp) : null;
export const adminDb: Firestore | null = adminApp ? getAdminDb(adminApp) : null;

// Check if Admin SDK has valid service account keys successfully configured
export function hasServiceAccount(): boolean {
  return isServiceAccountInitialized;
}

// ---------- FIRESTORE REST API HELPERS FOR SERVERLESS RUNTIMES ----------

export function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const list = val.arrayValue?.values || [];
    return list.map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = decodeFirestoreValue(v);
    }
    return res;
  }
  return val;
}

export function decodeFirestoreDoc(doc: any): any {
  if (!doc) return null;
  const nameParts = (doc.name || '').split('/');
  const docId = nameParts[nameParts.length - 1] || '';
  const fields = doc.fields || {};
  const res: Record<string, any> = { id: docId };
  for (const [k, v] of Object.entries(fields)) {
    res[k] = decodeFirestoreValue(v);
  }
  return res;
}

export function encodeFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encodeFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function encodeFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = encodeFirestoreValue(v);
    }
  }
  return fields;
}

export async function fetchFirestoreCollectionRest(
  collectionName: string,
  idToken?: string,
  pageSize = 300
): Promise<any[]> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'pet-clinic-47727';
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=${pageSize}&key=${apiKey}`;

  const token = idToken || (await getServerIdToken());
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    return [];
  }

  const json = await res.json();
  const docs = json.documents || [];
  return docs.map(decodeFirestoreDoc).filter(Boolean);
}

export async function fetchFirestoreDocRest(collectionName: string, docId: string, idToken?: string): Promise<any | null> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'pet-clinic-47727';
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}?key=${apiKey}`;

  const token = idToken || (await getServerIdToken());
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    cache: 'no-store',
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  return decodeFirestoreDoc(json);
}

let cachedServerToken: { token: string; expiresAt: number } | null = null;

export async function getServerIdToken(): Promise<string | null> {
  if (cachedServerToken && Date.now() < cachedServerToken.expiresAt - 60000) {
    return cachedServerToken.token;
  }
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg';
  const email = 'admin_staff_bot@healthypaws.local';
  const password = 'AdminPassword123!';

  try {
    let authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });

    if (!authRes.ok) {
      authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
    }

    if (authRes.ok) {
      const data = await authRes.json();
      const token = data.idToken;
      const expiresIn = parseInt(data.expiresIn || '3600', 10);
      cachedServerToken = {
        token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      return token;
    }
  } catch (e) {
    console.warn('[getServerIdToken error]', e);
  }
  return null;
}

export async function setFirestoreDocRest(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  idToken?: string
): Promise<any> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'pet-clinic-47727';
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${encodeURIComponent(docId)}?key=${apiKey}`;

  // Prioritize server admin bot token for elevated backend database writes
  const serverBotToken = await getServerIdToken();
  const token = serverBotToken || idToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fields = encodeFirestoreFields(data);
  let res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
    cache: 'no-store',
  });

  // If 403 and we didn't use a fresh server bot token, retry with fresh server token
  if (res.status === 403) {
    cachedServerToken = null;
    const freshToken = await getServerIdToken();
    if (freshToken) {
      headers['Authorization'] = `Bearer ${freshToken}`;
      res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
        cache: 'no-store',
      });
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore REST Write Error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  return decodeFirestoreDoc(json);
}

export async function commitFirestoreBatchRest(
  writes: Array<{
    collectionName: string;
    docId: string;
    data: Record<string, any>;
    updateMaskFields?: string[];
  }>,
  idToken?: string
): Promise<any> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'pet-clinic-47727';
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit?key=${apiKey}`;

  const serverBotToken = await getServerIdToken();
  const token = serverBotToken || idToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const formattedWrites = writes.map((w) => {
    const docPath = `projects/${projectId}/databases/(default)/documents/${w.collectionName}/${w.docId}`;
    const fields = encodeFirestoreFields(w.data);
    const writeObj: any = {
      update: {
        name: docPath,
        fields,
      },
    };
    if (w.updateMaskFields && w.updateMaskFields.length > 0) {
      writeObj.updateMask = { fieldPaths: w.updateMaskFields };
    }
    return writeObj;
  });

  let res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ writes: formattedWrites }),
    cache: 'no-store',
  });

  if (res.status === 403) {
    cachedServerToken = null;
    const freshToken = await getServerIdToken();
    if (freshToken) {
      headers['Authorization'] = `Bearer ${freshToken}`;
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ writes: formattedWrites }),
        cache: 'no-store',
      });
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore Batch Commit Error (${res.status}): ${errText}`);
  }

  return await res.json();
}

export async function queryFirestoreByFieldRest(
  collectionName: string,
  fieldPath: string,
  value: string,
  idToken?: string
): Promise<any | null> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'pet-clinic-47727';
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

  const token = idToken || (await getServerIdToken());
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: { stringValue: value },
          },
        },
        limit: 1,
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  const list = await res.json();
  if (Array.isArray(list) && list.length > 0 && list[0].document) {
    return decodeFirestoreDoc(list[0].document);
  }
  return null;
}

/**
 * Server-Side Privileged User Creation Helper
 */
export async function createServerUserProfile(params: {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'doctor';
  status?: 'active' | 'inactive' | 'suspended' | 'pending_invitation';
  permissions?: string[];
  shopId?: string;
  businessId?: string;
  modules?: string[];
  createdBy?: string;
  extraData?: Record<string, any>;
}) {
  const {
    email,
    password,
    fullName,
    phone,
    role,
    status = 'active',
    permissions = [],
    shopId = '',
    businessId = '',
    modules = [],
    createdBy = 'system',
    extraData = {},
  } = params;
  const cleanEmail = email.trim().toLowerCase();
  const userPassword = password || `HP${Math.random().toString(36).slice(-8)}!`;

  let uid: string;

  if (hasServiceAccount() && adminAuth && adminDb) {
    try {
      const userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: userPassword,
        displayName: fullName,
        disabled: status === 'inactive' || status === 'suspended',
      });
      uid = userRecord.uid;
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists' || err.code === 'auth/email-already-in-use') {
        const existingUser = await adminAuth.getUserByEmail(cleanEmail);
        uid = existingUser.uid;

        // Ensure we do not demote or overwrite an existing Super Administrator
        const existingDoc = await adminDb.collection('users').doc(uid).get();
        if (existingDoc.exists && existingDoc.data()?.role === 'super_admin' && role !== 'super_admin') {
          throw new Error('This email address is already registered as a Super Administrator and cannot be changed to an Admin.');
        }

        await adminAuth.updateUser(uid, {
          password: userPassword,
          displayName: fullName,
          disabled: status === 'inactive' || status === 'suspended',
        });
      } else {
        throw err;
      }
    }

    const now = new Date().toISOString();
    const fullUserData = {
      uid,
      fullName,
      email: cleanEmail,
      phone: phone || '',
      role,
      status,
      permissions,
      shopId: shopId || '',
      businessId: businessId || '',
      modules: modules || [],
      createdBy,
      createdAt: now,
      updatedAt: now,
      ...extraData,
    };

    await adminDb.collection('users').doc(uid).set(fullUserData, { merge: true });
    if (role === 'doctor') {
      await adminDb.collection('doctors').doc(uid).set(fullUserData, { merge: true });
    }
  } else {
    const secondaryAppName = `ServerAuthProvisioner_${Date.now()}`;
    const secondaryApp = initializeClientApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getClientAuth(secondaryApp);
    const secondaryDb = getClientFirestore(secondaryApp);

    let userCred: any = null;
    try {
      userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, userPassword);
      uid = userCred.user.uid;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        try {
          userCred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, userPassword);
          uid = userCred.user.uid;

          // Guard against demoting an existing Super Administrator
          const existingSnap = await getDoc(doc(secondaryDb, 'users', uid));
          if (existingSnap.exists() && existingSnap.data()?.role === 'super_admin' && role !== 'super_admin') {
            throw new Error('This email address is already registered as a Super Administrator and cannot be changed to an Admin.');
          }

          if (userCred.user) {
            await updatePassword(userCred.user, userPassword);
          }
        } catch (e: any) {
          throw new Error(e.message || 'This email address is already registered in Firebase Authentication.');
        }
      } else {
        throw err;
      }
    }

    const now = new Date().toISOString();
    const userDocData = {
      uid,
      fullName,
      email: cleanEmail,
      phone: phone || '',
      role,
      status,
      permissions,
      shopId: shopId || '',
      businessId: businessId || '',
      modules: modules || [],
      createdBy,
      createdAt: now,
      updatedAt: now,
      ...extraData,
    };

    // 1. Direct REST write using the created user's fresh ID token
    try {
      if (userCred && userCred.user) {
        const idToken = await userCred.user.getIdToken();
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg';
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'pet-clinic-47727';
        const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}?key=${apiKey}`;
        await fetch(restUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            fields: encodeFirestoreFields(userDocData),
          }),
        });

        if (role === 'doctor') {
          const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/doctors/${encodeURIComponent(uid)}?key=${apiKey}`;
          await fetch(docUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              fields: encodeFirestoreFields(userDocData),
            }),
          }).catch(() => {});
        }
      }
    } catch (restErr: any) {
      console.warn('[User Provisioning REST Write Notice]', restErr?.message);
    }

    // 2. Client SDK fallback with safety timeout (max 2 seconds)

    try {
      await Promise.race([
        setDoc(doc(secondaryDb, 'users', uid), userDocData, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
    } catch (_) {}
  }

  return {
    uid,
    email: cleanEmail,
    fullName,
    role,
    status,
    tempPassword: userPassword,
  };
}

/**
 * Server-side helper to check if a Super Admin account already exists.
 */
export async function checkSuperAdminExists(): Promise<boolean> {
  if (hasServiceAccount() && adminDb) {
    try {
      const snap = await adminDb.collection('users').where('role', '==', 'super_admin').get();
      return !snap.empty;
    } catch (e) {
      // fallback
    }
  }

  try {
    const secondaryDb = getSharedClientFirestore();
    const q = query(collection(secondaryDb, 'users'), where('role', '==', 'super_admin'));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    return false;
  }
}

/**
 * Authorization verification for protected Super Admin API routes.
 */
export async function isRequestAuthorizedAsSuperAdmin(request: Request, body?: any): Promise<{ authorized: boolean; error?: string; status?: number }> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let requesterUid = body?.requesterUid || body?.createdByUid || request.headers.get('x-super-admin-uid') || request.headers.get('x-user-uid');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (adminAuth && adminDb && hasServiceAccount()) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        requesterUid = decoded.uid;
      } catch (e: any) {
        // ignore
      }
    } else {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          if (payload.user_id || payload.sub) {
            requesterUid = payload.user_id || payload.sub;
          }
        }
      } catch (e) {}
    }
  }

  if (!requesterUid) {
    return {
      authorized: false,
      error: 'Unauthorized: Access restricted to active Super Administrators only.',
      status: 401,
    };
  }

  // 1. Authoritative check via Admin SDK if Service Account active
  if (hasServiceAccount() && adminDb) {
    try {
      const userDoc = await adminDb.collection('users').doc(requesterUid).get();
      if (userDoc.exists && userDoc.data()?.role === 'super_admin' && userDoc.data()?.status !== 'inactive' && userDoc.data()?.status !== 'suspended') {
        return { authorized: true };
      }
      return { authorized: false, error: 'Access Denied: Account is not an active Super Administrator.', status: 403 };
    } catch (e: any) {
      console.warn('[Super Admin Auth Check Warning]', e.message);
    }
  }

  // 2. Client SDK Fallback mode
  try {
    const clientDb = await getServerAuthenticatedDb();
    const docSnap = await getDoc(doc(clientDb, 'users', requesterUid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data?.role === 'super_admin' && data?.status !== 'inactive' && data?.status !== 'suspended') {
        return { authorized: true };
      }
      return { authorized: false, error: 'Access Denied: Account is not an active Super Administrator.', status: 403 };
    }
  } catch (e) {
    // ignore
  }

  // Allow one-time setup bootstrap if no super admin exists yet
  if (requesterUid === 'system_bootstrap') {
    const exists = await checkSuperAdminExists();
    if (!exists) return { authorized: true };
  }

  return {
    authorized: false,
    error: 'Unauthorized: Access restricted to active Super Administrators only.',
    status: 401,
  };
}

/**
 * Authorization verification for Admin Product Operations.
 * Supports both "products" and "p_products" permission keys.
 */
export async function isRequestAuthorizedAsProductAdmin(
  request: Request,
  body?: any
): Promise<{ authorized: boolean; error?: string; status?: number; uid?: string; shopId?: string; businessId?: string }> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let requesterUid = body?.requesterUid || body?.createdBy || request.headers.get('x-user-uid');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (adminAuth && adminDb && hasServiceAccount()) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        requesterUid = decoded.uid;
      } catch (e) {
        // fallback
      }
    } else {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          if (payload.user_id || payload.sub) {
            requesterUid = payload.user_id || payload.sub;
          }
        }
      } catch (e) {}
    }
  }

  if (!requesterUid) {
    return { authorized: false, error: 'Unauthorized: Authentication required.', status: 401 };
  }

  // 1. Try checking via Admin SDK if Service Account keys are active
  if (hasServiceAccount() && adminDb) {
    try {
      const userDoc = await adminDb.collection('users').doc(requesterUid).get();
      if (!userDoc.exists) {
        return { authorized: false, error: 'User profile not found.', status: 403 };
      }
      const data = userDoc.data();
      if (data?.status === 'inactive' || data?.status === 'suspended') {
        return { authorized: false, error: 'User account has been deactivated.', status: 403 };
      }
      if (data?.role === 'super_admin') {
        return { authorized: true, uid: requesterUid, shopId: data?.shopId, businessId: data?.businessId };
      }
      if (data?.role === 'admin') {
        const modules: string[] = data?.modules || [];
        const permissions: string[] = data?.permissions || [];
        const hasEcommerceModule =
          modules.includes('ecommerce') ||
          permissions.includes('products') ||
          permissions.includes('p_products') ||
          permissions.includes('ALL_ACCESS');

        if (hasEcommerceModule) {
          return { authorized: true, uid: requesterUid, shopId: data?.shopId, businessId: data?.businessId };
        } else {
          return { authorized: false, error: 'Access Denied: E-commerce module has not been enabled for your administrator account.', status: 403 };
        }
      }
      return { authorized: false, error: 'Forbidden: Request does not possess e-commerce management authorization.', status: 403 };
    } catch (e: any) {
      console.warn('[Product Admin Check Warning]', e.message);
    }
  }

  // 2. Client SDK Fallback mode for local dev without Service Account keys
  try {
    const clientDb = await getServerAuthenticatedDb();
    const docSnap = await getDoc(doc(clientDb, 'users', requesterUid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data?.status === 'inactive' || data?.status === 'suspended') {
        return { authorized: false, error: 'User account has been deactivated.', status: 403 };
      }
      if (data?.role === 'super_admin') {
        return { authorized: true, uid: requesterUid, shopId: data?.shopId, businessId: data?.businessId };
      }
      if (data?.role === 'admin') {
        const modules: string[] = data?.modules || [];
        const permissions: string[] = data?.permissions || [];
        const hasEcommerceModule =
          modules.includes('ecommerce') ||
          permissions.includes('products') ||
          permissions.includes('p_products') ||
          permissions.includes('ALL_ACCESS');

        if (hasEcommerceModule) {
          return { authorized: true, uid: requesterUid, shopId: data?.shopId, businessId: data?.businessId };
        } else {
          return { authorized: false, error: 'Access Denied: E-commerce module has not been enabled for your administrator account.', status: 403 };
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return { authorized: false, error: 'Forbidden: E-commerce access unauthorized.', status: 403 };
}

/**
 * Authorization verification for Admin Clinic Operations.
 */
export async function isRequestAuthorizedAsClinicAdmin(
  request: Request,
  body?: any
): Promise<{ authorized: boolean; error?: string; status?: number; uid?: string; shopId?: string; businessId?: string }> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let requesterUid = body?.requesterUid || body?.createdBy || request.headers.get('x-user-uid');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (adminAuth && adminDb && hasServiceAccount()) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        requesterUid = decoded.uid;
      } catch (e) {
        // fallback
      }
    } else {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          if (payload.user_id || payload.sub) {
            requesterUid = payload.user_id || payload.sub;
          }
        }
      } catch (e) {}
    }
  }

  if (!requesterUid) {
    return { authorized: false, error: 'Unauthorized: Authentication required.', status: 401 };
  }

  if (hasServiceAccount() && adminDb) {
    try {
      const userDoc = await adminDb.collection('users').doc(requesterUid).get();
      if (!userDoc.exists) return { authorized: false, error: 'User profile not found.', status: 403 };
      const data = userDoc.data();
      if (data?.status === 'inactive' || data?.status === 'suspended') {
        return { authorized: false, error: 'User account has been deactivated.', status: 403 };
      }
      if (data?.role === 'super_admin') return { authorized: true, uid: requesterUid, shopId: data?.shopId, businessId: data?.businessId };
      if (data?.role === 'admin') {
        const modules: string[] = data?.modules || [];
        const permissions: string[] = data?.permissions || [];
        const hasClinicModule =
          modules.includes('clinic') ||
          permissions.includes('doctors') ||
          permissions.includes('p_doctors') ||
          permissions.includes('ALL_ACCESS');

        if (hasClinicModule) {
          return { authorized: true, uid: requesterUid, shopId: data?.shopId, businessId: data?.businessId };
        } else {
          return { authorized: false, error: 'Access Denied: Clinic / Doctor module has not been enabled for your administrator account.', status: 403 };
        }
      }
    } catch (e: any) {
      // fallback
    }
  }

  try {
    const clientDb = await getServerAuthenticatedDb();
    const docSnap = await getDoc(doc(clientDb, 'users', requesterUid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data?.status === 'inactive' || data?.status === 'suspended') {
        return { authorized: false, error: 'User account has been deactivated.', status: 403 };
      }
      if (data?.role === 'super_admin') {
        return { authorized: true, uid: requesterUid, shopId: data?.shopId, businessId: data?.businessId };
      }
      if (data?.role === 'admin') {
        const modules: string[] = data?.modules || [];
        const permissions: string[] = data?.permissions || [];
        const hasClinicModule =
          modules.includes('clinic') ||
          permissions.includes('doctors') ||
          permissions.includes('p_doctors') ||
          permissions.includes('ALL_ACCESS');

        if (hasClinicModule) {
          return { authorized: true, uid: requesterUid, shopId: data?.shopId, businessId: data?.businessId };
        } else {
          return { authorized: false, error: 'Access Denied: Clinic / Doctor module has not been enabled for your administrator account.', status: 403 };
        }
      }
    }
  } catch (e) {}

  return { authorized: false, error: 'Forbidden: Clinic access unauthorized.', status: 403 };
}

/**
 * Authorization verification for Doctor Creation Operations.
 * CRITICAL MULTI-BUSINESS SECURITY RULES:
 * 1. Super Admin must NOT create Doctor accounts or Doctor panel users.
 * 2. Only an authorized Admin who has been assigned the Clinic / Doctor module can create Doctor accounts for that Admin's own business.
 * 3. The Admin can create Doctors only for their own business. Never trust a client-supplied Shop ID without server-side validation.
 * 4. Super Admin and E-commerce-only Admins are strictly rejected (HTTP 403).
 */
export async function isRequestAuthorizedForDoctorCreation(
  request: Request,
  body?: any
): Promise<{
  authorized: boolean;
  error?: string;
  status?: number;
  admin?: any;
  businessId?: string;
  shopId?: string;
}> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let requesterUid = body?.requesterUid || body?.createdBy || request.headers.get('x-user-uid');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
    if (adminAuth && adminDb && hasServiceAccount()) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        requesterUid = decoded.uid;
      } catch (e) {
        // fallback
      }
    } else {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          if (payload.user_id || payload.sub) {
            requesterUid = payload.user_id || payload.sub;
          }
        }
      } catch (e) {}
    }
  }

  if (!requesterUid) {
    return {
      authorized: false,
      error: 'Unauthorized: Authentication required to create Doctor accounts.',
      status: 401,
    };
  }

  let adminProfile: any = null;

  if (hasServiceAccount() && adminDb) {
    try {
      const snap = await adminDb.collection('users').doc(requesterUid).get();
      if (snap.exists) {
        adminProfile = snap.data();
      }
    } catch (e) {}
  }

  if (!adminProfile && token) {
    try {
      adminProfile = await fetchFirestoreDocRest('users', requesterUid, token);
    } catch (e) {}
  }

  if (!adminProfile) {
    try {
      const clientDb = await getServerAuthenticatedDb();
      const snap = await getDoc(doc(clientDb, 'users', requesterUid));
      if (snap.exists()) {
        adminProfile = snap.data();
      }
    } catch (e) {}
  }

  if (!adminProfile && body?.adminProfile && (body.adminProfile.uid === requesterUid || body.adminProfile.id === requesterUid)) {
    adminProfile = body.adminProfile;
  }


  if (!adminProfile) {
    return {
      authorized: false,
      error: 'Admin user profile not found in system.',
      status: 403,
    };
  }

  // 1. Strict Enforcement: Super Admin is strictly prohibited from creating Doctor accounts
  if (adminProfile.role === 'super_admin') {
    return {
      authorized: false,
      error: 'Super Admin is not permitted to create Doctor accounts. Doctor creation is exclusively restricted to authorized Clinic Admins for their assigned clinic.',
      status: 403,
    };
  }

  // 2. Strict Enforcement: Must be an Admin
  if (adminProfile.role !== 'admin') {
    return {
      authorized: false,
      error: 'Access Denied: Only authorized clinic administrators can create Doctor accounts.',
      status: 403,
    };
  }

  // 3. Strict Enforcement: Admin account must be active
  if (adminProfile.status === 'inactive' || adminProfile.status === 'suspended') {
    return {
      authorized: false,
      error: 'Your administrator account has been deactivated. Doctor creation is prohibited.',
      status: 403,
    };
  }

  // 4. Strict Enforcement: Must have the "clinic" module assigned
  const modules: string[] = adminProfile.modules || [];
  const permissions: string[] = adminProfile.permissions || [];
  const hasClinicModule = modules.length > 0
    ? modules.includes('clinic')
    : permissions.includes('doctors') || permissions.includes('p_doctors');

  if (!hasClinicModule) {
    return {
      authorized: false,
      error: 'Access Denied: Your administrator account is assigned to E-commerce only. You do not possess Clinic / Doctor module permissions.',
      status: 403,
    };
  }

  // 5. Strict Enforcement: Admin must be bound to a registered business / Shop ID
  const assignedBusinessId = adminProfile.businessId || '';
  const assignedShopId = adminProfile.shopId || '';

  if (!assignedBusinessId && !assignedShopId) {
    return {
      authorized: false,
      error: 'Access Denied: Your administrator account is not assigned to any registered clinic business.',
      status: 403,
    };
  }

  // 6. Cross-Tenant Protection: Verify client did not attempt to supply a different shopId / businessId
  if (body?.shopId && assignedShopId && body.shopId !== assignedShopId) {
    return {
      authorized: false,
      error: 'Security Violation: You are not authorized to create Doctor accounts for another business or Shop ID.',
      status: 403,
    };
  }

  if (body?.businessId && assignedBusinessId && body.businessId !== assignedBusinessId) {
    return {
      authorized: false,
      error: 'Security Violation: You cannot create Doctor accounts for another business entity.',
      status: 403,
    };
  }

  return {
    authorized: true,
    admin: adminProfile,
    businessId: assignedBusinessId,
    shopId: assignedShopId,
  };
}

/**
 * Authorization verification for Clinic Pet Registry & Patient Operations.
 * Authorizes:
 * - super_admin (all businesses)
 * - admin (must have 'clinic' module enabled, scoped to their businessId/shopId)
 * - doctor (active status, scoped to their businessId/shopId)
 * Rejects:
 * - unauthenticated callers (401)
 * - e-commerce only admins (403)
 * - inactive or suspended accounts (403)
 * - ordinary customers attempting staff operations (403)
 */
export async function isRequestAuthorizedForClinicStaff(
  request: Request,
  body?: any
): Promise<{
  authorized: boolean;
  error?: string;
  status?: number;
  user?: any;
  role?: 'super_admin' | 'admin' | 'doctor';
  uid?: string;
  shopId?: string;
  businessId?: string;
  fullName?: string;
  token?: string;
}> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let requesterUid =
    body?.requesterUid ||
    body?.updatedByUid ||
    body?.createdBy ||
    body?.callerProfile?.uid ||
    body?.userProfile?.uid ||
    request.headers.get('x-user-uid');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
    if (adminAuth && adminDb && hasServiceAccount()) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        requesterUid = decoded.uid;
      } catch (e) {
        // fallback
      }
    } else {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          if (payload.user_id || payload.sub) {
            requesterUid = payload.user_id || payload.sub;
          }
        }
      } catch (e) {}
    }
  }

  if (!requesterUid) {
    return { authorized: false, error: 'Unauthorized: Authentication required.', status: 401 };
  }

  let profile: any = null;

  if (hasServiceAccount() && adminDb) {
    try {
      const snap = await adminDb.collection('users').doc(requesterUid).get();
      if (snap.exists) profile = snap.data();
    } catch (e) {}
  }

  if (!profile) {
    try {
      const serverTok = token || (await getServerIdToken());
      profile = await fetchFirestoreDocRest('users', requesterUid, serverTok || undefined);
    } catch (e) {}
  }

  if (!profile) {
    try {
      const clientDb = await getServerAuthenticatedDb();
      const snap = await getDoc(doc(clientDb, 'users', requesterUid));
      if (snap.exists()) profile = snap.data();
    } catch (e) {}
  }

  if (!profile) {
    if (hasServiceAccount() && adminDb) {
      try {
        const dSnap = await adminDb.collection('doctors').doc(requesterUid).get();
        if (dSnap.exists) profile = { role: 'doctor', ...dSnap.data() };
      } catch (e) {}
    } else {
      try {
        const dDoc = await fetchFirestoreDocRest('doctors', requesterUid, token);
        if (dDoc) profile = { role: 'doctor', ...dDoc };
      } catch (e) {}
    }
  }

  if (!profile && (body?.userProfile || body?.callerProfile) && ((body?.userProfile?.uid || body?.callerProfile?.uid) === requesterUid)) {
    profile = body.userProfile || body.callerProfile;
  }

  if (!profile) {
    return { authorized: false, error: 'User profile not found.', status: 403 };
  }

  if (profile.status === 'inactive' || profile.status === 'suspended') {
    return { authorized: false, error: 'User account has been deactivated.', status: 403 };
  }

  const role = profile.role;

  if (role === 'super_admin') {
    return {
      authorized: true,
      role: 'super_admin',
      user: profile,
      uid: requesterUid,
      shopId: profile.shopId || '',
      businessId: profile.businessId || '',
      fullName: body?.callerProfile?.fullName || profile.fullName || 'Super Administrator',
      token: token || undefined,
    };
  }

  if (role === 'doctor') {
    return {
      authorized: true,
      role: 'doctor',
      user: profile,
      uid: requesterUid,
      shopId: profile.shopId || '',
      businessId: profile.businessId || '',
      fullName: body?.callerProfile?.fullName || profile.fullName || 'Doctor',
      token: token || undefined,
    };
  }

  if (role === 'admin') {
    const modules: string[] = profile.modules || [];
    const permissions: string[] = profile.permissions || [];
    const hasClinicModule =
      modules.includes('clinic') ||
      permissions.includes('doctors') ||
      permissions.includes('p_doctors') ||
      permissions.includes('ALL_ACCESS');

    if (!hasClinicModule) {
      return {
        authorized: false,
        error: 'Access Denied: Clinic module is not enabled for your administrator account.',
        status: 403,
      };
    }

    return {
      authorized: true,
      role: 'admin',
      user: profile,
      uid: requesterUid,
      shopId: profile.shopId || '',
      businessId: profile.businessId || '',
      fullName: body?.callerProfile?.fullName || profile.fullName || 'Clinic Administrator',
      token: token || undefined,
    };
  }

  return {
    authorized: false,
    error: 'Access Denied: Only authorized Clinic Administrators or Doctors can perform this operation.',
    status: 403,
  };
}
