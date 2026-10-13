'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { safeFetchJson } from './safeFetch';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'doctor';
  status?: 'active' | 'inactive' | 'suspended';
  photoURL?: string | null;
  qualification?: string;
  specialization?: string;
  experience?: string;
  availability?: string;
  registrationNumber?: string;
  permissions?: string[];
  shopId?: string;
  businessId?: string;
  assignedBusinessName?: string;
  modules?: ('ecommerce' | 'clinic')[];
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}

export interface BusinessDetails {
  id: string;
  shopId: string;
  name: string;
  businessType?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logoUrl?: string;
  logoPublicId?: string;
  status: 'active' | 'inactive';
  modules?: ('ecommerce' | 'clinic')[];
  adminCount?: number;
  assignedAdmins?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  business: BusinessDetails | null;
  businessLoading: boolean;
  businessError: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setSessionUser: (prof: UserProfile) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  business: null,
  businessLoading: false,
  businessError: null,
  isAuthenticated: false,
  loading: true,
  setSessionUser: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
  updateProfileData: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [businessLoading, setBusinessLoading] = useState<boolean>(false);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to load stored session from sessionStorage if available
  const getStoredSession = (): UserProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('hp_session_user');
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
    } catch (e) {
      console.warn('Could not read stored session profile:', e);
    }
    return null;
  };

  const getStoredBusiness = (): BusinessDetails | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('hp_session_business');
      if (stored) {
        return JSON.parse(stored) as BusinessDetails;
      }
    } catch (e) {
      console.warn('Could not read stored session business:', e);
    }
    return null;
  };

  const fetchBusiness = async (adminProfile: UserProfile): Promise<BusinessDetails | null> => {
    if (adminProfile.role !== 'admin' && adminProfile.role !== 'doctor') {
      setBusiness(null);
      setBusinessError(null);
      setBusinessLoading(false);
      return null;
    }

    setBusinessLoading(true);
    setBusinessError(null);

    const bId = adminProfile.businessId;
    const sId = adminProfile.shopId;

    if (!bId && !sId) {
      setBusiness(null);
      setBusinessError('Your administrator account is not assigned to any registered clinic or business.');
      setBusinessLoading(false);
      return null;
    }

    try {
      let bData: BusinessDetails | null = null;

      // 1. Fetch by canonical businessId from Firestore
      if (bId) {
        try {
          const bSnap = await getDoc(doc(db, 'businesses', bId));
          if (bSnap.exists()) {
            bData = { id: bSnap.id, ...bSnap.data() } as BusinessDetails;
          }
        } catch (e) {
          // ignore and try next method
        }
      }

      // 2. Fetch by server API route (handles verified server permissions)
      if (!bData) {
        try {
          const { data } = await safeFetchJson<any>(
            `/api/admin/business?businessId=${encodeURIComponent(bId || '')}&shopId=${encodeURIComponent(sId || '')}&uid=${encodeURIComponent(adminProfile.uid || '')}`
          );
          if (data?.success && data?.business) {
            bData = data.business as BusinessDetails;
          } else if (data?.error) {
            setBusinessError(data.error);
          }
        } catch (apiErr) {
          // ignore
        }
      }

      if (!bData) {
        // Check stored session business fallback before setting error
        const stored = getStoredBusiness();
        if (stored && (stored.id === bId || stored.shopId === sId)) {
          bData = stored;
        } else {
          setBusiness(null);
          setBusinessError('Assigned clinic business was not found in the database. Please contact your Super Administrator.');
          setBusinessLoading(false);
          return null;
        }
      }

      if (bData.status === 'inactive') {
        setBusiness(bData);
        setBusinessError('Your assigned clinic business is currently inactive. Access to the administration portal is restricted.');
        setBusinessLoading(false);
        return bData;
      }

      setBusiness(bData);
      setBusinessError(null);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('hp_session_business', JSON.stringify(bData));
      }
      setBusinessLoading(false);
      return bData;
    } catch (err: any) {
      console.warn('Error fetching assigned business:', err);
      const stored = getStoredBusiness();
      if (stored) {
        setBusiness(stored);
        setBusinessError(stored.status === 'inactive' ? 'Assigned clinic business is currently inactive.' : null);
      } else {
        setBusiness(null);
        setBusinessError('Failed to verify assigned business status.');
      }
      setBusinessLoading(false);
      return null;
    }
  };

  const fetchProfile = async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('hp_session_user', JSON.stringify(data));
        }
        await fetchBusiness(data);
        return data;
      } else {
        const stored = getStoredSession();
        if (stored) {
          setProfile(stored);
          await fetchBusiness(stored);
          return stored;
        }
        setProfile(null);
        setBusiness(null);
        return null;
      }
    } catch (error) {
      const stored = getStoredSession();
      if (stored) {
        setProfile(stored);
        await fetchBusiness(stored);
        return stored;
      }
      setProfile(null);
      setBusiness(null);
      return null;
    }
  };

  useEffect(() => {
    // Initial stored session check
    const stored = getStoredSession();
    if (stored) {
      setProfile(stored);
      const storedBiz = getStoredBusiness();
      if (storedBiz) {
        setBusiness(storedBiz);
      } else {
        fetchBusiness(stored);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        const fallbackStored = getStoredSession();
        if (fallbackStored) {
          setProfile(fallbackStored);
          await fetchBusiness(fallbackStored);
        } else {
          setProfile(null);
          setBusiness(null);
          setBusinessError(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setSessionUser = (prof: UserProfile) => {
    setProfile(prof);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hp_session_user', JSON.stringify(prof));
    }
    fetchBusiness(prof);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    } else if (profile) {
      await fetchBusiness(profile);
    }
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user && !profile) return;
    try {
      const { role, uid, ...safeData } = data;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          ...safeData,
          updatedAt: new Date().toISOString(),
        });
        await fetchProfile(user.uid);
      } else if (profile) {
        const updated = { ...profile, ...safeData, updatedAt: new Date().toISOString() };
        setSessionUser(updated);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      // Ignore firebase sign out errors
    } finally {
      setUser(null);
      setProfile(null);
      setBusiness(null);
      setBusinessError(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('hp_session_user');
        sessionStorage.removeItem('hp_session_business');
      }
    }
  };

  const isAuthenticated = !!user || !!profile;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        business,
        businessLoading,
        businessError,
        isAuthenticated,
        loading,
        setSessionUser,
        logout,
        refreshProfile,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
