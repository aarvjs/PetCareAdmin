'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { SuperAdminSidebar } from '@/components/super-admin/SuperAdminSidebar';
import { SuperAdminHeader } from '@/components/super-admin/SuperAdminHeader';
import { PawPrint, ShieldAlert, Loader2 } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !profile || profile.role !== 'super_admin') {
        router.replace('/super-admin-login');
      } else if (profile.status === 'inactive' || profile.status === 'suspended') {
        router.replace('/super-admin-login?error=account_deactivated');
      }
    }
  }, [isAuthenticated, profile, loading, router]);

  // Determine current section title based on pathname
  const getTitle = () => {
    if (pathname.includes('/admins')) return 'Admin Management';
    if (pathname.includes('/doctors')) return 'Doctor Management';
    if (pathname.includes('/users')) return 'All User Directory';
    if (pathname.includes('/permissions')) return 'Permission Matrix';
    if (pathname.includes('/activity-logs')) return 'Activity Audit Logs';
    if (pathname.includes('/security')) return 'Security Overview';
    if (pathname.includes('/reports')) return 'System Reports';
    if (pathname.includes('/settings')) return 'Super Admin Settings';
    return 'Dashboard Overview';
  };

  // Loading state while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFCFD] flex items-center justify-center p-4">
        <div className="bg-white border border-[#E8ECF0] rounded-3xl p-8 max-w-sm w-full text-center shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto border border-[#7567E8]/20">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#25242A]">Verifying Security Credentials</h2>
            <p className="text-xs text-[#777980] font-medium mt-1">Healthy Paws Central Control Center</p>
          </div>
          <div className="w-full bg-[#E8ECF0] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#7567E8] h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Access Denied / Redirecting state if unauthenticated or not super_admin
  if (!isAuthenticated || !profile || profile.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-[#FAFCFD] flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-3xl p-8 max-w-sm w-full text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#25242A]">Access Denied</h2>
            <p className="text-xs text-[#777980] font-medium mt-1">
              You must be logged in as an authorized Super Admin to access this portal. Redirecting to login...
            </p>
          </div>
          <button
            onClick={() => router.replace('/super-admin-login')}
            className="w-full py-2.5 bg-[#7567E8] text-white font-bold text-xs rounded-xl hover:bg-[#6354D6] transition-colors"
          >
            Go to Super Admin Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFCFD] text-[#25242A] flex font-sans">
      <SuperAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        <SuperAdminHeader onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} title={getTitle()} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
