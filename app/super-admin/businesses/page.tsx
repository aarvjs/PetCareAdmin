'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  Users,
  ShieldCheck,
  MapPin,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadCloud,
  X,
  Edit,
  Sparkles,
  ShoppingBag,
  Stethoscope,
} from 'lucide-react';
import { StatCard } from '@/components/super-admin/StatCard';
import { EmptyState } from '@/components/super-admin/EmptyState';
import { validateEmail, validateIndianMobile } from '@/lib/validation';
import { useAuth } from '@/lib/authContext';

export interface BusinessItem {
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
  logoPublicId?: string;
  status: 'active' | 'inactive';
  adminCount: number;
  assignedAdmins?: Array<{
    uid: string;
    fullName: string;
    email: string;
    modules: string[];
    shopId?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function BusinessesManagementPage() {
  const router = useRouter();
  const { user: currentSuperAdmin } = useAuth();

  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<BusinessItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Copy Feedback state
  const [copiedShopId, setCopiedShopId] = useState<string | null>(null);

  // Registration Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [newlyCreatedBiz, setNewlyCreatedBiz] = useState<BusinessItem | null>(null);

  // Edit Modal State
  const [editingBiz, setEditingBiz] = useState<BusinessItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Registration Form
  const [formData, setFormData] = useState({
    name: '',
    businessType: 'Pet Clinic & Hospital',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    logoUrl: '',
    logoPublicId: '',
    status: 'active' as 'active' | 'inactive',
  });

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/businesses');
      const data = await res.json();
      if (data.success && Array.isArray(data.businesses)) {
        setBusinesses(data.businesses);
        setFilteredBusinesses(data.businesses);
      } else {
        setBusinesses([]);
        setFilteredBusinesses([]);
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
      setBusinesses([]);
      setFilteredBusinesses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    let result = [...businesses];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.shopId.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q) ||
          (b.city && b.city.toLowerCase().includes(q)) ||
          (b.businessType && b.businessType.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }

    setFilteredBusinesses(result);
  }, [searchQuery, statusFilter, businesses]);

  const handleCopyShopId = (shopId: string) => {
    navigator.clipboard.writeText(shopId);
    setCopiedShopId(shopId);
    setTimeout(() => {
      setCopiedShopId(null);
    }, 2500);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const data = new FormData();
    data.append('file', file);
    data.append('folder', 'healthy-paws/clinics');

    try {
      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: data,
      });
      const result = await res.json();

      if (result.success && result.url) {
        if (isEditMode && editingBiz) {
          setEditingBiz({
            ...editingBiz,
            logoUrl: result.url,
            logoPublicId: result.publicId || '',
          });
        } else {
          setFormData((prev) => ({
            ...prev,
            logoUrl: result.url,
            logoPublicId: result.publicId || '',
          }));
        }
      } else {
        alert(result.error || 'Failed to upload clinic logo.');
      }
    } catch (err: any) {
      alert(err.message || 'Logo upload failed.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    if (!formData.name.trim()) {
      setRegisterError('Business / Clinic Name is required.');
      return;
    }

    if (!formData.email.trim() || !validateEmail(formData.email)) {
      setRegisterError('Please enter a valid business email address.');
      return;
    }

    if (!formData.phone.trim() || !validateIndianMobile(formData.phone)) {
      setRegisterError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/super-admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdByUid: currentSuperAdmin?.uid || 'super_admin',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setRegisterError(data.error || 'Failed to register business.');
        setIsSubmitting(false);
        return;
      }

      setNewlyCreatedBiz(data.business);
      await fetchBusinesses();
    } catch (err: any) {
      setRegisterError(err.message || 'Network error while registering business.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiz) return;
    setEditError('');

    if (!editingBiz.name.trim()) {
      setEditError('Business Name is required.');
      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch(`/api/super-admin/businesses/${editingBiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingBiz.name,
          businessType: editingBiz.businessType,
          email: editingBiz.email,
          phone: editingBiz.phone,
          address: editingBiz.address || '',
          city: editingBiz.city || '',
          state: editingBiz.state || '',
          country: editingBiz.country || 'India',
          logoUrl: editingBiz.logoUrl || '',
          logoPublicId: editingBiz.logoPublicId || '',
          status: editingBiz.status,
          createdByUid: currentSuperAdmin?.uid || 'super_admin',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setEditError(data.error || 'Failed to update business.');
        setIsUpdating(false);
        return;
      }

      setEditingBiz(null);
      await fetchBusinesses();
    } catch (err: any) {
      setEditError(err.message || 'Network error updating business.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Metrics
  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter((b) => b.status === 'active').length;
  const totalAdminsAssigned = businesses.reduce((acc, b) => acc + (b.adminCount || b.assignedAdmins?.length || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#7567E8]" /> Business & Clinic Registry
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Register clinic businesses, manage permanent Unique Shop IDs, and supervise tenant Administrator assignments.
          </p>
        </div>

        <button
          onClick={() => {
            setNewlyCreatedBiz(null);
            setRegisterError('');
            setFormData({
              name: '',
              businessType: 'Pet Clinic & Hospital',
              email: '',
              phone: '',
              address: '',
              city: '',
              state: '',
              country: 'India',
              logoUrl: '',
              logoPublicId: '',
              status: 'active',
            });
            setIsRegisterModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7567E8] text-white text-xs font-bold shadow-xs hover:bg-[#6354D6] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Register New Business
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Registered Businesses"
          value={totalBusinesses}
          icon={Building2}
          accentColor="purple"
          subtitle="Multi-tenant clinic branches"
        />
        <StatCard
          title="Active Operational Clinics"
          value={activeBusinesses}
          icon={ShieldCheck}
          accentColor="emerald"
          subtitle={`${Math.round((activeBusinesses / (totalBusinesses || 1)) * 100)}% active rate`}
        />
        <StatCard
          title="Assigned Shop Admins"
          value={totalAdminsAssigned}
          icon={Users}
          accentColor="sky"
          subtitle="Governing E-commerce & Clinic modules"
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Clinic Name, Shop ID (e.g. SHOP-8K2A), City, or Email..."
            className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2 rounded-xl text-xs font-semibold text-[#25242A] outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#777980]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#FAFCFD] border border-[#E8ECF0] text-xs font-bold text-[#25242A] rounded-xl px-3 py-2 outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Clinics</option>
            <option value="inactive">Inactive Clinics</option>
          </select>
        </div>
      </div>

      {/* Businesses Grid / Table */}
      {isLoading ? (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center text-xs text-[#777980] font-semibold flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#7567E8]" /> Loading Registered Businesses...
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <EmptyState
          title="No Businesses Registered Yet"
          description={
            searchQuery
              ? `No registered clinics match "${searchQuery}". Try clearing search filters.`
              : 'Register your first clinic or hospital to generate its unique Shop ID and assign its Administrators.'
          }
          actionLabel="Register First Business"
          onAction={() => {
            setNewlyCreatedBiz(null);
            setIsRegisterModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBusinesses.map((biz) => {
            const adminCount = biz.adminCount || biz.assignedAdmins?.length || 0;
            const isCopied = copiedShopId === biz.shopId;

            return (
              <div
                key={biz.id}
                className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {biz.logoUrl ? (
                        <img
                          src={biz.logoUrl}
                          alt={biz.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#E8ECF0]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#F1EEFF] text-[#7567E8] font-black text-sm flex items-center justify-center border border-[#7567E8]/20 shadow-xs">
                          {biz.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-extrabold text-[#25242A] text-sm leading-snug line-clamp-1">
                          {biz.name}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7567E8] bg-[#F1EEFF] px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {biz.businessType || 'Pet Clinic'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        biz.status === 'active'
                          ? 'bg-[#E6F7F0] text-[#10B981] border-[#10B981]/20'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {biz.status}
                    </span>
                  </div>

                  {/* Shop ID Display Pill */}
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#777980] block">
                        Unique Permanent Shop ID
                      </span>
                      <span className="font-mono font-black text-xs text-[#25242A] tracking-wider">
                        {biz.shopId}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyShopId(biz.shopId)}
                      title="Copy Unique Shop ID"
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                        isCopied
                          ? 'bg-[#10B981] text-white'
                          : 'bg-white border border-[#CBD5E1] text-[#25242A] hover:bg-[#F1EEFF] hover:text-[#7567E8]'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 text-[11px] text-[#777980] font-semibold pt-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
                      <span className="truncate">{biz.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
                      <span>{biz.phone}</span>
                    </div>
                    {(biz.city || biz.state) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#7567E8] shrink-0" />
                        <span className="truncate">
                          {[biz.city, biz.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Section */}
                <div className="pt-3 border-t border-[#F1F5F9] space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-[#25242A]">
                    <span className="text-[#777980] font-medium text-[11px] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#7567E8]" /> Assigned Admins:
                    </span>
                    <span className="px-2 py-0.5 bg-[#F1EEFF] text-[#7567E8] rounded-full text-[11px]">
                      {adminCount} {adminCount === 1 ? 'Admin' : 'Admins'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/super-admin/businesses/${biz.id}`}
                      className="px-3 py-2 rounded-xl border border-[#E8ECF0] hover:border-[#7567E8] bg-white text-[#25242A] hover:text-[#7567E8] text-[11px] font-bold text-center transition-all flex items-center justify-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View & Admins
                    </Link>

                    <button
                      onClick={() => {
                        setEditingBiz(biz);
                        setEditError('');
                      }}
                      className="px-3 py-2 rounded-xl bg-[#FAFCFD] hover:bg-[#F1EEFF] text-[#777980] hover:text-[#7567E8] text-[11px] font-bold border border-[#E8ECF0] transition-all flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit Profile
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- REGISTER BUSINESS MODAL ---------------- */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E8ECF0] shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#25242A] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#7567E8]" /> Register New Business & Clinic
                </h2>
                <p className="text-xs text-[#777980] font-medium mt-0.5">
                  The trusted server will automatically generate and allocate a permanent Unique Shop ID.
                </p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-[#777980]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Celebration Display after successful registration */}
            {newlyCreatedBiz ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="p-5 bg-gradient-to-br from-[#F1EEFF] to-[#EAF8FE] border border-[#7567E8]/30 rounded-2xl text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#7567E8] text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#25242A]">
                      Business Registered Successfully!
                    </h3>
                    <p className="text-xs text-[#777980] mt-0.5">
                      Clinic &ldquo;{newlyCreatedBiz.name}&rdquo; has been created and registered.
                    </p>
                  </div>

                  {/* Prominent Shop ID Badge */}
                  <div className="p-3.5 bg-white rounded-xl border border-[#7567E8]/20 shadow-xs max-w-sm mx-auto flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#7567E8] block">
                        Generated Unique Shop ID
                      </span>
                      <span className="font-mono font-black text-base text-[#25242A] tracking-wider">
                        {newlyCreatedBiz.shopId}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyShopId(newlyCreatedBiz.shopId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        copiedShopId === newlyCreatedBiz.shopId
                          ? 'bg-[#10B981] text-white'
                          : 'bg-[#7567E8] text-white hover:bg-[#6354D6]'
                      }`}
                    >
                      {copiedShopId === newlyCreatedBiz.shopId ? (
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

                <div className="p-3.5 bg-[#FFF7ED] border border-[#F59E0B]/30 rounded-xl text-xs text-[#B45309] font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-[#D97706]" />
                  <span>
                    Next Step: Assign Administrators to this business and choose their module access (E-commerce, Clinic, or both).
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setIsRegisterModalOpen(false);
                      setNewlyCreatedBiz(null);
                    }}
                    className="px-4 py-2 border border-[#E8ECF0] rounded-xl text-xs font-bold text-[#777980] hover:bg-slate-50"
                  >
                    Done
                  </button>
                  <Link
                    href={`/super-admin/admins/create?businessId=${newlyCreatedBiz.id}&shopId=${newlyCreatedBiz.shopId}`}
                    className="px-5 py-2 bg-[#7567E8] hover:bg-[#6354D6] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Users className="w-3.5 h-3.5" /> Assign First Admin to Shop
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                {registerError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {registerError}
                  </div>
                )}

                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    Business / Clinic Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Healthy Paws Indiranagar Clinic"
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                      Business Type
                    </label>
                    <select
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                    >
                      <option value="Pet Clinic & Hospital">Pet Clinic & Hospital</option>
                      <option value="Veterinary Healthcare">Veterinary Healthcare</option>
                      <option value="Pet Superstore & Pharmacy">Pet Superstore & Pharmacy</option>
                      <option value="Specialty Care & Grooming">Specialty Care & Grooming</option>
                      <option value="Emergency Vet Center">Emergency Vet Center</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                      Initial Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                    >
                      <option value="active">Active (Immediate operations)</option>
                      <option value="inactive">Inactive (Staging / Pending)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                      Business Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="clinic.indiranagar@healthypaws.in"
                      className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                      Contact Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="100 Feet Road, HAL 2nd Stage"
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Bengaluru"
                      className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3 py-2 rounded-xl font-semibold text-[#25242A] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Karnataka"
                      className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3 py-2 rounded-xl font-semibold text-[#25242A] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="India"
                      className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3 py-2 rounded-xl font-semibold text-[#25242A] outline-hidden"
                    />
                  </div>
                </div>

                {/* Optional Clinic Logo Upload */}
                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    Clinic Logo (Optional Cloudinary Upload)
                  </label>
                  <div className="flex items-center gap-3">
                    {formData.logoUrl ? (
                      <div className="relative">
                        <img
                          src={formData.logoUrl}
                          alt="Logo Preview"
                          className="w-12 h-12 rounded-xl object-cover border border-[#E8ECF0]"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logoUrl: '', logoPublicId: '' })}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-0.5 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer border border-dashed border-[#CBD5E1] hover:border-[#7567E8] rounded-xl px-4 py-2.5 bg-[#FAFCFD] text-[#777980] hover:text-[#7567E8] flex items-center gap-2 transition-all">
                        <UploadCloud className="w-4 h-4" />
                        <span>{isUploadingLogo ? 'Uploading logo...' : 'Upload Clinic Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, false)}
                          disabled={isUploadingLogo}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-4 py-2.5 border border-[#E8ECF0] rounded-xl font-bold text-[#777980] hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingLogo}
                    className="px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Registering Clinic & Allocating Shop ID...
                      </>
                    ) : (
                      'Register Business & Generate Shop ID'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ---------------- EDIT BUSINESS MODAL ---------------- */}
      {editingBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E8ECF0] shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#25242A] flex items-center gap-2">
                  <Edit className="w-5 h-5 text-[#7567E8]" /> Edit Business Profile
                </h2>
                <p className="text-xs text-[#777980] font-medium mt-0.5">
                  Update clinic contact info and operations status. Permanent Shop ID is protected.
                </p>
              </div>
              <button
                onClick={() => setEditingBiz(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-[#777980]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {editError}
                </div>
              )}

              {/* Readonly Shop ID Pill */}
              <div className="p-3 bg-[#F1EEFF]/60 border border-[#7567E8]/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#7567E8] block">
                    Permanent Shop ID (Locked)
                  </span>
                  <span className="font-mono font-black text-sm text-[#25242A]">
                    {editingBiz.shopId}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[#7567E8] bg-white px-2 py-0.5 rounded-full border border-[#7567E8]/20">
                  Immutable
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                  Business / Clinic Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingBiz.name}
                  onChange={(e) => setEditingBiz({ ...editingBiz, name: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    Business Type
                  </label>
                  <input
                    type="text"
                    value={editingBiz.businessType}
                    onChange={(e) => setEditingBiz({ ...editingBiz, businessType: e.target.value })}
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={editingBiz.status}
                    onChange={(e) => setEditingBiz({ ...editingBiz, status: e.target.value as any })}
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editingBiz.email}
                    onChange={(e) => setEditingBiz({ ...editingBiz, email: e.target.value })}
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={editingBiz.phone}
                    onChange={(e) => setEditingBiz({ ...editingBiz, phone: e.target.value })}
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editingBiz.city || ''}
                    onChange={(e) => setEditingBiz({ ...editingBiz, city: e.target.value })}
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3 py-2 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editingBiz.state || ''}
                    onChange={(e) => setEditingBiz({ ...editingBiz, state: e.target.value })}
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3 py-2 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingBiz(null)}
                  className="px-4 py-2.5 border border-[#E8ECF0] rounded-xl font-bold text-[#777980] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
