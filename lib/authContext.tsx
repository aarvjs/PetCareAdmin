'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

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
  modules?: ('ecommerce' | 'clinic')[];
  createdBy?: string;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
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
        return data;
      } else {
        const stored = getStoredSession();
        if (stored) {
          setProfile(stored);
          return stored;
        }
        setProfile(null);
        return null;
      }
    } catch (error) {
      const stored = getStoredSession();
      if (stored) {
        setProfile(stored);
        return stored;
      }
      setProfile(null);
      return null;
    }
  };

  useEffect(() => {
    // Initial stored session check
    const stored = getStoredSession();
    if (stored) {
      setProfile(stored);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        const fallbackStored = getStoredSession();
        if (fallbackStored) {
          setProfile(fallbackStored);
        } else {
          setProfile(null);
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
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
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
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('hp_session_user');
      }
    }
  };

  const isAuthenticated = !!user || !!profile;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
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
