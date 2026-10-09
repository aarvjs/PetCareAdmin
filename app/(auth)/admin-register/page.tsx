'use client';

import React from 'react';
import Link from 'next/link';
import { PawPrint, ShieldCheck, Lock, ArrowRight } from 'lucide-react';

export default function AdminRegisterPage() {
  return (
    <div className="min-h-screen bg-[#FAFCFD] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-white border border-[#E8ECF0] rounded-3xl p-8 shadow-lg text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto border border-[#7567E8]/20 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F1EEFF] text-[#7567E8] rounded-full text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> Direct Access Only
          </div>
          <h1 className="text-2xl font-extrabold text-[#25242A] tracking-tight">
            Public Registration Disabled
          </h1>
          <p className="text-xs text-[#777980] font-medium leading-relaxed">
            Administrator accounts cannot be self-registered. Admin profiles are created exclusively through the Super Admin Portal.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#EAF8FE] border border-[#8ED8F8]/40 text-left text-xs space-y-1.5">
          <p className="font-bold text-[#0284C7] flex items-center gap-1.5">
            <PawPrint className="w-4 h-4" /> Healthy Paws Security Workflow:
          </p>
          <ul className="list-disc list-inside text-[#737780] space-y-1">
            <li>Super Admin creates and assigns Admin credentials.</li>
            <li>Admins log in using their credentials at `/admin/login`.</li>
          </ul>
        </div>

        <div className="pt-2">
          <Link
            href="/admin-login"
            className="w-full py-3 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>Proceed to Admin Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
