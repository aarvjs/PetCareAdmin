'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { DoctorSidebar } from '@/components/layout/DoctorSidebar';
import { DoctorTopbar } from '@/components/layout/DoctorTopbar';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { profile, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !profile || (profile.role !== 'doctor' && profile.role !== 'super_admin')) {
        router.replace('/doctor-login');
      }
    }
  }, [isAuthenticated, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#E8ECF0] shadow-lg flex items-center justify-center text-[#72CFF2] mb-4">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-sm font-bold text-[#25242A]">Authenticating Doctor Workspace</h2>
        <p className="text-xs text-[#737780] mt-1 font-medium">Verifying doctor access credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || !profile || (profile.role !== 'doctor' && profile.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-red-200 shadow-lg flex items-center justify-center text-red-600 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-sm font-bold text-[#25242A]">Access Denied</h2>
        <p className="text-xs text-[#737780] mt-1 font-medium">
          You must be logged in as a Doctor to view this workspace. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DoctorSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <DoctorTopbar onMenuToggle={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
