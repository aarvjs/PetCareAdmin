'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShoppingBag,
  Stethoscope,
  Check,
  Send,
  Loader2,
  Copy,
  Plus,
} from 'lucide-react';
import { validateEmail, validateIndianMobile } from '@/lib/validation';
import { useAuth } from '@/lib/authContext';

interface BusinessOption {
  id: string;
  name: string;
  shopId: string;
  businessType: string;
  city?: string;
  status: string;
}

function CreateAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBusinessId = searchParams.get('businessId') || '';
  const initialShopId = searchParams.get('shopId') || '';

  const { user: currentSuperAdmin } = useAuth();

  // Businesses list state
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [selectedBusinessId, setSelectedBusinessId] = useState(initialBusinessId);

  // Form Data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    status: 'active',
  });

  // Exactly Two Module Options: E-commerce and Clinic / Doctor
  const [modules, setModules] = useState<{
    ecommerce: boolean;
    clinic: boolean;
  }>({
    ecommerce: true,
    clinic: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [copiedShopId, setCopiedShopId] = useState(false);
  const [createdAdminData, setCreatedAdminData] = useState<{ email: string; fullName: string } | null>(null);

  // Fetch registered businesses for dropdown
  useEffect(() => {
    async function loadBusinesses() {
      setIsLoadingBusinesses(true);
      try {
        const res = await fetch('/api/super-admin/businesses');
        const data = await res.json();
        if (data.success && Array.isArray(data.businesses)) {
          setBusinesses(data.businesses);

          // If no initial business was selected and list isn't empty, auto-select first active business
          if (!initialBusinessId && data.businesses.length > 0) {
            setSelectedBusinessId(data.businesses[0].id);
          }
        }
      } catch (e) {
        console.warn('Failed to load businesses list:', e);
      } finally {
        setIsLoadingBusinesses(false);
      }
    }
    loadBusinesses();
  }, [initialBusinessId]);

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) || null;
  const currentShopId = selectedBusiness?.shopId || initialShopId;

  const handleCopyShopId = () => {
    if (!currentShopId) return;
    navigator.clipboard.writeText(currentShopId);
    setCopiedShopId(true);
    setTimeout(() => setCopiedShopId(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setWarningMessage('');

    if (!selectedBusinessId) {
      setErrorMessage('Please select a registered business / clinic to assign this Admin to.');
      return;
    }

    if (!formData.fullName.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }

    if (!formData.email.trim() || !validateEmail(formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (formData.phone && !validateIndianMobile(formData.phone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Temporary Password is required.');
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

    // Exactly Two Module Validation: at least one must be selected
    const selectedModulesList: ('ecommerce' | 'clinic')[] = [];
    if (modules.ecommerce) selectedModulesList.push('ecommerce');
    if (modules.clinic) selectedModulesList.push('clinic');

    if (selectedModulesList.length === 0) {
      setErrorMessage('Please select at least one module (E-commerce or Clinic / Doctor) for this Admin.');
      return;
    }

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
          businessId: selectedBusinessId,
          shopId: currentShopId,
          modules: selectedModulesList,
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
        setSuccessMessage(`Admin account for ${data.user.fullName} created & assigned to ${selectedBusiness?.name || currentShopId}!`);
      } else {
        setWarningMessage(`Admin created for ${selectedBusiness?.name || currentShopId}. (Invitation email pending: ${data.emailError || 'Resend error'})`);
      }

      setTimeout(() => {
        router.push(selectedBusinessId ? `/super-admin/businesses/${selectedBusinessId}` : '/super-admin/admins');
      }, 1600);
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
          href={selectedBusinessId ? `/super-admin/businesses/${selectedBusinessId}` : '/super-admin/admins'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#777980] hover:text-[#25242A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Business / Admins
        </Link>
        <span className="text-xs font-bold text-[#7567E8] bg-[#F1EEFF] px-2.5 py-1 rounded-full border border-[#7567E8]/20">
          Super Admin Privilege
        </span>
      </div>

      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#7567E8]" /> Assign Admin to Business & Shop ID
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Associate an Administrator account with a registered clinic business, bind their unique Shop ID, and assign their top-level module permissions.
          </p>
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
          {/* Section 1: Business Selection & Shop ID Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> 1. Select Registered Clinic Business
              </h2>
              <Link
                href="/super-admin/businesses"
                className="text-[11px] font-bold text-[#7567E8] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Register New Business
              </Link>
            </div>

            {isLoadingBusinesses ? (
              <div className="p-3 bg-slate-50 border border-[#E8ECF0] rounded-xl text-center text-[#777980] flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7567E8]" /> Loading registered businesses...
              </div>
            ) : businesses.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-2">
                <p className="font-bold">No registered businesses found in the database.</p>
                <p className="text-[11px]">You must register a business before assigning Admin accounts.</p>
                <Link
                  href="/super-admin/businesses"
                  className="inline-block px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700"
                >
                  Go to Business Registration
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                    Target Business / Clinic *
                  </label>
                  <select
                    value={selectedBusinessId}
                    onChange={(e) => setSelectedBusinessId(e.target.value)}
                    required
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-4 py-2.5 rounded-xl font-bold text-[#25242A] outline-hidden cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Select a Registered Business --
                    </option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.shopId}) - {b.city || b.businessType}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prominently Displayed Selected Shop ID Card */}
                {selectedBusiness && (
                  <div className="p-3.5 bg-gradient-to-r from-[#F1EEFF] to-[#EAF8FE] border border-[#7567E8]/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#7567E8] block">
                        Associated Permanent Shop ID
                      </span>
                      <span className="font-mono font-black text-sm text-[#25242A] tracking-wider">
                        {selectedBusiness.shopId}
                      </span>
                      <span className="text-[10px] text-[#777980] block mt-0.5">
                        Clinic: {selectedBusiness.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyShopId}
                      className="px-2.5 py-1 bg-white border border-[#7567E8]/30 rounded-lg text-[10px] font-bold text-[#7567E8] hover:bg-[#7567E8] hover:text-white transition-all flex items-center gap-1"
                    >
                      {copiedShopId ? (
                        <>
                          <Check className="w-3 h-3 text-[#10B981]" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy ID
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Admin Credentials */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] border-b border-[#E8ECF0] pb-2">
              2. Administrator Account & Credentials
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
                    placeholder="admin.indiranagar@petcare.in"
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
          </div>

          {/* Section 3: EXACTLY TWO MODULE OPTIONS */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-[#E8ECF0] pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7567E8] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> 3. Assign Admin Modules (Choose One or Both)
              </h2>
              <p className="text-[11px] text-[#777980] font-medium mt-1">
                Super Admin assigns module access. Each module enables full supervision of its internal features.
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
                      <ShoppingBag className="w-4 h-4 text-[#7567E8]" /> E-commerce
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
                      <Stethoscope className="w-4 h-4 text-[#0284C7]" /> Clinic / Doctor
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
            <Link
              href={selectedBusinessId ? `/super-admin/businesses/${selectedBusinessId}` : '/super-admin/admins'}
              className="px-4 py-2.5 border border-[#E8ECF0] rounded-xl font-bold text-[#777980] hover:bg-[#FAFCFD]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading || businesses.length === 0}
              className="px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Provisioning & Delivering Invitation...
                </>
              ) : (
                'Create Admin & Assign to Shop'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#777980] font-semibold flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#7567E8]" /> Loading Admin Provisioning Portal...
        </div>
      }
    >
      <CreateAdminContent />
    </Suspense>
  );
}
