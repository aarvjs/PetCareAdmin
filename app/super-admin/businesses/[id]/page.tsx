'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  Clock,
  UserPlus,
  UserMinus,
  RefreshCw,
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
  assignedAdmins?: any[];
  assignedDoctors?: any[];
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
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Link Existing Admin Modal State
  const [isLinkingAdminModalOpen, setIsLinkingAdminModalOpen] = useState(false);
  const [allSystemAdmins, setAllSystemAdmins] = useState<UserProfile[]>([]);
  const [selectedAdminToLink, setSelectedAdminToLink] = useState('');
  const [linkAdminModules, setLinkAdminModules] = useState<{
    ecommerce: boolean;
    clinic: boolean;
  }>({ ecommerce: true, clinic: true });
  const [isLinkingAdmin, setIsLinkingAdmin] = useState(false);
  const [linkAdminError, setLinkAdminError] = useState('');

  // Unassign Admin Confirmation State
  const [adminToUnassign, setAdminToUnassign] = useState<UserProfile | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  const fetchBusinessData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage('');

    try {
      // 1. Fetch from server API route
      const res = await fetch(`/api/super-admin/businesses/${businessId}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.business) {
        setErrorMessage(data.error || 'Failed to load business details.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const currentBiz: BusinessDetail = data.business;
      setBusiness(currentBiz);

      // Multi-layer admin retrieval:
      let loadedAdmins: UserProfile[] = Array.isArray(data.admins) ? [...data.admins] : [];

      // Layer 1: Check business.assignedAdmins
      if (loadedAdmins.length === 0 && Array.isArray(currentBiz.assignedAdmins) && currentBiz.assignedAdmins.length > 0) {
        loadedAdmins = [...currentBiz.assignedAdmins];
      }

      // Layer 2: Authenticated client-side Firestore query
      // The logged-in Super Admin has read permissions on users
      try {
        const qAdmins = query(collection(db, 'users'), where('role', '==', 'admin'));
        const snap = await getDocs(qAdmins);
        const clientMatchingAdmins: UserProfile[] = [];
        const allAdminsList: UserProfile[] = [];

        snap.forEach((docSnap) => {
          const u = { ...(docSnap.data() as UserProfile), uid: docSnap.id };
          allAdminsList.push(u);
          if (
            u.businessId === businessId ||
            (currentBiz.shopId && u.shopId === currentBiz.shopId)
          ) {
            clientMatchingAdmins.push(u);
          }
        });

        setAllSystemAdmins(allAdminsList);

        if (clientMatchingAdmins.length > 0) {
          const map = new Map<string, UserProfile>();
          loadedAdmins.forEach((a) => {
            const key = a.uid || a.email;
            if (key) map.set(key, a);
          });
          clientMatchingAdmins.forEach((a) => {
            const key = a.uid || a.email;
            if (key) {
              const existing = map.get(key) || {};
              map.set(key, { ...existing, ...a });
            }
          });
          loadedAdmins = Array.from(map.values());

          // Automatically sync all matched admins into business document
          const simplifiedAdmins = loadedAdmins.map((a) => ({
            uid: a.uid || '',
            fullName: a.fullName || (a as any).name || 'Admin',
            email: a.email || '',
            phone: a.phone || '',
            modules: a.modules || ['ecommerce', 'clinic'],
            shopId: currentBiz.shopId || a.shopId || '',
            status: a.status || 'active',
            assignedAt: (a as any).assignedAt || a.createdAt || new Date().toISOString(),
          }));

          updateDoc(doc(db, 'businesses', businessId), {
            assignedAdmins: simplifiedAdmins,
            adminCount: simplifiedAdmins.length,
            updatedAt: new Date().toISOString(),
          }).catch((e) => console.warn('[Auto-sync assignedAdmins error]', e));
        }
      } catch (clientErr) {
        console.warn('[Client Admins Query Fallback Warning]', clientErr);
      }

      setAdmins(loadedAdmins);

      // Layer 3: Doctor retrieval
      let loadedDoctors: UserProfile[] = Array.isArray(data.doctors) ? [...data.doctors] : [];
      if (loadedDoctors.length === 0 && Array.isArray(currentBiz.assignedDoctors) && currentBiz.assignedDoctors.length > 0) {
        loadedDoctors = [...currentBiz.assignedDoctors];
      }

      try {
        const qDocs = query(collection(db, 'users'), where('role', '==', 'doctor'));
        const docSnap = await getDocs(qDocs);
        const clientMatchingDocs: UserProfile[] = [];
        docSnap.forEach((d) => {
          const docData = { ...(d.data() as UserProfile), uid: d.id };
          if (
            docData.businessId === businessId ||
            (currentBiz.shopId && docData.shopId === currentBiz.shopId)
          ) {
            clientMatchingDocs.push(docData);
          }
        });

        if (clientMatchingDocs.length > 0) {
          const map = new Map<string, UserProfile>();
          loadedDoctors.forEach((d) => {
            const key = d.uid || d.email;
            if (key) map.set(key, d);
          });
          clientMatchingDocs.forEach((d) => {
            const key = d.uid || d.email;
            if (key) {
              const existing = map.get(key) || {};
              map.set(key, { ...existing, ...d });
            }
          });
          loadedDoctors = Array.from(map.values());
        }
      } catch (docErr) {
        console.warn('[Client Doctors Query Fallback Warning]', docErr);
      }

      setDoctors(loadedDoctors);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error fetching business data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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

  const handleLinkExistingAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminToLink || !business) return;
    setLinkAdminError('');
    setIsLinkingAdmin(true);

    const chosenAdmin = allSystemAdmins.find((a) => a.uid === selectedAdminToLink);
    if (!chosenAdmin) {
      setLinkAdminError('Selected admin profile not found.');
      setIsLinkingAdmin(false);
      return;
    }

    const selectedMods: ('ecommerce' | 'clinic')[] = [];
    if (linkAdminModules.ecommerce) selectedMods.push('ecommerce');
    if (linkAdminModules.clinic) selectedMods.push('clinic');

    if (selectedMods.length === 0) {
      setLinkAdminError('Please select at least one module (E-commerce or Clinic).');
      setIsLinkingAdmin(false);
      return;
    }

    try {
      // 1. Update user document with this businessId and shopId
      await updateDoc(doc(db, 'users', chosenAdmin.uid), {
        businessId: business.id,
        shopId: business.shopId,
        modules: selectedMods,
        updatedAt: new Date().toISOString(),
      });

      // 2. Add to business assignedAdmins array
      const newAdminEntry = {
        uid: chosenAdmin.uid,
        fullName: chosenAdmin.fullName || chosenAdmin.email || 'Admin',
        email: chosenAdmin.email,
        phone: chosenAdmin.phone || '',
        modules: selectedMods,
        shopId: business.shopId,
        status: chosenAdmin.status || 'active',
        assignedAt: new Date().toISOString(),
      };

      const existingAdmins = business.assignedAdmins || [];
      const updatedList = [
        ...existingAdmins.filter((a: any) => a.uid !== chosenAdmin.uid),
        newAdminEntry,
      ];

      await updateDoc(doc(db, 'businesses', business.id), {
        assignedAdmins: updatedList,
        adminCount: updatedList.length,
        updatedAt: new Date().toISOString(),
      });

      setSuccessMessage(`${chosenAdmin.fullName || chosenAdmin.email} has been assigned to ${business.name}!`);
      setIsLinkingAdminModalOpen(false);
      setSelectedAdminToLink('');
      await fetchBusinessData(true);
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err: any) {
      setLinkAdminError(err.message || 'Failed to assign admin.');
    } finally {
      setIsLinkingAdmin(false);
    }
  };

  const handleConfirmUnassignAdmin = async () => {
    if (!adminToUnassign || !business) return;
    setIsUnassigning(true);

    try {
      // 1. Remove from business assignedAdmins
      const currentList = admins.filter((a) => a.uid !== adminToUnassign.uid);
      const simplified = currentList.map((a) => ({
        uid: a.uid || '',
        fullName: a.fullName || (a as any).name || 'Admin',
        email: a.email || '',
        phone: a.phone || '',
        modules: a.modules || ['ecommerce', 'clinic'],
        shopId: business.shopId,
        status: a.status || 'active',
        assignedAt: (a as any).assignedAt || a.createdAt || new Date().toISOString(),
      }));

      await updateDoc(doc(db, 'businesses', business.id), {
        assignedAdmins: simplified,
        adminCount: simplified.length,
        updatedAt: new Date().toISOString(),
      });

      // 2. Clear businessId and shopId on user document
      await updateDoc(doc(db, 'users', adminToUnassign.uid), {
        businessId: '',
        shopId: '',
        updatedAt: new Date().toISOString(),
      });

      setSuccessMessage(`${adminToUnassign.fullName} unassigned from ${business.name}.`);
      setAdminToUnassign(null);
      await fetchBusinessData(true);
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to unassign admin.');
    } finally {
      setIsUnassigning(false);
    }
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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#25242A] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#7567E8]" /> Assigned Administrators
              </h2>
              <span className="text-xs font-extrabold bg-[#F1EEFF] text-[#7567E8] px-2.5 py-0.5 rounded-full border border-[#7567E8]/20">
                {admins.length} {admins.length === 1 ? 'Admin' : 'Admins'}
              </span>
            </div>
            <p className="text-xs text-[#777980] font-medium mt-0.5">
              Administrators authorized to supervise this clinic&apos;s E-commerce store and Doctor clinic operations.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => fetchBusinessData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FAFCFD] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#25242A] rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Sync from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7567E8]' : ''}`} /> Sync Admins
            </button>

            <button
              onClick={() => {
                setIsLinkingAdminModalOpen(true);
                setLinkAdminError('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#EAF8FE] hover:bg-[#D9F2FD] text-[#0284C7] border border-[#8ED8F8]/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Link Existing Admin
            </button>

            <Link
              href={`/super-admin/admins/create?businessId=${business.id}&shopId=${business.shopId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#7567E8] hover:bg-[#6354D6] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Create New Admin
            </Link>
          </div>
        </div>

        {admins.length === 0 ? (
          <div className="p-8 border border-dashed border-[#CBD5E1] rounded-2xl text-center space-y-3 bg-[#FAFCFD]">
            <Users className="w-8 h-8 text-[#777980] mx-auto opacity-60" />
            <h3 className="text-sm font-extrabold text-[#25242A]">No Admins Assigned Yet</h3>
            <p className="text-xs text-[#777980] max-w-md mx-auto">
              This clinic does not have any assigned administrators yet. You can link an existing admin or create a new administrator account.
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={() => {
                  setIsLinkingAdminModalOpen(true);
                  setLinkAdminError('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#CBD5E1] hover:border-[#7567E8] text-[#25242A] rounded-xl text-xs font-bold hover:bg-[#F1EEFF] transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#7567E8]" /> Link Existing Admin
              </button>
              <Link
                href={`/super-admin/admins/create?businessId=${business.id}&shopId=${business.shopId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7567E8] text-white rounded-xl text-xs font-bold hover:bg-[#6354D6] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create First Admin
              </Link>
            </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModulesModal(adm)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E8ECF0] hover:border-[#7567E8] bg-white hover:bg-[#F1EEFF] text-[#7567E8] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Edit Permissions"
                          >
                            <KeyRound className="w-3 h-3" /> Edit Modules
                          </button>

                          <Link
                            href={`/super-admin/admins/${adm.uid}`}
                            className="p-1.5 rounded-lg text-[#777980] hover:text-[#25242A] hover:bg-slate-100 transition-colors"
                            title="Full Admin Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => setAdminToUnassign(adm)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Unassign from Clinic"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
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

      {/* ---------------- CLINIC DOCTORS & SPECIALISTS SECTION ---------------- */}
      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8ECF0]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#25242A] flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#0284C7]" /> Clinic Doctors & Medical Specialists
              </h2>
              <span className="text-xs font-extrabold bg-[#EAF8FE] text-[#0284C7] px-2.5 py-0.5 rounded-full border border-[#8ED8F8]/40">
                {doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'}
              </span>
            </div>
            <p className="text-xs text-[#777980] font-medium mt-0.5">
              Veterinary doctors and specialists registered under this clinic for appointments and medical care.
            </p>
          </div>

          <div className="text-xs font-semibold text-[#777980] bg-[#FAFCFD] px-3.5 py-1.5 rounded-xl border border-[#E8ECF0]">
            Managed by Assigned Clinic Admin
          </div>
        </div>

        {doctors.length === 0 ? (
          <div className="p-8 border border-dashed border-[#CBD5E1] rounded-2xl text-center space-y-3 bg-[#FAFCFD]">
            <Stethoscope className="w-8 h-8 text-[#777980] mx-auto opacity-60" />
            <h3 className="text-sm font-extrabold text-[#25242A]">No Doctors Registered for this Clinic Yet</h3>
            <p className="text-xs text-[#777980] max-w-md mx-auto">
              This clinic does not have any doctors registered yet. An assigned Clinic Admin with the Clinic module can create and manage doctors from the Clinic Admin Portal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8ECF0] text-[#777980] font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Doctor</th>
                  <th className="pb-3 px-3">Specialization & Qualification</th>
                  <th className="pb-3 px-3">Contact Details</th>
                  <th className="pb-3 px-3">Availability</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-medium text-[#25242A]">
                {doctors.map((doc) => (
                  <tr key={doc.uid} className="hover:bg-[#FAFCFD] transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        {doc.photoURL ? (
                          <img
                            src={doc.photoURL}
                            alt={doc.fullName}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E8ECF0]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#EAF8FE] text-[#0284C7] font-extrabold flex items-center justify-center text-xs border border-[#8ED8F8]/40">
                            {(doc.fullName || 'Dr').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-extrabold text-xs block text-[#25242A] leading-tight">
                            {doc.fullName.startsWith('Dr') ? doc.fullName : `Dr. ${doc.fullName}`}
                          </span>
                          {doc.registrationNumber && (
                            <span className="text-[10px] text-[#777980] font-medium">
                              Reg: {doc.registrationNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#0284C7] block">
                          {doc.specialization || 'General Veterinary'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#777980]">
                          {doc.qualification && <span>{doc.qualification}</span>}
                          {doc.qualification && doc.experience && <span>•</span>}
                          {doc.experience && <span>{doc.experience} exp</span>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5">
                        <span className="block font-semibold text-[#25242A]">{doc.email}</span>
                        {doc.phone && (
                          <span className="text-[11px] text-[#777980] block font-mono">
                            {doc.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#475569] bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3 text-[#0284C7]" />
                        {doc.availability || 'Regular Clinic Hours'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <UserStatusBadge status={doc.status || 'active'} />
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href={`/super-admin/doctors/${doc.uid}`}
                        className="px-2.5 py-1.5 rounded-lg border border-[#E8ECF0] hover:border-[#0284C7] bg-white hover:bg-[#EAF8FE] text-[#0284C7] text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                        title="View Doctor Details"
                      >
                        <ExternalLink className="w-3 h-3" /> View Details
                      </Link>
                    </td>
                  </tr>
                ))}
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

      {/* ---------------- LINK EXISTING ADMIN MODAL ---------------- */}
      {isLinkingAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E8ECF0] shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E8ECF0] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#0284C7]" /> Link Existing Admin
                </h3>
                <p className="text-xs text-[#777980] font-medium mt-0.5">
                  Assign an existing administrator account to {business.name} ({business.shopId})
                </p>
              </div>
              <button
                onClick={() => setIsLinkingAdminModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-[#777980]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {linkAdminError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {linkAdminError}
              </div>
            )}

            {allSystemAdmins.filter(
              (sysAdmin) => !admins.some((adm) => adm.uid === sysAdmin.uid || adm.email === sysAdmin.email)
            ).length === 0 ? (
              <div className="p-5 border border-dashed border-[#CBD5E1] rounded-2xl text-center space-y-2 bg-[#FAFCFD]">
                <Users className="w-6 h-6 text-[#777980] mx-auto opacity-60" />
                <h4 className="text-xs font-bold text-[#25242A]">No Unassigned Admins Available</h4>
                <p className="text-[11px] text-[#777980]">
                  All existing admin accounts in the database are already assigned to this clinic.
                </p>
                <Link
                  href={`/super-admin/admins/create?businessId=${business.id}&shopId=${business.shopId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7567E8] text-white rounded-xl text-xs font-bold hover:bg-[#6354D6] mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Admin Instead
                </Link>
              </div>
            ) : (
              <form onSubmit={handleLinkExistingAdmin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                    Select Administrator Account *
                  </label>
                  <select
                    value={selectedAdminToLink}
                    onChange={(e) => setSelectedAdminToLink(e.target.value)}
                    required
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-3.5 py-2.5 rounded-xl font-bold text-[#25242A] outline-hidden cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Choose an Admin to Assign --
                    </option>
                    {allSystemAdmins
                      .filter(
                        (sysAdmin) => !admins.some((adm) => adm.uid === sysAdmin.uid || adm.email === sysAdmin.email)
                      )
                      .map((adm) => (
                        <option key={adm.uid} value={adm.uid}>
                          {adm.fullName || adm.email} ({adm.email}) {adm.shopId ? `[Current Shop: ${adm.shopId}]` : '[Unassigned]'}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="block font-bold text-[#25242A] uppercase tracking-wider">
                    Authorized Modules for this Clinic:
                  </span>

                  {/* Module 1: E-commerce */}
                  <div
                    onClick={() =>
                      setLinkAdminModules((prev) => ({ ...prev, ecommerce: !prev.ecommerce }))
                    }
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      linkAdminModules.ecommerce
                        ? 'bg-[#F1EEFF]/60 border-[#7567E8]'
                        : 'bg-[#FAFCFD] border-[#E8ECF0] opacity-70'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        linkAdminModules.ecommerce
                          ? 'bg-[#7567E8] text-white'
                          : 'bg-white border border-[#CBD5E1]'
                      }`}
                    >
                      {linkAdminModules.ecommerce && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="font-extrabold text-[#25242A] block flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#7567E8]" /> E-commerce Module
                      </span>
                    </div>
                  </div>

                  {/* Module 2: Clinic / Doctor */}
                  <div
                    onClick={() =>
                      setLinkAdminModules((prev) => ({ ...prev, clinic: !prev.clinic }))
                    }
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      linkAdminModules.clinic
                        ? 'bg-[#EAF8FE]/60 border-[#0284C7]'
                        : 'bg-[#FAFCFD] border-[#E8ECF0] opacity-70'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        linkAdminModules.clinic
                          ? 'bg-[#0284C7] text-white'
                          : 'bg-white border border-[#CBD5E1]'
                      }`}
                    >
                      {linkAdminModules.clinic && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="font-extrabold text-[#25242A] block flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-[#0284C7]" /> Clinic / Doctor Module
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsLinkingAdminModalOpen(false)}
                    className="px-4 py-2 border border-[#E8ECF0] rounded-xl font-bold text-[#777980] hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLinkingAdmin || !selectedAdminToLink}
                    className="px-5 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isLinkingAdmin ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Linking...
                      </>
                    ) : (
                      'Assign Admin to Clinic'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ---------------- UNASSIGN ADMIN CONFIRMATION MODAL ---------------- */}
      {adminToUnassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E8ECF0] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <UserMinus className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-extrabold text-[#25242A]">
                Unassign Admin from Clinic?
              </h3>
              <p className="text-xs text-[#777980] leading-relaxed">
                Are you sure you want to remove <strong>{adminToUnassign.fullName || adminToUnassign.email}</strong> from <strong>{business.name}</strong>?
              </p>
              <p className="text-[11px] text-[#777980]/80">
                They will no longer be authorized to manage products, orders, doctors, or appointments for Shop ID <span className="font-mono font-bold text-[#25242A]">{business.shopId}</span>.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAdminToUnassign(null)}
                className="flex-1 py-2.5 border border-[#E8ECF0] rounded-xl font-bold text-xs text-[#777980] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUnassigning}
                onClick={handleConfirmUnassignAdmin}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isUnassigning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Removing...
                  </>
                ) : (
                  'Yes, Unassign'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
