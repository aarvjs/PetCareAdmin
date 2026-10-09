'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Info, KeyRound, Check, Send } from 'lucide-react';
import { validateEmail, validateIndianMobile } from '@/lib/validation';
import { useAuth } from '@/lib/authContext';

const PERMISSION_OPTIONS = [
  { id: 'p_products', name: 'Products Management', category: 'SHOP' },
  { id: 'p_categories', name: 'Categories Catalog', category: 'SHOP' },
  { id: 'p_orders', name: 'Orders Fulfillment', category: 'SHOP' },
  { id: 'p_inventory', name: 'Stock & Inventory', category: 'SHOP' },
  { id: 'p_offers', name: 'Discounts & Offers', category: 'SHOP' },
  { id: 'p_doctors', name: 'Doctor Roster Management', category: 'CLINIC' },
  { id: 'p_services', name: 'Clinic Services Control', category: 'CLINIC' },
  { id: 'p_appointments', name: 'Appointments Schedule', category: 'CLINIC' },
  { id: 'p_vaccinations', name: 'Vaccination Schedules', category: 'CLINIC' },
  { id: 'p_pets', name: 'Pet Patient Records', category: 'CLINIC' },
  { id: 'p_banners', name: 'App Banners & Sliders', category: 'CONTENT' },
  { id: 'p_reports', name: 'Sales & Financial Reports', category: 'DATA' },
];

export default function CreateAdminPage() {
  const router = useRouter();
  const { user: currentSuperAdmin } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    status: 'active',
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({
    p_products: true,
    p_categories: true,
    p_orders: true,
    p_inventory: true,
    p_doctors: true,
    p_services: true,
    p_appointments: true,
    p_vaccinations: true,
    p_pets: true,
    p_banners: true,
    p_reports: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [createdAdminData, setCreatedAdminData] = useState<{ email: string; fullName: string } | null>(null);

  const togglePermission = (id: string) => {
    setSelectedPermissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = (enable: boolean) => {
    const updated: Record<string, boolean> = {};
    PERMISSION_OPTIONS.forEach((p) => {
      updated[p.id] = enable;
    });
    setSelectedPermissions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setWarningMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }

    if (!formData.email.trim() || !validateEmail(formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (formData.phone && !validateIndianMobile(formData.phone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (e.g. +91 9876543210 or 9876543210).');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Password is required.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const enabledPermissions = Object.keys(selectedPermissions).filter((k) => selectedPermissions[k]);

    setIsLoading(true);

    try {
      const res = await fetch('/api/super-admin/admins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          status: formData.status,
          permissions: enabledPermissions,
          createdByUid: currentSuperAdmin?.uid || 'super_admin',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || 'Failed to create Admin account.');
        setIsLoading(false);
        return;
      }

      setCreatedAdminData({ email: data.user.email, fullName: data.user.fullName });

      if (data.emailSent) {
        setSuccessMessage(`Admin account for ${data.user.fullName} created & invitation email delivered via Resend!`);
      } else {
        setWarningMessage(`Admin account for ${data.user.fullName} created. (Invitation email pending: ${data.emailError || 'Resend error'})`);
      }

      setTimeout(() => {
        router.push('/super-admin/admins');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async () => {
    if (!createdAdminData) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/admins/resend-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createdAdminData.email,
          fullName: createdAdminData.fullName,
          tempPassword: formData.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Invitation email resent to ${createdAdminData.email}!`);
        setWarningMessage('');
      } else {
        setErrorMessage(data.error?.message || 'Failed to resend email invitation.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Resend failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/admins"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#777980] hover:text-[#25242A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admins List
        </Link>
        <span className="text-xs font-bold text-[#7567E8] bg-[#F1EEFF] px-2.5 py-1 rounded-full border border-[#7567E8]/20">
          Super Admin Privilege
        </span>
      </div>

      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#7567E8]" /> Create Admin Account & Credentials
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Super Admin creates login credentials and sets individual module access permissions for the new Admin.
          </p>
        </div>

        <div className="p-3.5 bg-[#EAF8FE] border border-[#8ED8F8]/40 rounded-xl text-xs text-[#0284C7] font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>Server-Side Account Provisioning & Resend Email Invitation active.</span>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {warningMessage && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {warningMessage}
            </div>
            {createdAdminData && (
              <button
                type="button"
                onClick={handleResendInvitation}
                className="px-3 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-bold hover:bg-amber-700 inline-flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Resend Invitation
              </button>
            )}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-[#E6F7F0] border border-[#10B981]/20 rounded-xl text-[#10B981] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section 1: Admin Credentials */}
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] border-b border-[#E8ECF0] pb-2">
              1. Admin Credentials & Profile
            </h2>

            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Vikram Sharma"
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Email Address (Login ID) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin.vikram@petcare.in"
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
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Temporary Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-10 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777980] hover:text-[#25242A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Initial Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
              >
                <option value="active">Active (Immediate Portal Access)</option>
                <option value="inactive">Inactive (Disabled until activated)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Individual Module Access Permissions */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" /> 2. Individual Module Access Permissions
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-[11px] font-bold text-[#7567E8] hover:underline"
                >
                  Select All
                </button>
                <span className="text-[#777980]">•</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-[11px] font-bold text-[#777980] hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#777980] font-medium">
              Check the modules this Admin is authorized to access in the Admin Portal:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERMISSION_OPTIONS.map((p) => {
                const isChecked = !!selectedPermissions[p.id];

                return (
                  <div
                    key={p.id}
                    onClick={() => togglePermission(p.id)}
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
                      <p className="font-bold text-[#25242A] text-xs">{p.name}</p>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7567E8] bg-white px-2 py-0.5 rounded-full border border-[#E8ECF0]">
                      {p.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
            <Link
              href="/super-admin/admins"
              className="px-4 py-2.5 border border-[#E8ECF0] rounded-xl font-bold text-[#777980] hover:bg-[#FAFCFD]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Creating Admin...' : 'Create Admin & Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
