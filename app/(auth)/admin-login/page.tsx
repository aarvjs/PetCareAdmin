'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, Eye, EyeOff, PawPrint, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (authError) {
      setAuthError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const newErrors: Record<string, string> = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Email or Mobile Number is required.';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      let targetEmail = formData.identifier.trim();

      // If user typed a mobile number, resolve their email from Firestore users collection
      if (!targetEmail.includes('@')) {
        const usersQuery = query(collection(db, 'users'), where('phone', '==', targetEmail));
        const querySnap = await getDocs(usersQuery);
        if (!querySnap.empty) {
          const userDocData = querySnap.docs[0].data();
          if (userDocData?.email) {
            targetEmail = userDocData.email;
          }
        }
      }

      // 1. Firebase Auth Sign-in
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail.toLowerCase(), formData.password);
      const uid = userCredential.user.uid;

      // 2. Fetch Firestore profile
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await signOut(auth);
        throw new Error('User profile record not found in database.');
      }

      const userData = userSnap.data();

      // 3. Verify Admin Role
      if (userData?.role !== 'admin') {
        await signOut(auth);
        throw new Error('Access Denied. This account does not have Administrator privileges.');
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      console.error('Firebase Admin Login Error:', err);
      let errorMsg = 'Failed to log in as Administrator.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = 'Invalid email/mobile or password.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Too many failed login attempts. Please try again later.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setAuthError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Outer Split Card */}
      <div className="w-full max-w-5xl bg-white border border-[#E8ECF0] rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT SIDE: Brand & Photo Panel */}
        <div className="lg:col-span-5 relative bg-gradient-to-br from-[#7567E8] to-[#72CFF2] p-8 sm:p-10 text-white flex flex-col justify-between overflow-hidden">
          {/* Decorative Shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
              <PawPrint className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-lg tracking-tight block leading-none">
                PetCare
              </span>
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">
                Admin Management
              </span>
            </div>
          </div>

          {/* Center Image Container */}
          <div className="relative z-10 my-8">
            <div className="aspect-4/3 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop"
                alt="Pet Care Business"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-xl font-extrabold leading-tight">
                  Manage Your PetCare Business
                </h2>
                <p className="text-xs text-white/90 font-medium mt-1">
                  Full control over products, orders, inventory & clinic services.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bullet Points */}
          <div className="relative z-10 space-y-2 text-xs font-semibold text-white/90">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#DFF7EE]" />
              <span>Real-time Order & Revenue Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#DFF7EE]" />
              <span>Complete Clinic & Doctor Management</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Clean Login Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
          <div className="max-w-md w-full mx-auto space-y-8 my-auto">
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F1EEFF] text-[#7567E8] rounded-full text-xs font-extrabold uppercase tracking-wider mb-3">
                <ShieldCheck className="w-3.5 h-3.5" /> Administrator Access
              </div>
              <h1 className="text-3xl font-extrabold text-[#25242A] tracking-tight">Welcome Back</h1>
              <p className="text-xs text-[#737780] font-medium mt-1">
                Sign in to manage your PetCare business.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {authError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-600 text-xs font-semibold animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              <Input
                label="Email or Mobile Number"
                name="identifier"
                placeholder="admin@petcare.in or +91 9876543210"
                value={formData.identifier}
                onChange={handleChange}
                error={errors.identifier}
                icon={<Mail className="w-4 h-4" />}
              />

              <div className="relative">
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  icon={<Lock className="w-4 h-4" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-8.5 text-[#737780] hover:text-[#25242A] transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer text-[#737780]">
                  <input
                    type="checkbox"
                    className="rounded border-[#E8ECF0] text-[#7567E8] focus:ring-[#7567E8]/20"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset instructions sent to your registered administrator email.')}
                  className="text-[#7567E8] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                Login as Administrator
              </Button>
            </form>

            {/* Links */}
            <div className="pt-6 border-t border-[#E8ECF0] text-center text-xs space-y-2 text-[#737780] font-medium">
              <p>
                New administrator?{' '}
                <Link href="/admin-register" className="font-bold text-[#7567E8] hover:underline">
                  Create an account
                </Link>
              </p>
              <p>
                Doctor / Veterinary Practitioner?{' '}
                <Link href="/doctor-login" className="font-bold text-[#0284C7] hover:underline">
                  Doctor Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
