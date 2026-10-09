'use client';

import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Save, CheckCircle2, User, ChevronDown, Check, Info } from 'lucide-react';
import { logActivity } from '@/lib/auditLogger';

interface ModulePermission {
  id: string;
  category: 'SHOP & STORE' | 'CLINICAL CARE' | 'MARKETING & CONTENT' | 'REPORTS & DATA';
  name: string;
  description: string;
  isEnabled: boolean;
}

interface AdminProfileWithPermissions {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleTitle: string;
  permissions: Record<string, boolean>;
}

const DEFAULT_ADMINS: AdminProfileWithPermissions[] = [
  {
    id: 'adm-001',
    name: 'Vikram Sharma',
    email: 'admin.vikram@petcare.in',
    phone: '+91 98765 43210',
    roleTitle: 'Store & Clinic Operations Admin',
    permissions: {
      p_products: true,
      p_categories: true,
      p_orders: true,
      p_inventory: true,
      p_offers: true,
      p_doctors: true,
      p_services: true,
      p_appointments: true,
      p_vaccinations: true,
      p_pets: true,
      p_banners: true,
      p_notifications: true,
      p_reports: true,
      p_customers: true,
    },
  },
  {
    id: 'adm-002',
    name: 'Meera Patel',
    email: 'admin.meera@petcare.in',
    phone: '+91 98765 11223',
    roleTitle: 'Clinic Operations Admin',
    permissions: {
      p_products: false,
      p_categories: false,
      p_orders: false,
      p_inventory: false,
      p_offers: false,
      p_doctors: true,
      p_services: true,
      p_appointments: true,
      p_vaccinations: true,
      p_pets: true,
      p_banners: false,
      p_notifications: true,
      p_reports: true,
      p_customers: true,
    },
  },
];

const MODULE_LIST: Omit<ModulePermission, 'isEnabled'>[] = [
  // Shop & Store
  { id: 'p_products', category: 'SHOP & STORE', name: 'Products Management', description: 'Create, edit & manage pet food & items catalog' },
  { id: 'p_categories', category: 'SHOP & STORE', name: 'Category Taxonomy', description: 'Manage shop categories and product tagging' },
  { id: 'p_orders', category: 'SHOP & STORE', name: 'Order Processing', description: 'View customer orders, fulfillments & status updates' },
  { id: 'p_inventory', category: 'SHOP & STORE', name: 'Stock & Inventory Control', description: 'Warehouse stock tracking and low-stock alerts' },
  { id: 'p_offers', category: 'SHOP & STORE', name: 'Discounts & Coupons', description: 'Create and issue promo discount codes' },

  // Clinical Care
  { id: 'p_doctors', category: 'CLINICAL CARE', name: 'Doctor Roster Management', description: 'Add, edit & activate clinic veterinary profiles' },
  { id: 'p_services', category: 'CLINICAL CARE', name: 'Clinic Services & Fees', description: 'Configure vet consultation packages & pricing' },
  { id: 'p_appointments', category: 'CLINICAL CARE', name: 'Appointments Booking Queue', description: 'View, reschedule & manage vet appointments' },
  { id: 'p_vaccinations', category: 'CLINICAL CARE', name: 'Vaccination Protocols', description: 'Manage pet immunization schedules & reminders' },
  { id: 'p_pets', category: 'CLINICAL CARE', name: 'Pet Patients & Medical Data', description: 'View patient breed records, history & owner profiles' },

  // Marketing & Content
  { id: 'p_banners', category: 'MARKETING & CONTENT', name: 'App Banners & Sliders', description: 'Manage promotional hero banners & highlights' },
  { id: 'p_notifications', category: 'MARKETING & CONTENT', name: 'Push Notifications', description: 'Broadcast client announcements & reminders' },

  // Reports & Data
  { id: 'p_reports', category: 'REPORTS & DATA', name: 'Financial & Sales Analytics', description: 'View revenue charts and download system reports' },
  { id: 'p_customers', category: 'REPORTS & DATA', name: 'Customer Directory', description: 'View registered pet parent contact details' },
];

export default function IndividualAdminPermissionsPage() {
  const [adminList, setAdminList] = useState<AdminProfileWithPermissions[]>(DEFAULT_ADMINS);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('adm-001');

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const currentAdmin = adminList.find((a) => a.id === selectedAdminId) || adminList[0];

  const toggleAdminPermission = (permId: string) => {
    setAdminList((prev) =>
      prev.map((adm) => {
        if (adm.id === selectedAdminId) {
          const updatedPerms = { ...adm.permissions, [permId]: !adm.permissions[permId] };
          return { ...adm, permissions: updatedPerms };
        }
        return adm;
      })
    );
  };

  const selectAllPermissions = (enable: boolean) => {
    setAdminList((prev) =>
      prev.map((adm) => {
        if (adm.id === selectedAdminId) {
          const updatedPerms: Record<string, boolean> = {};
          MODULE_LIST.forEach((m) => {
            updatedPerms[m.id] = enable;
          });
          return { ...adm, permissions: updatedPerms };
        }
        return adm;
      })
    );
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    try {
      await logActivity({
        actorUid: 'super-admin',
        actorName: 'Super Admin',
        actorRole: 'super_admin',
        action: 'UPDATED_INDIVIDUAL_ADMIN_PERMISSIONS',
        targetUid: currentAdmin.id,
        targetName: currentAdmin.name,
        targetRole: 'admin',
        details: `Updated individual permissions configuration for admin ${currentAdmin.name} (${currentAdmin.email})`,
      });
      setSuccessMessage(`Individual permissions for Admin ${currentAdmin.name} saved successfully!`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMessage(''), 3500);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-[#7567E8]" /> Individual Admin Permission Control
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Super Admin can grant or revoke specific module permissions for each individual Admin account.
          </p>
        </div>

        <button
          onClick={handleSavePermissions}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 shrink-0"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-[#E6F7F0] border border-[#10B981]/20 rounded-xl text-[#10B981] text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMessage}
        </div>
      )}

      {/* Admin Account Selector */}
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7567E8] mb-1">
              Select Admin Account to Configure
            </label>
            <div className="relative inline-block w-full sm:w-80">
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="w-full appearance-none bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-10 py-2.5 rounded-xl text-xs font-extrabold text-[#25242A] outline-hidden cursor-pointer"
              >
                {adminList.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.name} ({adm.email})
                  </option>
                ))}
              </select>
              <User className="w-4 h-4 text-[#7567E8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-[#777980] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={() => selectAllPermissions(true)}
              className="px-3 py-1.5 bg-[#F1EEFF] text-[#7567E8] border border-[#7567E8]/20 rounded-xl text-xs font-bold hover:bg-[#e4ddff]"
            >
              Grant All Access
            </button>
            <button
              type="button"
              onClick={() => selectAllPermissions(false)}
              className="px-3 py-1.5 bg-slate-100 text-[#777980] border border-[#E8ECF0] rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Revoke All Access
            </button>
          </div>
        </div>

        {/* Selected Admin Info Badge */}
        <div className="p-3 bg-[#FAFCFD] border border-[#E8ECF0] rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F1EEFF] text-[#7567E8] font-bold text-xs flex items-center justify-center border border-[#7567E8]/20">
              {currentAdmin.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[#25242A]">{currentAdmin.name}</p>
              <p className="text-[11px] text-[#777980]">{currentAdmin.email} • {currentAdmin.phone}</p>
            </div>
          </div>

          <span className="text-[10px] font-bold text-[#7567E8] bg-white px-2.5 py-1 rounded-lg border border-[#E8ECF0]">
            {Object.values(currentAdmin.permissions).filter(Boolean).length} / {MODULE_LIST.length} Modules Allowed
          </span>
        </div>
      </div>

      {/* Permission Checklist Grid */}
      <div className="bg-white border border-[#E8ECF0] rounded-2xl overflow-hidden shadow-xs p-5 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8ECF0]">
          <h2 className="text-xs font-extrabold text-[#25242A] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#7567E8]" /> Individual Module Access Checklist
          </h2>
          <span className="text-[11px] text-[#777980] font-medium">Check modules to grant access to {currentAdmin.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULE_LIST.map((mod) => {
            const isChecked = !!currentAdmin.permissions[mod.id];

            return (
              <div
                key={mod.id}
                onClick={() => toggleAdminPermission(mod.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isChecked
                    ? 'bg-[#F1EEFF]/40 border-[#7567E8]/40 shadow-xs'
                    : 'bg-[#FAFCFD] border-[#E8ECF0] opacity-75 hover:opacity-100 hover:border-[#CBD5E1]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isChecked ? 'bg-[#7567E8] text-white' : 'bg-white border border-[#CBD5E1]'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold text-[#25242A]">{mod.name}</p>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7567E8] bg-white px-2 py-0.5 rounded-full border border-[#E8ECF0]">
                      {mod.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#777980] font-medium mt-1 leading-snug">
                    {mod.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#777980]">
            <Info className="w-4 h-4 text-[#7567E8]" />
            <span>Changes take effect immediately for the selected Admin account upon saving.</span>
          </div>

          <button
            type="button"
            onClick={handleSavePermissions}
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : `Save ${currentAdmin.name}'s Permissions`}
          </button>
        </div>
      </div>
    </div>
  );
}
