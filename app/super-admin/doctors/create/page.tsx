'use client';

import React from 'react';
import Link from 'next/link';
import { Stethoscope, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function CreateDoctorRestrictedPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#777980] hover:text-[#25242A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Doctors List
        </Link>
        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          Super Admin Policy
        </span>
      </div>

      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-extrabold text-[#25242A]">
            Doctor Creation is Delegated to Clinic Admins
          </h1>
          <p className="text-xs text-[#777980] max-w-md mx-auto leading-relaxed">
            In Healthy Paws Pet Clinic multi-business architecture, Super Admins do not directly create Doctor accounts or panel credentials. Doctor accounts are created and managed by authorized Store/Clinic Administrators who hold the <strong className="text-[#25242A]">Clinic / Doctor</strong> module for their assigned clinic.
          </p>
        </div>

        <div className="p-4 bg-[#F8FAFC] border border-[#E8ECF0] rounded-2xl text-left text-xs max-w-md mx-auto space-y-2">
          <p className="font-bold text-[#25242A] flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-[#0284C7]" /> How Doctor Registration Works:
          </p>
          <ul className="list-disc list-inside text-[#777980] space-y-1 text-[11px]">
            <li>Super Admin registers the clinic and generates its permanent Shop ID.</li>
            <li>Super Admin creates an Admin with the <strong>Clinic / Doctor</strong> module assigned.</li>
            <li>The authorized Admin logs into their Admin Portal and registers doctors for that specific clinic.</li>
          </ul>
        </div>

        <div className="pt-3">
          <Link
            href="/super-admin/doctors"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0284C7] text-white text-xs font-bold hover:bg-[#0369A1] transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Doctors Directory
          </Link>
        </div>
      </div>
    </div>
  );
}
