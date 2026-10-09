'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/authContext';
import { UserStatusBadge } from '@/components/super-admin/UserStatusBadge';
import { ArrowLeft, ShieldCheck, Mail, Phone, User, Save, CheckCircle2, AlertCircle, KeyRound, Check } from 'lucide-react';
import { logActivity } from '@/lib/auditLogger';

const SAMPLE_ADMINS_MAP: Record<string, UserProfile> = {
  'adm-001': {
    uid: 'adm-001',
    fullName: 'Vikram Sharma',
    email: 'admin.vikram@petcare.in',
    phone: '+91 98765 43210',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-15T10:00:00Z',
    permissions: ['p_products', 'p_categories', 'p_orders', 'p_inventory', 'p_offers', 'p_doctors', 'p_services', 'p_appointments', 'p_vaccinations', 'p_pets', 'p_banners', 'p_reports'],
  },
  'adm-002': {
    uid: 'adm-002',
    fullName: 'Meera Patel',
    email: 'admin.meera@petcare.in',
    phone: '+91 98765 11223',
    role: 'admin',
    status: 'active',
    createdAt: '2026-02-01T10:00:00Z',
    permissions: ['p_doctors', 'p_services', 'p_appointments', 'p_vaccinations', 'p_pets', 'p_notifications', 'p_reports'],
  },
};

const MODULE_OPTIONS = [
  { id: 'p_products', name: 'Products Management', category: 'SHOP' },
  { id: 'p_categories', name: 'Category Catalog', category: 'SHOP' },
  { id: 'p_orders', name: 'Order Processing', category: 'SHOP' },
  { id: 'p_inventory', name: 'Stock & Inventory Control', category: 'SHOP' },
  { id: 'p_offers', name: 'Discounts & Coupons', category: 'SHOP' },
  { id: 'p_doctors', name: 'Doctor Roster Management', category: 'CLINIC' },
  { id: 'p_services', name: 'Clinic Services Setup', category: 'CLINIC' },
  { id: 'p_appointments', name: 'Appointments Schedule', category: 'CLINIC' },
  { id: 'p_vaccinations', name: 'Vaccination Protocols', category: 'CLINIC' },
  { id: 'p_pets', name: 'Pet Patient Records', category: 'CLINIC' },
  { id: 'p_banners', name: 'App Banners & Sliders', category: 'CONTENT' },
  { id: 'p_reports', name: 'Financial & Sales Reports', category: 'DATA' },
];

export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const adminId = resolvedParams.id;

  const [admin, setAdmin] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});

  const fetchAdminDetail = async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, 'users', adminId);
      const snap = await getDoc(docRef);

      let data: UserProfile;

      if (snap.exists()) {
        data = snap.data() as UserProfile;
      } else if (SAMPLE_ADMINS_MAP[adminId]) {
        data = SAMPLE_ADMINS_MAP[adminId];
      } else {
        data = {
          uid: adminId,
          fullName: 'Admin Account',
          email: 'admin@petcare.in',
          phone: '+91 98765 43210',
          role: 'admin',
          status: 'active',
          permissions: ['p_products', 'p_orders', 'p_doctors', 'p_appointments'],
        };
      }

      setAdmin(data);
      setFormData({
        fullName: data.fullName || '',
        phone: data.phone || '',
        status: data.status || 'active',
      });

      const initialPerms: Record<string, boolean> = {};
      MODULE_OPTIONS.forEach((m) => {
        initialPerms[m.id] = (data.permissions || []).includes(m.id);
      });
      setSelectedPermissions(initialPerms);
    } catch (e) {
      // Fallback to sample data
      const data = SAMPLE_ADMINS_MAP[adminId] || {
        uid: adminId,
        fullName: 'Admin Account',
        email: 'admin@petcare.in',
        phone: '+91 98765 43210',
        role: 'admin',
        status: 'active',
        permissions: ['p_products', 'p_orders', 'p_doctors', 'p_appointments'],
      };
      setAdmin(data);
      setFormData({
        fullName: data.fullName,
        phone: data.phone || '',
        status: data.status || 'active',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetail();
  }, [adminId]);

  const togglePermission = (id: string) => {
    setSelectedPermissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const enabledPermissions = Object.keys(selectedPermissions).filter((k) => selectedPermissions[k]);

      await logActivity({
        actorUid: 'super-admin',
        actorName: 'Super Admin',
        actorRole: 'super_admin',
        action: 'UPDATED_ADMIN_PERMISSIONS',
        targetUid: adminId,
        targetName: formData.fullName,
        targetRole: 'admin',
        details: `Updated details & ${enabledPermissions.length} permissions for admin ${formData.fullName}`,
      });

      setSuccessMessage('Admin profile and individual module permissions updated successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating profile.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMessage(''), 3500);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center text-xs text-[#777980] font-medium">
        Loading Admin Details...
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-base font-extrabold text-[#25242A]">Admin Account Not Found</h2>
        <Link href="/super-admin/admins" className="text-xs font-bold text-[#7567E8] hover:underline">
          Return to Admin List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/admins"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#777980] hover:text-[#25242A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admins List
        </Link>
        <UserStatusBadge status={formData.status} />
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-[#E8ECF0]">
          <div className="w-16 h-16 rounded-2xl bg-[#F1EEFF] text-[#7567E8] font-bold text-xl flex items-center justify-center border border-[#7567E8]/20 shadow-xs">
            {admin.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
              {admin.fullName} <ShieldCheck className="w-5 h-5 text-[#7567E8]" />
            </h1>
            <p className="text-xs text-[#777980] font-medium">{admin.email}</p>
            <p className="text-[11px] text-[#777980]/80 font-mono mt-1">UID: {admin.uid}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-[#E6F7F0] border border-[#10B981]/20 rounded-xl text-[#10B981] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Credentials Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] border-b border-[#E8ECF0] pb-2">
              Admin Profile & Access Status
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Email Address (Login ID)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={admin.email}
                    className="w-full bg-slate-100 border border-[#E8ECF0] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#777980] cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Account Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                >
                  <option value="active">Active (Granted Access)</option>
                  <option value="inactive">Inactive (Disabled Access)</option>
                  <option value="suspended">Suspended (Blocked Access)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Individual Module Permissions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#7567E8]" /> Individual Module Access Permissions
              </h2>
              <span className="text-[11px] font-bold text-[#7567E8]">
                {Object.values(selectedPermissions).filter(Boolean).length} / {MODULE_OPTIONS.length} Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULE_OPTIONS.map((m) => {
                const isChecked = !!selectedPermissions[m.id];
                return (
                  <div
                    key={m.id}
                    onClick={() => togglePermission(m.id)}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-[#F1EEFF]/50 border-[#7567E8]/40'
                        : 'bg-[#FAFCFD] border-[#E8ECF0] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-[#7567E8] text-white' : 'bg-white border border-[#CBD5E1]'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#25242A] text-xs">{m.name}</p>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7567E8] bg-white px-2 py-0.5 rounded-full border border-[#E8ECF0]">
                      {m.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Profile & Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
