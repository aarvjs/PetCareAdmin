'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Copy,
  Check,
  Users,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Edit,
  ExternalLink,
  KeyRound,
  X,
} from 'lucide-react';
import { UserProfile, useAuth } from '@/lib/authContext';
import { UserStatusBadge } from '@/components/super-admin/UserStatusBadge';

interface BusinessDetail {
  id: string;
  shopId: string;
  name: string;
  businessType: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logoUrl?: string;
  status: 'active' | 'inactive';
  adminCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const businessId = resolvedParams.id;
  const { user: currentSuperAdmin } = useAuth();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Module Edit Modal for Admin
  const [editingAdmin, setEditingAdmin] = useState<UserProfile | null>(null);
  const [editAdminModules, setEditAdminModules] = useState<{
    ecommerce: boolean;
    clinic: boolean;
  }>({ ecommerce: true, clinic: true });
  const [isSavingModules, setIsSavingModules] = useState(false);
  const [moduleModalError, setModuleModalError] = useState('');

  const fetchBusinessData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/super-admin/businesses/${businessId}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.business) {
        setErrorMessage(data.error || 'Failed to load business details.');
        setIsLoading(false);
        return;
      }

      setBusiness(data.business);
      setAdmins(data.admins || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error fetching business data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessData();
  }, [businessId]);

  const handleCopyShopId = () => {
    if (!business) return;
    navigator.clipboard.writeText(business.shopId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const openEditModulesModal = (admin: UserProfile) => {
    setEditingAdmin(admin);
    setModuleModalError('');
    const currentMods = admin.modules || [];
    setEditAdminModules({
      ecommerce:
        currentMods.includes('ecommerce') ||
        (admin.permissions || []).includes('products') ||
        (admin.permissions || []).includes('p_products') ||
        currentMods.length === 0,
      clinic:
        currentMods.includes('clinic') ||
        (admin.permissions || []).includes('doctors') ||
        (admin.permissions || []).includes('p_doctors') ||
        currentMods.length === 0,
    });
  };

  const handleSaveAdminModules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setModuleModalError('');

    const newModules: ('ecommerce' | 'clinic')[] = [];
    if (editAdminModules.ecommerce) newModules.push('ecommerce');
    if (editAdminModules.clinic) newModules.push('clinic');

    if (newModules.length === 0) {
      setModuleModalError('Please select at least one module (E-commerce or Clinic / Doctor).');
      return;
    }

    setIsSavingModules(true);

    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: editingAdmin.uid,
          modules: newModules,
          createdByUid: currentSuperAdmin?.uid || 'super_admin',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setModuleModalError(data.error || 'Failed to update modules.');
        setIsSavingModules(false);
        return;
      }

      setSuccessMessage(`Permissions updated for ${editingAdmin.fullName}!`);
      setEditingAdmin(null);
      await fetchBusinessData();
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err: any) {
      setModuleModalError(err.message || 'Network error saving modules.');
    } finally {
      setIsSavingModules(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-16 text-center text-xs text-[#777980] font-semibold flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#7567E8]" /> Loading Clinic Profile & Admins...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-base font-extrabold text-[#25242A]">Business Not Found</h2>
        <p className="text-xs text-[#777980]">{errorMessage || 'The requested business record does not exist.'}</p>
        <Link
          href="/super-admin/businesses"
          className="text-xs font-bold text-[#7567E8] hover:underline inline-block mt-2"
        >
          Return to Businesses Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/businesses"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#777980] hover:text-[#25242A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Businesses
        </Link>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border ${
            business.status === 'active'
              ? 'bg-[#E6F7F0] text-[#10B981] border-[#10B981]/20'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          {business.status === 'active' ? 'Active Clinic' : 'Inactive Clinic'}
        </span>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-[#E6F7F0] border border-[#10B981]/20 rounded-xl text-[#10B981] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMessage}
        </div>
      )}

      {/* Main Business Profile Card */}
      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8ECF0]">
          <div className="flex items-center gap-4">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-16 h-16 rounded-2xl object-cover border border-[#E8ECF0]"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#F1EEFF] text-[#7567E8] font-black text-xl flex items-center justify-center border border-[#7567E8]/20 shadow-xs">
                {(business.name || 'Clinic').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
                {business.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-bold text-[#7567E8] bg-[#F1EEFF] px-2.5 py-0.5 rounded-md">
                  {business.businessType || 'Pet Clinic'}
                </span>
                <span className="text-xs text-[#777980]">•</span>
                <span className="text-xs text-[#777980] font-medium">
                  Registered: {new Date(business.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Prominent Shop ID Card */}
          <div className="p-3.5 bg-gradient-to-br from-[#F8FAFC] to-[#F1EEFF]/40 border border-[#7567E8]/20 rounded-2xl flex items-center justify-between gap-4 shrink-0">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#7567E8] block">
                Unique Permanent Shop ID
              </span>
              <span className="font-mono font-black text-lg text-[#25242A] tracking-wider">
                {business.shopId}
              </span>
            </div>

            <button
              onClick={handleCopyShopId}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isCopied
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'bg-white border border-[#CBD5E1] text-[#25242A] hover:bg-[#7567E8] hover:text-white hover:border-[#7567E8]'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Shop ID
                </>
              )}
            </button>
          </div>
        </div>

        {/* Business Contact & Address Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-[#25242A]">
          <div className="p-4 bg-[#FAFCFD] border border-[#E8ECF0] rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#777980] font-bold block flex items-center gap-1">
              <Mail className="w-3 h-3 text-[#7567E8]" /> Clinic Email
            </span>
            <p className="truncate font-bold">{business.email}</p>
          </div>

          <div className="p-4 bg-[#FAFCFD] border border-[#E8ECF0] rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#777980] font-bold block flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#7567E8]" /> Phone Number
            </span>
            <p className="font-bold">{business.phone}</p>
          </div>

          <div className="p-4 bg-[#FAFCFD] border border-[#E8ECF0] rounded-xl space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#777980] font-bold block flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#7567E8]" /> Location
            </span>
            <p className="truncate font-bold">
              {[business.address, business.city, business.state, business.country].filter(Boolean).join(', ') || 'India'}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- ASSIGNED ADMINS SECTION ---------------- */}
      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8ECF0]">
          <div>
            <h2 className="text-base font-extrabold text-[#25242A] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#7567E8]" /> Assigned Administrators
            </h2>
            <p className="text-xs text-[#777980] font-medium mt-0.5">
              Administrators authorized to supervise this clinic&apos;s E-commerce store and Doctor clinic operations.
            </p>
          </div>

          <Link
            href={`/super-admin/admins/create?businessId=${business.id}&shopId=${business.shopId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7567E8] hover:bg-[#6354D6] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Assign New Admin
          </Link>
        </div>

        {admins.length === 0 ? (
          <div className="p-8 border border-dashed border-[#CBD5E1] rounded-2xl text-center space-y-3 bg-[#FAFCFD]">
            <Users className="w-8 h-8 text-[#777980] mx-auto opacity-60" />
            <h3 className="text-sm font-extrabold text-[#25242A]">No Admins Assigned Yet</h3>
            <p className="text-xs text-[#777980] max-w-md mx-auto">
              This clinic does not have any assigned administrators yet. Assign an Admin to activate management of products, orders, doctors, or appointments.
            </p>
            <Link
              href={`/super-admin/admins/create?businessId=${business.id}&shopId=${business.shopId}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7567E8] text-white rounded-xl text-xs font-bold hover:bg-[#6354D6] mt-2"
            >
              <Plus className="w-4 h-4" /> Assign First Admin
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF0] text-[#777980] font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Admin Name</th>
                  <th className="pb-3 px-3">Contact</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Assigned Module Permissions</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#25242A]">
                {admins.map((adm) => {
                  const mods = adm.modules || [];
                  const hasEcom = mods.length > 0
                    ? mods.includes('ecommerce')
                    : (adm.permissions || []).includes('products') || (adm.permissions || []).includes('p_products');
                  const hasClinic = mods.length > 0
                    ? mods.includes('clinic')
                    : (adm.permissions || []).includes('doctors') || (adm.permissions || []).includes('p_doctors');

                  return (
                    <tr key={adm.uid} className="hover:bg-[#FAFCFD] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#F1EEFF] text-[#7567E8] font-bold flex items-center justify-center text-xs">
                            {(adm.fullName || adm.email || 'Admin').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-xs block leading-tight">{adm.fullName || adm.email || 'Admin'}</span>
                            <span className="text-[10px] font-mono text-[#777980]">{(adm.uid || '').slice(0, 10)}...</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="block font-semibold">{adm.email}</span>
                        {adm.phone && <span className="text-[11px] text-[#777980]">{adm.phone}</span>}
                      </td>

                      <td className="py-3.5 px-3">
                        <UserStatusBadge status={adm.status || 'active'} />
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {hasEcom && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-[#E6F7F0] text-[#059669] border border-[#10B981]/20">
                              <ShoppingBag className="w-3 h-3" /> E-commerce
                            </span>
                          )}
                          {hasClinic && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-[#EAF8FE] text-[#0284C7] border border-[#8ED8F8]/40">
                              <Stethoscope className="w-3 h-3" /> Clinic / Doctor
                            </span>
                          )}
                          {!hasEcom && !hasClinic && (
                            <span className="text-[10px] text-red-500 font-bold">No modules assigned</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModulesModal(adm)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E8ECF0] hover:border-[#7567E8] bg-white hover:bg-[#F1EEFF] text-[#7567E8] text-[11px] font-bold flex items-center gap-1 transition-all"
                          >
                            <KeyRound className="w-3 h-3" /> Edit Modules
                          </button>

                          <Link
                            href={`/super-admin/admins/${adm.uid}`}
                            className="p-1.5 rounded-lg text-[#777980] hover:text-[#25242A] hover:bg-slate-100"
                            title="Full Admin Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- EDIT ADMIN MODULES MODAL ---------------- */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E8ECF0] shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#7567E8]" /> Assign Admin Modules
                </h3>
                <p className="text-xs text-[#777980] font-medium mt-0.5">
                  Admin: {editingAdmin.fullName} ({editingAdmin.email})
                </p>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-[#777980]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {moduleModalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {moduleModalError}
              </div>
            )}

            <form onSubmit={handleSaveAdminModules} className="space-y-4 text-xs">
              <p className="text-xs text-[#777980] font-medium">
                Select one or both top-level modules authorized for this Admin account:
              </p>

              {/* Module Option 1: E-commerce */}
              <div
                onClick={() =>
                  setEditAdminModules((prev) => ({ ...prev, ecommerce: !prev.ecommerce }))
                }
                className={`p-3.5 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  editAdminModules.ecommerce
                    ? 'bg-[#F1EEFF]/60 border-[#7567E8] shadow-xs'
                    : 'bg-[#FAFCFD] border-[#E8ECF0] opacity-75 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    editAdminModules.ecommerce
                      ? 'bg-[#7567E8] text-white'
                      : 'bg-white border border-[#CBD5E1]'
                  }`}
                >
                  {editAdminModules.ecommerce && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-[#25242A] text-xs flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#7567E8]" /> E-commerce Module
                  </h4>
                  <p className="text-[11px] text-[#777980] mt-0.5 leading-relaxed">
                    Grants access to Products, Categories, Orders fulfillment, Stock & Inventory, and Discounts/Offers.
                  </p>
                </div>
              </div>

              {/* Module Option 2: Clinic / Doctor */}
              <div
                onClick={() =>
                  setEditAdminModules((prev) => ({ ...prev, clinic: !prev.clinic }))
                }
                className={`p-3.5 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                  editAdminModules.clinic
                    ? 'bg-[#EAF8FE]/60 border-[#0284C7] shadow-xs'
                    : 'bg-[#FAFCFD] border-[#E8ECF0] opacity-75 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    editAdminModules.clinic
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-white border border-[#CBD5E1]'
                  }`}
                >
                  {editAdminModules.clinic && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-[#25242A] text-xs flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-[#0284C7]" /> Clinic / Doctor Module
                  </h4>
                  <p className="text-[11px] text-[#777980] mt-0.5 leading-relaxed">
                    Grants access to Doctor rosters, Patient appointments, Pet medical history, and Clinic services.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 border border-[#E8ECF0] rounded-xl font-bold text-[#777980] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingModules}
                  className="px-5 py-2 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingModules ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Module Permissions'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
