import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBWM-Kc_cJmH75vEVMBvBaosvbLAI_62lg",
  authDomain: "pet-clinic-47727.firebaseapp.com",
  projectId: "pet-clinic-47727",
  storageBucket: "pet-clinic-47727.firebasestorage.app",
  messagingSenderId: "282276411469",
  appId: "1:282276411469:web:f60fb2a15945f49b238404",
  measurementId: "G-15DGJCLNBK"
};

// Initialize Firebase safely for Next.js SSR / Client
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
