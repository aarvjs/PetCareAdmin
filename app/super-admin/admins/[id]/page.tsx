'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, useAuth } from '@/lib/authContext';
import { UserStatusBadge } from '@/components/super-admin/UserStatusBadge';
import {
  ArrowLeft,
  ShieldCheck,
  Mail,
  Phone,
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShoppingBag,
  Stethoscope,
  Check,
  Copy,
  Loader2,
} from 'lucide-react';
import { logActivity } from '@/lib/auditLogger';

export default function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const adminId = resolvedParams.id;
  const { user: currentSuperAdmin } = useAuth();

  const [admin, setAdmin] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedShopId, setCopiedShopId] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    shopId: '',
    businessId: '',
  });

  // Exactly Two Module Options: E-commerce and Clinic / Doctor
  const [modules, setModules] = useState<{
    ecommerce: boolean;
    clinic: boolean;
  }>({
    ecommerce: true,
    clinic: true,
  });

  const fetchAdminDetail = async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, 'users', adminId);
      const snap = await getDoc(docRef);

      let data: UserProfile;

      if (snap.exists()) {
        data = snap.data() as UserProfile;
      } else {
        data = {
          uid: adminId,
          fullName: 'Admin Account',
          email: 'admin@petcare.in',
          phone: '+91 98765 43210',
          role: 'admin',
          status: 'active',
          shopId: 'SHOP-DEFAULT',
          modules: ['ecommerce', 'clinic'],
        };
      }

      setAdmin(data);
      setFormData({
        fullName: data.fullName || '',
        phone: data.phone || '',
        status: data.status || 'active',
        shopId: data.shopId || '',
        businessId: data.businessId || '',
      });

      const userMods = data.modules || [];
      const hasEcom =
        userMods.includes('ecommerce') ||
        (data.permissions || []).includes('products') ||
        (data.permissions || []).includes('p_products') ||
        userMods.length === 0;
      const hasClinic =
        userMods.includes('clinic') ||
        (data.permissions || []).includes('doctors') ||
        (data.permissions || []).includes('p_doctors') ||
        userMods.length === 0;

      setModules({
        ecommerce: hasEcom,
        clinic: hasClinic,
      });
    } catch (e) {
      // Fallback
      setAdmin({
        uid: adminId,
        fullName: 'Admin Account',
        email: 'admin@petcare.in',
        phone: '+91 98765 43210',
        role: 'admin',
        status: 'active',
        shopId: 'SHOP-DEFAULT',
        modules: ['ecommerce', 'clinic'],
      });
      setFormData({
        fullName: 'Admin Account',
        phone: '+91 98765 43210',
        status: 'active',
        shopId: 'SHOP-DEFAULT',
        businessId: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDetail();
  }, [adminId]);

  const handleCopyShopId = () => {
    if (!formData.shopId) return;
    navigator.clipboard.writeText(formData.shopId);
    setCopiedShopId(true);
    setTimeout(() => setCopiedShopId(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    // Exactly Two Module Validation: at least one module required
    const selectedModulesList: ('ecommerce' | 'clinic')[] = [];
    if (modules.ecommerce) selectedModulesList.push('ecommerce');
    if (modules.clinic) selectedModulesList.push('clinic');

    if (selectedModulesList.length === 0) {
      setErrorMessage('Please select at least one module (E-commerce or Clinic / Doctor) for this Admin.');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: adminId,
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          status: formData.status,
          modules: selectedModulesList,
          createdByUid: currentSuperAdmin?.uid || 'super_admin',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to update Admin account.');
        setIsSaving(false);
        return;
      }

      await logActivity({
        actorUid: currentSuperAdmin?.uid || 'super_admin',
        actorName: 'Super Admin',
        actorRole: 'super_admin',
        action: 'UPDATED_ADMIN_PERMISSIONS',
        targetUid: adminId,
        targetName: formData.fullName,
        targetRole: 'admin',
        details: `Updated profile & module permissions (${selectedModulesList.join(', ')}) for Admin ${formData.fullName}`,
      });

      setSuccessMessage('Admin profile and module permissions updated successfully!');
      await fetchAdminDetail();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating profile.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMessage(''), 3500);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-16 text-center text-xs text-[#777980] font-semibold flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#7567E8]" /> Loading Admin Details...
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8ECF0]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F1EEFF] text-[#7567E8] font-bold text-xl flex items-center justify-center border border-[#7567E8]/20 shadow-xs">
              {admin.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
                {admin.fullName} <ShieldCheck className="w-5 h-5 text-[#7567E8]" />
              </h1>
              <p className="text-xs text-[#777980] font-medium">{admin.email}</p>
              <p className="text-[11px] text-[#777980]/80 font-mono mt-0.5">UID: {admin.uid}</p>
            </div>
          </div>

          {/* Associated Shop ID badge */}
          {formData.shopId && (
            <div className="p-3 bg-gradient-to-br from-[#F8FAFC] to-[#F1EEFF]/50 border border-[#7567E8]/20 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#7567E8] block">
                  Assigned Shop ID
                </span>
                <span className="font-mono font-black text-sm text-[#25242A] tracking-wider">
                  {formData.shopId}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyShopId}
                className="px-2 py-1 rounded-lg text-[10px] font-bold border border-[#CBD5E1] bg-white hover:bg-[#F1EEFF] text-[#25242A] flex items-center gap-1"
              >
                {copiedShopId ? (
                  <>
                    <Check className="w-3 h-3 text-[#10B981]" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
          )}
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

          {/* Section 2: EXACTLY TWO MODULE OPTIONS */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-[#E8ECF0] pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Assigned Modules (Choose One or Both)
              </h2>
              <p className="text-[11px] text-[#777980] font-medium mt-1">
                Toggle module permissions for this Admin. Revoking a module immediately closes access to its respective features.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Module 1: E-commerce */}
              <div
                onClick={() => setModules((prev) => ({ ...prev, ecommerce: !prev.ecommerce }))}
                className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${
                  modules.ecommerce
                    ? 'bg-[#F1EEFF]/70 border-[#7567E8] shadow-xs'
                    : 'bg-[#FAFCFD] border-[#E8ECF0] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      modules.ecommerce ? 'bg-[#7567E8] text-white' : 'bg-white border border-[#CBD5E1]'
                    }`}
                  >
                    {modules.ecommerce && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#25242A] text-sm flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-[#7567E8]" /> E-commerce Module
                    </h3>
                    <p className="text-[11px] text-[#777980] mt-1 leading-relaxed">
                      Grants access to Products, Multiple images, Categories, Pricing & discounts, Inventory, Orders, and Offers.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#7567E8]/10 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[#7567E8] uppercase tracking-wider">Top-Level Module</span>
                  <span className={modules.ecommerce ? 'text-[#7567E8]' : 'text-slate-400'}>
                    {modules.ecommerce ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Module 2: Clinic / Doctor */}
              <div
                onClick={() => setModules((prev) => ({ ...prev, clinic: !prev.clinic }))}
                className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${
                  modules.clinic
                    ? 'bg-[#EAF8FE]/70 border-[#0284C7] shadow-xs'
                    : 'bg-[#FAFCFD] border-[#E8ECF0] opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      modules.clinic ? 'bg-[#0284C7] text-white' : 'bg-white border border-[#CBD5E1]'
                    }`}
                  >
                    {modules.clinic && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#25242A] text-sm flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-[#0284C7]" /> Clinic / Doctor Module
                    </h3>
                    <p className="text-[11px] text-[#777980] mt-1 leading-relaxed">
                      Grants access to Doctor management, Appointments, Pets/patients operations, Medical records, and Services.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#0284C7]/10 flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[#0284C7] uppercase tracking-wider">Top-Level Module</span>
                  <span className={modules.clinic ? 'text-[#0284C7]' : 'text-slate-400'}>
                    {modules.clinic ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Profile & Module Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
