'use client';

import React from 'react';
import Link from 'next/link';
import { PawPrint, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#FAF9F6] text-[#25242A] flex flex-col justify-between selection:bg-[#EAF8FE] selection:text-[#7567E8] relative overflow-x-hidden font-sans">
      {/* Background Soft Organic SVG Accents */}
      <svg
        className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] text-[#EAF8FE] opacity-70 pointer-events-none transform translate-x-1/4 -translate-y-1/4"
        viewBox="0 0 600 600"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M450,100 C530,180 570,300 510,410 C450,520 290,570 180,510 C70,450 30,290 90,170 C150,50 370,20 450,100 Z" />
      </svg>
      <svg
        className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] text-[#F1EEFF] opacity-60 pointer-events-none transform -translate-x-1/4 translate-y-1/4"
        viewBox="0 0 600 600"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M380,80 C480,140 540,270 500,390 C460,510 320,580 200,530 C80,480 20,330 60,200 C100,70 280,20 380,80 Z" />
      </svg>

      {/* MINIMAL COMPACT HEADER */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-[#E8ECF0] shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Left */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EAF8FE] border border-[#72CFF2]/40 text-[#7567E8] flex items-center justify-center shadow-xs">
              <PawPrint className="w-4 h-4 text-[#7567E8]" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-extrabold text-[#25242A] tracking-tight block leading-none">
                Healthy Paws
              </span>
              <span className="text-[10px] font-semibold text-[#737780] tracking-wider uppercase">
                Pet Clinic
              </span>
            </div>
          </div>

          {/* Support Right */}
          <div className="text-xs font-medium text-[#737780] flex items-center gap-2">
            <span className="hidden sm:inline">Need help?</span>
            <button
              type="button"
              onClick={() => alert('For technical support, contact IT Helpdesk at support@healthypaws.in')}
              className="text-[#7567E8] font-bold hover:underline"
            >
              Contact Support
            </button>
          </div>
        </div>
      </header>

      {/* MAIN HERO & ROLE SELECTION */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex flex-col justify-center overflow-y-auto lg:overflow-hidden">
        {/* Compact Hero Title */}
        <div className="text-center max-w-xl mx-auto space-y-1.5 mb-6 sm:mb-8">
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-[#7567E8] bg-[#F1EEFF] px-2.5 py-0.5 rounded-full border border-[#7567E8]/10">
            Internal Staff Portal
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#25242A] tracking-tight leading-tight">
            Welcome to Healthy Paws
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#25242A]/80">
            Choose how you&apos;d like to continue
          </p>
          <p className="text-xs text-[#737780] font-medium max-w-md mx-auto leading-normal">
            Manage your pet care, clinic services and business operations from one secure workspace.
          </p>
        </div>

        {/* TWO COMPACT PREMIUM ROLE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 max-w-4xl mx-auto w-full items-stretch">
          {/* ADMIN CARD */}
          <Link
            href="/admin-login"
            className="group bg-white border border-[#E8ECF0] hover:border-[#7567E8]/40 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-200 ease-out flex flex-col justify-between hover:-translate-y-1"
          >
            {/* Upper Image Portion */}
            <div className="p-3 sm:p-4 bg-[#EAF8FE]/60 pb-0">
              <div className="h-32 sm:h-36 lg:h-40 w-full rounded-xl sm:rounded-2xl overflow-hidden border border-white/60 shadow-xs relative bg-[#EAF8FE]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/admin_portal_hero.jpg"
                  alt="Admin Portal Healthy Paws Pet Store"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                />
              </div>
            </div>

            {/* Content Portion */}
            <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#7567E8] text-[11px] font-extrabold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Business Operations</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#25242A] group-hover:text-[#7567E8] transition-colors">
                  Admin Portal
                </h2>
                <p className="text-xs text-[#737780] font-medium leading-relaxed">
                  Manage products, orders, inventory, customers and clinic operations.
                </p>
              </div>

              {/* Bottom CTA Action Bar */}
              <div className="pt-3 border-t border-[#E8ECF0] flex items-center justify-between text-xs font-bold text-[#7567E8]">
                <span>Continue as Admin</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F1EEFF] group-hover:bg-[#7567E8] group-hover:text-white text-[#7567E8] flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* DOCTOR CARD */}
          <Link
            href="/doctor-login"
            className="group bg-white border border-[#E8ECF0] hover:border-[#72CFF2]/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-200 ease-out flex flex-col justify-between hover:-translate-y-1"
          >
            {/* Upper Image Portion */}
            <div className="p-3 sm:p-4 bg-[#F1EEFF]/60 pb-0">
              <div className="h-32 sm:h-36 lg:h-40 w-full rounded-xl sm:rounded-2xl overflow-hidden border border-white/60 shadow-xs relative bg-[#F1EEFF]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/doctor_portal_hero.jpg"
                  alt="Doctor Portal Healthy Paws Veterinary Examination"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300 ease-out"
                />
              </div>
            </div>

            {/* Content Portion */}
            <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#0284C7] text-[11px] font-extrabold uppercase tracking-wider">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Clinical Healthcare</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#25242A] group-hover:text-[#0284C7] transition-colors">
                  Doctor Portal
                </h2>
                <p className="text-xs text-[#737780] font-medium leading-relaxed">
                  Manage appointments, patients, vaccinations and pet healthcare.
                </p>
              </div>

              {/* Bottom CTA Action Bar */}
              <div className="pt-3 border-t border-[#E8ECF0] flex items-center justify-between text-xs font-bold text-[#0284C7]">
                <span>Continue as Doctor</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EAF8FE] group-hover:bg-[#72CFF2] group-hover:text-[#25242A] text-[#0284C7] flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* SUBTLE TRUST LINE */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-[11px] text-[#94A3B8] font-medium tracking-wide">
            Secure access for Healthy Paws Pet Clinic &nbsp;•&nbsp; Authorized staff only
          </p>
        </div>
      </main>

      {/* SUBTLE FOOTER */}
      <footer className="w-full bg-white/80 border-t border-[#E8ECF0] py-2.5 shrink-0">
        <div className="max-w-6xl mx-auto px-4 text-center text-[10px] sm:text-[11px] text-[#94A3B8] font-medium">
          © 2026 Healthy Paws Pet Clinic. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
