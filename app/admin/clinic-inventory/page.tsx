'use client';

import React from 'react';
import { ClinicInventoryManager } from '@/components/clinic/ClinicInventoryManager';
import { useAuth } from '@/lib/authContext';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ShieldAlert, Lock, Loader2 } from 'lucide-react';

export default function AdminClinicInventoryPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="w-8 h-8 text-[#7567E8] animate-spin mb-3" />
        <p className="text-xs text-[#737780] font-semibold">Verifying clinic permissions...</p>
      </div>
    );
  }

  const mods = profile?.modules || [];
  const perms = profile?.permissions || [];
  const hasClinic =
    profile?.role === 'super_admin' ||
    (profile?.role === 'admin' &&
      (mods.includes('clinic') ||
        perms.includes('doctors') ||
        perms.includes('p_doctors') ||
        perms.includes('ALL_ACCESS')));

  if (!hasClinic) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <PageHeader
          title="Medicine & Injection Inventory"
          subtitle="Clinic supplies, vaccine batches, and stock management."
        />
        <Card padding="p-12" className="text-center max-w-2xl mx-auto border-amber-200 bg-amber-50/40">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-[#25242A]">Clinic Module Authorization Required</h3>
          <p className="text-xs text-[#737780] max-w-md mx-auto mt-2 leading-relaxed font-medium">
            Your administrator account is currently authorized for <strong>E-commerce</strong> store operations only.
            Medicine inventory and clinical supplies are restricted to businesses and administrators with the <strong>Clinic</strong> module assigned.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 text-[11px] font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Contact your Super Administrator to enable the Clinic Module.</span>
          </div>
        </Card>
      </div>
    );
  }

  return <ClinicInventoryManager panelType="admin" />;
}
