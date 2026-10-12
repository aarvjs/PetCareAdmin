'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminTopbar } from '@/components/layout/AdminTopbar';
import { ShieldAlert, Loader2, Lock, ShoppingBag, Stethoscope, ArrowLeft } from 'lucide-react';

const ECOMMERCE_ROUTES = [
  '/admin/products',
  '/admin/categories',
  '/admin/orders',
  '/admin/customers',
  '/admin/inventory',
  '/admin/offers',
];

const CLINIC_ROUTES = [
  '/admin/doctors',
  '/admin/services',
  '/admin/vaccinations',
  '/admin/appointments',
  '/admin/pets',
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { profile, business, businessLoading, businessError, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
        router.replace('/admin-login');
      }
    }
  }, [isAuthenticated, profile, loading, router]);

  if (loading || (profile?.role === 'admin' && businessLoading)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#E8ECF0] shadow-lg flex items-center justify-center text-[#7567E8] mb-4">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-sm font-bold text-[#25242A]">Verifying Admin Session & Business Identity</h2>
        <p className="text-xs text-[#737780] mt-1 font-medium">Connecting to registered clinic...</p>
      </div>
    );
  }

  if (!isAuthenticated || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-red-200 shadow-lg flex items-center justify-center text-red-600 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-sm font-bold text-[#25242A]">Access Denied</h2>
        <p className="text-xs text-[#737780] mt-1 font-medium">
          You must be logged in as an Administrator to view this portal. Redirecting to login...
        </p>
      </div>
    );
  }

  if (profile.status === 'inactive' || profile.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-amber-200 shadow-lg flex items-center justify-center text-amber-600 mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-sm font-bold text-[#25242A]">Account Deactivated</h2>
        <p className="text-xs text-[#737780] mt-1 font-medium max-w-sm">
          Your administrator account has been deactivated. Please contact your Super Administrator for activation.
        </p>
        <button
          onClick={async () => {
            await logout();
            router.replace('/admin-login');
          }}
          className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-bold text-[#25242A]"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Handle Missing or Inactive Business Association for Admin Accounts
  if (profile.role === 'admin' && (businessError || !business || business.status === 'inactive')) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-[#E8ECF0] rounded-3xl p-8 shadow-xs space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#25242A]">
              {business?.status === 'inactive' ? 'Assigned Business Deactivated' : 'Business Association Required'}
            </h2>
            <p className="text-xs text-[#737780] mt-2 leading-relaxed">
              {businessError || 'Your administrator profile does not have an active registered clinic or business assigned.'}
            </p>
          </div>

          <div className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl text-left space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#737780]">Administrator:</span>
              <span className="font-bold text-[#25242A]">{profile.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#737780]">Login Email:</span>
              <span className="font-medium text-[#25242A]">{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#737780]">Assigned Shop ID:</span>
              <span className="font-mono font-bold text-[#7567E8]">{profile.shopId || 'Not Assigned'}</span>
            </div>
            {business && (
              <div className="flex justify-between">
                <span className="text-[#737780]">Business Status:</span>
                <span className="font-bold text-amber-600 capitalize">{business.status}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={async () => {
                await logout();
                router.replace('/admin-login');
              }}
              className="px-5 py-2.5 bg-[#25242A] text-white hover:bg-black rounded-xl text-xs font-bold transition-colors"
            >
              Log Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Multi-tenant Module Permission Enforcement
  const isSuper = profile.role === 'super_admin';
  const mods = profile.modules || [];
  const perms = profile.permissions || [];

  const hasEcommerce =
    isSuper ||
    mods.includes('ecommerce') ||
    perms.includes('products') ||
    perms.includes('p_products') ||
    perms.includes('ALL_ACCESS');

  const hasClinic =
    isSuper ||
    mods.includes('clinic') ||
    perms.includes('doctors') ||
    perms.includes('p_doctors') ||
    perms.includes('ALL_ACCESS');

  const isEcommerceRoute = ECOMMERCE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );
  const isClinicRoute = CLINIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );

  const isBlockedByEcommerce = isEcommerceRoute && !hasEcommerce;
  const isBlockedByClinic = isClinicRoute && !hasClinic;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar onMenuToggle={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isBlockedByEcommerce ? (
            <div className="bg-white border border-[#E8ECF0] rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-xs space-y-4 animate-in fade-in">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center border border-[#7567E8]/20">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#25242A]">
                  E-commerce Module Access Required
                </h2>
                <p className="text-xs text-[#777980] mt-1.5 leading-relaxed">
                  Your administrator account does not currently have the <strong className="text-[#25242A]">E-commerce</strong> module assigned. Access to product inventory, orders, and shop management is restricted.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 bg-[#7567E8] text-white rounded-xl text-xs font-bold hover:bg-[#6354D6] inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
                </Link>
              </div>
            </div>
          ) : isBlockedByClinic ? (
            <div className="bg-white border border-[#E8ECF0] rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-12 shadow-xs space-y-4 animate-in fade-in">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EAF8FE] text-[#0284C7] flex items-center justify-center border border-[#8ED8F8]/40">
                <Stethoscope className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#25242A]">
                  Clinic / Doctor Module Access Required
                </h2>
                <p className="text-xs text-[#777980] mt-1.5 leading-relaxed">
                  Your administrator account does not currently have the <strong className="text-[#25242A]">Clinic / Doctor</strong> module assigned. Access to doctors, appointments, and medical operations is restricted.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 bg-[#7567E8] text-white rounded-xl text-xs font-bold hover:bg-[#6354D6] inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
