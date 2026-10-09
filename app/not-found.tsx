'use client';

import React from 'react';
import Link from 'next/link';
import { PawPrint, ArrowLeft, Home, Compass } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function NotFoundPage() {
  const { profile } = useAuth();

  const getDashboardLink = () => {
    if (profile?.role === 'super_admin') return '/super-admin';
    if (profile?.role === 'admin') return '/admin/dashboard';
    if (profile?.role === 'doctor') return '/doctor/dashboard';
    return '/super-admin-login';
  };

  return (
    <div className="min-h-screen bg-[#FAFCFD] text-[#25242A] flex flex-col justify-between selection:bg-[#F1EEFF] selection:text-[#7567E8] font-sans">
      {/* Top Header */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-[#E8ECF0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7567E8] to-[#8ED8F8] text-white flex items-center justify-center shadow-xs">
              <PawPrint className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-[#25242A] tracking-tight block leading-none">
                Healthy Paws
              </span>
              <span className="text-[10px] font-extrabold text-[#7567E8] tracking-wider uppercase">
                Pet Clinic
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main 404 Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-white border border-[#E8ECF0] rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
          {/* Subtle Background Paw Watermark */}
          <div className="absolute -right-8 -bottom-8 opacity-5 text-[#7567E8] pointer-events-none">
            <PawPrint className="w-56 h-56" />
          </div>

          <div className="w-16 h-16 rounded-2xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto border border-[#7567E8]/20 shadow-xs">
            <Compass className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-[#EAF8FE] text-[#0284C7] rounded-full text-xs font-extrabold uppercase tracking-wider">
              Error 404
            </span>
            <h1 className="text-3xl font-extrabold text-[#25242A] tracking-tight">
              Page Not Found
            </h1>
            <p className="text-xs text-[#777980] font-semibold leading-relaxed max-w-sm mx-auto">
              The page you're looking for may have moved, been deleted, or no longer exists.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-5 py-2.5 border border-[#E8ECF0] rounded-xl font-bold text-xs text-[#777980] hover:bg-[#FAFCFD] hover:text-[#25242A] transition-all inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Previous Page</span>
            </button>

            <Link
              href={getDashboardLink()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold text-xs rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#E8ECF0] py-3 text-center text-xs text-[#777980] font-medium">
        © 2026 Healthy Paws Pet Clinic • All rights reserved.
      </footer>
    </div>
  );
}
