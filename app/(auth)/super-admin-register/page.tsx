'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  PawPrint,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Crown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  KeyRound,
  LockKeyhole
} from 'lucide-react';
import { validateEmail, validateIndianMobile } from '@/lib/validation';

export default function SuperAdminRegisterPage() {
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
  const [isCheckingBootstrap, setIsCheckingBootstrap] = useState(true);
  const [isAlreadyProvisioned, setIsAlreadyProvisioned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check on load if Super Admin is already provisioned
  useEffect(() => {
    async function checkBootstrapState() {
      try {
        const res = await fetch('/api/super-admin/bootstrap');
        const data = await res.json();
        if (data.hasSuperAdmin) {
          setIsAlreadyProvisioned(true);
        }
      } catch (e) {
        console.warn('Could not verify bootstrap status:', e);
      } finally {
        setIsCheckingBootstrap(false);
      }
    }
    checkBootstrapState();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }

    if (!formData.email.trim() || !validateEmail(formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (formData.phone && !validateIndianMobile(formData.phone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Password is required.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/super-admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || 'Failed to complete Super Admin setup.');
        if (res.status === 403) {
          setIsAlreadyProvisioned(true);
        }
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Super Admin account setup successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/super-admin-login');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during registration.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-white flex flex-col justify-between selection:bg-[#7567E8] selection:text-white font-sans relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#7567E8]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#8ED8F8]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <header className="w-full border-b border-white/10 bg-[#0F1117]/80 backdrop-blur-xl z-20 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7567E8] via-[#8ED8F8] to-purple-400 p-0.5 shadow-lg shadow-[#7567E8]/20">
              <div className="w-full h-full bg-[#0F1117] rounded-[14px] flex items-center justify-center text-white">
                <PawPrint className="w-5 h-5 text-[#8ED8F8]" />
              </div>
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight block leading-none">
                Healthy Paws
              </span>
              <span className="text-[10px] font-extrabold text-[#8ED8F8] tracking-widest uppercase">
                Pet Clinic Ecosystem
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8ED8F8] bg-[#7567E8]/20 border border-[#7567E8]/30 px-3.5 py-1.5 rounded-full shadow-inner backdrop-blur-md">
              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Initial Provisioning</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Form Split Layout */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 z-10 max-w-7xl w-full mx-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
          
          {/* Left Side: Form Container */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-[#141824]/90 relative">
            <div className="max-w-lg w-full mx-auto space-y-6">

              {isCheckingBootstrap ? (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#7567E8]/20 border border-[#7567E8]/40 flex items-center justify-center mx-auto text-[#8ED8F8]">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <p className="text-xs text-slate-300 font-semibold">Verifying Super Admin provision state...</p>
                </div>
              ) : isAlreadyProvisioned ? (
                <div className="text-center space-y-5 py-6">
                  <div className="w-16 h-16 rounded-3xl bg-[#7567E8]/20 border border-[#7567E8]/40 text-[#8ED8F8] flex items-center justify-center mx-auto shadow-xl">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-black text-white">Super Admin Already Provisioned</h1>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                      A Master Super Admin account is already active in this clinic ecosystem. Public setup is permanently locked for security compliance.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href="/super-admin-login"
                      className="w-full py-4 bg-gradient-to-r from-[#7567E8] to-[#5C4BD8] hover:from-[#6354D6] hover:to-[#4F3EC6] text-white font-extrabold text-xs rounded-2xl transition-all shadow-lg shadow-[#7567E8]/25 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Super Admin Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Title Header */}
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7567E8]/10 border border-[#7567E8]/30 text-[#8ED8F8] text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ecosystem Bootstrap Protocol</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                      Master Setup
                    </h1>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      Register the primary Super Admin profile for Healthy Paws Pet Clinic.
                    </p>
                  </div>

                  {/* Feedback Alerts */}
                  {errorMessage && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-xs font-semibold flex items-start gap-3 animate-in fade-in duration-200">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                      <span className="leading-snug">{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-start gap-3 animate-in fade-in duration-200">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                      <span className="leading-snug">{successMessage}</span>
                    </div>
                  )}

                  {/* Setup Form */}
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Full Name *
                      </label>
                      <div className="relative group">
                        <User className="w-4 h-4 text-slate-400 group-focus-within:text-[#8ED8F8] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                        <input
                          type="text"
                          name="fullName"
                          required
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Dr. Admin Name"
                          className="w-full bg-white/5 border border-white/10 focus:border-[#7567E8] focus:bg-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white font-medium outline-none transition-all placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                          Super Admin Email *
                        </label>
                        <div className="relative group">
                          <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-[#8ED8F8] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                          <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="superadmin@healthypaws.in"
                            className="w-full bg-white/5 border border-white/10 focus:border-[#7567E8] focus:bg-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white font-medium outline-none transition-all placeholder:text-slate-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                          Mobile Number
                        </label>
                        <div className="relative group">
                          <Phone className="w-4 h-4 text-slate-400 group-focus-within:text-[#8ED8F8] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+91 98765 43210"
                            className="w-full bg-white/5 border border-white/10 focus:border-[#7567E8] focus:bg-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white font-medium outline-none transition-all placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                          Master Password *
                        </label>
                        <div className="relative group">
                          <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#8ED8F8] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••••••"
                            className="w-full bg-white/5 border border-white/10 focus:border-[#7567E8] focus:bg-white/10 rounded-2xl pl-11 pr-11 py-3 text-xs text-white font-medium outline-none transition-all placeholder:text-slate-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                          Confirm Password *
                        </label>
                        <div className="relative group">
                          <LockKeyhole className="w-4 h-4 text-slate-400 group-focus-within:text-[#8ED8F8] absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="••••••••••••"
                            className="w-full bg-white/5 border border-white/10 focus:border-[#7567E8] focus:bg-white/10 rounded-2xl pl-11 pr-11 py-3 text-xs text-white font-medium outline-none transition-all placeholder:text-slate-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 bg-gradient-to-r from-[#7567E8] to-[#5C4BD8] hover:from-[#6354D6] hover:to-[#4F3EC6] text-white font-extrabold text-xs rounded-2xl transition-all shadow-lg shadow-[#7567E8]/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Provisioning Super Admin...</span>
                        </div>
                      ) : (
                        <>
                          <span>Complete Master Setup</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Links */}
                  <div className="pt-4 border-t border-white/10 text-center text-xs text-slate-400 font-medium">
                    Already initialized?{' '}
                    <Link href="/super-admin-login" className="font-bold text-[#8ED8F8] hover:underline">
                      Sign In Here
                    </Link>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* Right Side: Hero Visual Panel */}
          <div className="lg:col-span-5 hidden lg:relative lg:flex flex-col justify-between p-10 min-h-[560px] bg-gradient-to-br from-[#121626] to-[#0A0D14] overflow-hidden">
            {/* Background AI Image */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/super_admin_register_hero.jpg"
                alt="Super Admin Initial Setup Visual"
                fill
                className="object-cover opacity-40 mix-blend-luminosity hover:scale-105 transition-transform duration-700"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-[#0F1117]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#141824] via-transparent to-transparent" />
            </div>

            {/* Top Pill */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white font-semibold">
                <Shield className="w-4 h-4 text-[#8ED8F8]" />
                <span>Zero Trust Security</span>
              </div>
              <div className="flex items-center gap-2 bg-[#7567E8]/20 border border-[#7567E8]/40 px-3 py-1 rounded-full text-[11px] font-bold text-[#8ED8F8]">
                <KeyRound className="w-3.5 h-3.5" />
                <span>AES-256 Vault</span>
              </div>
            </div>

            {/* Middle Feature Cards */}
            <div className="relative z-10 space-y-4 my-auto">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-3xl p-6 shadow-2xl space-y-2">
                <h3 className="text-sm font-black text-white">Full Ecosystem Authority</h3>
                <p className="text-xs text-slate-300 font-medium">
                  Super Admin accounts possess root access over all admins, doctors, appointment workflows, and system audit logs.
                </p>
              </div>
            </div>

            {/* Bottom Quote / Branding */}
            <div className="relative z-10 text-xs text-slate-400 font-medium flex items-center justify-between border-t border-white/10 pt-4">
              <span>Healthy Paws Pet Clinic</span>
              <span className="text-white/60">Master Bootstrap</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-[#0F1117]/80 backdrop-blur-md py-4 text-center text-xs text-slate-500 font-medium z-20">
        © 2026 Healthy Paws Pet Clinic • Initial Provisioning Protocol
      </footer>
    </div>
  );
}
