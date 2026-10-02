'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { DoctorSidebar } from '@/components/layout/DoctorSidebar';
import { DoctorTopbar } from '@/components/layout/DoctorTopbar';
import { Stethoscope, Loader2 } from 'lucide-react';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || profile?.role !== 'doctor') {
        router.replace('/doctor-login');
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !user || profile?.role !== 'doctor') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#E8ECF0] shadow-lg flex items-center justify-center text-[#72CFF2] mb-4">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-sm font-bold text-[#25242A]">Authenticating Doctor Session</h2>
        <p className="text-xs text-[#737780] mt-1 font-medium">Verifying doctor workspace access...</p>
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
