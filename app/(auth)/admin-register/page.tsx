'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateEmail, validateIndianMobile, validatePassword } from '@/lib/validation';
import { User, Mail, Phone, Lock, Eye, EyeOff, PawPrint, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Mobile number is required.';
    } else if (!validateIndianMobile(formData.phone)) {
      newErrors.phone = 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 9876543210).';
    }

    const pwdVal = validatePassword(formData.password);
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (!pwdVal.isValid) {
      newErrors.password = pwdVal.message || 'Password must be at least 6 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create account in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim().toLowerCase(),
        formData.password
      );

      const uid = userCredential.user.uid;

      // 2. Save profile in Firestore users/{uid} with role: 'admin'
      await setDoc(doc(db, 'users', uid), {
        uid: uid,
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: 'admin',
        photoURL: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSuccessMessage('Admin account registered successfully in Firebase! Redirecting to login...');
      setTimeout(() => {
        router.push('/admin-login');
      }, 1500);
    } catch (err: any) {
      console.error('Firebase Admin registration error:', err);
      let errorMsg = 'Failed to create admin account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'This email address is already registered in Firebase.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'The provided email address is invalid.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'The password is too weak. Please use a stronger password.';
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
        {/* LEFT SIDE: Brand & Visual Panel */}
        <div className="lg:col-span-5 relative bg-gradient-to-br from-[#7567E8] to-[#72CFF2] p-8 sm:p-10 text-white flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

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
                Administrator Onboarding
              </span>
            </div>
          </div>

          {/* Center Image Container */}
          <div className="relative z-10 my-6">
            <div className="aspect-4/3 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop"
                alt="Pet Care Platform"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-xl font-extrabold leading-tight">
                  Join the PetCare Platform
                </h2>
                <p className="text-xs text-white/90 font-medium mt-1">
                  Create your administrator account to manage store & clinic operations.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-2 text-xs font-semibold text-white/90">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#DFF7EE]" />
              <span>Multi-User Role Access & Permission Controls</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Registration Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
          <div className="max-w-md w-full mx-auto space-y-6 my-auto">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F1EEFF] text-[#7567E8] rounded-full text-xs font-extrabold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin Registration
              </div>
              <h1 className="text-3xl font-extrabold text-[#25242A] tracking-tight">Create Admin Account</h1>
              <p className="text-xs text-[#737780] font-medium mt-1">
                Fill in your details to register as a system administrator.
              </p>
            </div>

            {successMessage ? (
              <div className="p-4 bg-[#DFF7EE] border border-[#b5f0d8] rounded-2xl flex items-center gap-3 text-[#35B779] text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {authError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-600 text-xs font-semibold animate-in fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}
                <Input
                  label="Full Name"
                  name="fullName"
                  placeholder="e.g. Arvin Sharma"
                  value={formData.fullName}
                  onChange={handleChange}
                  error={errors.fullName}
                  icon={<User className="w-4 h-4" />}
                />

                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="admin@petcare.in"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  icon={<Mail className="w-4 h-4" />}
                />

                <Input
                  label="Indian Mobile Number"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  error={errors.phone}
                  icon={<Phone className="w-4 h-4" />}
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
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirm Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    icon={<Lock className="w-4 h-4" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-8.5 text-[#737780] hover:text-[#25242A] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="lg">
                  Create Admin Account
                </Button>
              </form>
            )}

            <div className="pt-4 border-t border-[#E8ECF0] text-center text-xs text-[#737780] font-medium">
              Already have an account?{' '}
              <Link href="/admin-login" className="font-bold text-[#7567E8] hover:underline">
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
