'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import {
  Plus,
  Syringe,
  Shield,
  Clock,
  Dog,
  Cat,
  Edit2,
  Archive,
  Search,
  Loader2,
  Calendar,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';
import { VaccinePackage } from '@/lib/vaccineSchedule';

export default function AdminVaccinationsPage() {
  const { profile, business, user, loading: authLoading } = useAuth();
  const [packages, setPackages] = useState<VaccinePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<VaccinePackage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    vaccineName: '',
    species: 'Dog' as 'Dog' | 'Cat' | 'All',
    brand: '',
    description: '',
    totalDoses: '3',
    pricePerDose: '500',
    intervalDays: '21',
    classification: 'series' as 'series' | 'booster' | 'annual_booster',
    status: 'Active' as 'Active' | 'Inactive' | 'Archived',
  });

  const targetBizId = profile?.businessId || business?.id || '';
  const targetShopId = profile?.shopId || business?.shopId || '';

  // Auto-calculated package price formula
  const calculatedPackagePrice =
    (parseInt(formData.totalDoses, 10) || 0) * (parseFloat(formData.pricePerDose) || 0);

  // 1. Fetch Vaccine Packages via API with direct Firestore listener & fallback
  const fetchPackages = useCallback(async () => {
    try {
      const idToken = user ? await user.getIdToken() : '';
      const { ok, data } = await safeFetchJson<any>('/api/clinic/vaccine-packages', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': profile?.uid || user?.uid || '',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });

      if (ok && data?.success && Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
    } catch (e) {
      console.warn('[Admin Vaccinations fetch error]:', e);
    } finally {
      setIsLoading(false);
    }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;
    setIsLoading(true);

    try {
      const colRef = collection(db, 'vaccine_packages');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty && isMounted) {
            const list: VaccinePackage[] = [];
            snapshot.docs.forEach((d) => {
              const pkg = { id: d.id, ...d.data() } as VaccinePackage;
              if (profile?.role === 'super_admin') {
                list.push(pkg);
              } else if (targetBizId && pkg.businessId === targetBizId) {
                list.push(pkg);
              } else if (targetShopId && pkg.shopId === targetShopId) {
                list.push(pkg);
              } else if (!pkg.businessId && !pkg.shopId) {
                list.push(pkg);
              }
            });
            setPackages(list);
            setIsLoading(false);
          } else {
            fetchPackages();
          }
        },
        () => {
          fetchPackages();
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (_) {
      fetchPackages();
    }
  }, [authLoading, profile, targetBizId, targetShopId, fetchPackages]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingPackage(null);
    setFormError('');
    setFormData({
      name: '',
      vaccineName: '',
      species: 'Dog',
      brand: '',
      description: '',
      totalDoses: '3',
      pricePerDose: '500',
      intervalDays: '21',
      classification: 'series',
      status: 'Active',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (pkg: VaccinePackage) => {
    setEditingPackage(pkg);
    setFormError('');
    setFormData({
      name: pkg.name || '',
      vaccineName: pkg.vaccineName || pkg.name || '',
      species: pkg.species || 'Dog',
      brand: pkg.brand || '',
      description: pkg.description || '',
      totalDoses: String(pkg.totalDoses || 1),
      pricePerDose: String(pkg.pricePerDose || 0),
      intervalDays: String(pkg.intervalDays || 21),
      classification: pkg.classification || 'series',
      status: pkg.status || 'Active',
    });
    setIsModalOpen(true);
  };

  // Save Package (Create or Update)
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.vaccineName.trim()) {
      setFormError('Package Name and Vaccine Name are required.');
      return;
    }

    const doses = parseInt(formData.totalDoses, 10);
    if (isNaN(doses) || doses < 1) {
      setFormError('Total doses in package must be at least 1.');
      return;
    }

    const perDose = parseFloat(formData.pricePerDose);
    if (isNaN(perDose) || perDose < 0) {
      setFormError('Price per dose must be a non-negative number.');
      return;
    }

    const interval = parseInt(formData.intervalDays, 10);
    const validInterval = !isNaN(interval) && interval > 0 ? interval : 21;

    setIsSaving(true);
    setFormError('');

    const payload = {
      name: formData.name.trim(),
      vaccineName: formData.vaccineName.trim(),
      species: formData.species,
      brand: formData.brand.trim(),
      description: formData.description.trim(),
      totalDoses: doses,
      pricePerDose: perDose,
      packagePrice: doses * perDose,
      intervalDays: validInterval,
      classification: formData.classification,
      status: formData.status,
      businessId: targetBizId,
      shopId: targetShopId,
    };

    try {
      const idToken = user ? await user.getIdToken() : '';
      const url = editingPackage
        ? `/api/clinic/vaccine-packages/${editingPackage.id}`
        : '/api/clinic/vaccine-packages';
      const method = editingPackage ? 'PATCH' : 'POST';

      const { data, error } = await safeFetchJson<any>(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (error || !data?.success) {
        // Direct Firestore fallback
        const docId = editingPackage
          ? editingPackage.id
          : `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const firestoreDoc = {
          id: docId,
          ...payload,
          updatedAt: new Date().toISOString(),
          ...(editingPackage ? {} : { createdAt: new Date().toISOString() }),
        };

        if (editingPackage) {
          await updateDoc(doc(db, 'vaccine_packages', docId), firestoreDoc);
        } else {
          await setDoc(doc(db, 'vaccine_packages', docId), firestoreDoc);
        }
      }

      setIsModalOpen(false);
      fetchPackages();
    } catch (e: any) {
      setFormError(e.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Archive / Deactivate
  const handleToggleArchive = async (pkg: VaccinePackage) => {
    const nextStatus = pkg.status === 'Archived' ? 'Active' : 'Archived';
    const confirmMsg =
      nextStatus === 'Archived'
        ? `Archive package "${pkg.name}"? It will no longer be available for new sales, but existing pet package records remain completely safe.`
        : `Re-activate package "${pkg.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<any>(`/api/clinic/vaccine-packages/${pkg.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (error || !data?.success) {
        await updateDoc(doc(db, 'vaccine_packages', pkg.id), {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        });
      }
      fetchPackages();
    } catch (err: any) {
      alert(`Could not update package status: ${err.message}`);
    }
  };

  // Filter packages
  const filtered = packages.filter((pkg) => {
    if (filterStatus === 'active' && pkg.status !== 'Active') return false;
    if (filterStatus === 'inactive' && pkg.status === 'Active') return false;

    if (filterSpecies !== 'All' && pkg.species !== 'All' && pkg.species !== filterSpecies) {
      return false;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (pkg.name || '').toLowerCase().includes(q);
      const matchVac = (pkg.vaccineName || '').toLowerCase().includes(q);
      const matchBrand = (pkg.brand || '').toLowerCase().includes(q);
      return matchName || matchVac || matchBrand;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Pet Vaccine & Package Management"
        subtitle="Configure clinic vaccines, multi-dose series packages, per-dose pricing, booster schedules, and animal applicability."
        action={
          <Button onClick={handleOpenCreateModal} icon={<Plus className="w-4 h-4" />}>
            Create Vaccine Package
          </Button>
        }
      />

      {/* Search & Filters */}
      <Card padding="p-4" className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search by package name, vaccine, or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Species Filter */}
            <div className="flex items-center gap-1 bg-[#F1EEFF]/60 p-1 rounded-xl border border-[#7567E8]/20 text-xs">
              {['All', 'Dog', 'Cat'].map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setFilterSpecies(sp)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    filterSpecies === sp ? 'bg-[#7567E8] text-white shadow-2xs' : 'text-[#737780] hover:text-[#25242A]'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[#F1EEFF]/60 p-1 rounded-xl border border-[#7567E8]/20 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'active' ? 'bg-[#7567E8] text-white shadow-2xs' : 'text-[#737780] hover:text-[#25242A]'
                }`}
              >
                Active ({packages.filter((p) => p.status === 'Active').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('inactive')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'inactive' ? 'bg-[#7567E8] text-white shadow-2xs' : 'text-[#737780] hover:text-[#25242A]'
                }`}
              >
                Archived ({packages.filter((p) => p.status !== 'Active').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'all' ? 'bg-[#7567E8] text-white shadow-2xs' : 'text-[#737780] hover:text-[#25242A]'
                }`}
              >
                All ({packages.length})
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Package Grid */}
      {isLoading ? (
        <Card padding="p-12" className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-[#7567E8] animate-spin mb-3" />
          <p className="text-xs text-[#737780] font-semibold">Loading real-time vaccine packages...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="p-12" className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto mb-4 border border-[#7567E8]/20">
            <Syringe className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#25242A]">No Vaccine Packages Configured</h3>
          <p className="text-xs text-[#737780] max-w-sm mx-auto mt-1 leading-relaxed">
            {searchTerm || filterSpecies !== 'All'
              ? 'No vaccine packages match your current search criteria.'
              : 'Configure your first multi-dose vaccine package with per-dose pricing to begin selling packages to pet parents.'}
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={handleOpenCreateModal} icon={<Plus className="w-4 h-4" />}>
              Configure Vaccine Package
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((pkg) => {
            const isArchived = pkg.status === 'Archived' || pkg.status === 'Inactive';

            return (
              <Card
                key={pkg.id}
                className={`relative flex flex-col justify-between transition-all ${
                  isArchived ? 'opacity-70 bg-slate-50/50' : 'hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#35B779] bg-[#DFF7EE] px-2.5 py-1 rounded-md flex items-center gap-1">
                      {pkg.species === 'Dog' ? <Dog className="w-3 h-3" /> : pkg.species === 'Cat' ? <Cat className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      {pkg.species} Vaccine
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#7567E8]/10 text-[#7567E8]">
                        {pkg.totalDoses} {pkg.totalDoses === 1 ? 'Dose' : 'Doses'}
                      </span>
                      <StatusBadge status={pkg.status || 'Active'} />
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-[#25242A] mb-1">{pkg.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#7567E8] font-bold mb-2">
                    <Syringe className="w-3.5 h-3.5" />
                    <span>{pkg.vaccineName}</span>
                    {pkg.brand && <span className="text-[#737780] font-normal">({pkg.brand})</span>}
                  </div>

                  {pkg.description && (
                    <p className="text-xs text-[#737780] leading-relaxed mb-4 line-clamp-3">{pkg.description}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#E8ECF0] space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#737780]">Dose Interval:</span>
                    <span className="font-bold text-[#25242A]">Every {pkg.intervalDays} Days</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#737780]">Price Per Dose:</span>
                    <span className="font-bold text-slate-800">₹{pkg.pricePerDose.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-[#25242A]">Total Package Price:</span>
                    <span className="text-lg font-black text-[#7567E8]">₹{pkg.packagePrice.toFixed(2)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8ECF0]">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditModal(pkg)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleArchive(pkg)}
                      icon={<Archive className="w-3.5 h-3.5 text-red-500" />}
                    >
                      {isArchived ? 'Activate' : 'Archive'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Vaccine Package Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPackage ? `Edit Vaccine Package: ${editingPackage.name}` : 'Configure New Vaccine Package'}
        maxWidth="md"
      >
        <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">Package Display Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Vaccination (9 in 1) Complete Package"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2 text-xs text-[#25242A] font-semibold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Vaccine Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Vaccination (9 in 1), ARV"
                value={formData.vaccineName}
                onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Manufacturer / Brand</label>
              <input
                type="text"
                placeholder="e.g. Nobivac, Megavac, Zoetis"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Applicable Species</label>
              <select
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value as any })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none font-semibold"
              >
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="All">All Pets</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Classification</label>
              <select
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value as any })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              >
                <option value="series">Initial Puppy / Kitten Series</option>
                <option value="booster">Booster Dose Series</option>
                <option value="annual_booster">Annual Booster</option>
              </select>
            </div>
          </div>

          {/* Dose Count, Per-Dose Price & Auto Package Price */}
          <div className="p-3.5 bg-[#F1EEFF]/60 border border-[#7567E8]/20 rounded-xl space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-[11px] text-[#25242A] block mb-1">Total Doses in Package *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.totalDoses}
                  onChange={(e) => setFormData({ ...formData, totalDoses: e.target.value })}
                  className="w-full bg-white border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-bold text-[#25242A] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[11px] text-[#25242A] block mb-1">Price Per Dose (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.pricePerDose}
                  onChange={(e) => setFormData({ ...formData, pricePerDose: e.target.value })}
                  className="w-full bg-white border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-bold text-[#25242A] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[11px] text-[#7567E8] block mb-1">Auto Package Price (₹)</label>
                <div className="w-full bg-white border border-[#7567E8]/40 rounded-xl px-3 py-2 text-xs font-extrabold text-[#7567E8] flex items-center justify-between">
                  <span>₹{calculatedPackagePrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#737780] italic">
              Formula: Package Price = Total Doses ({formData.totalDoses}) × Price Per Dose (₹{formData.pricePerDose || 0}) = ₹{calculatedPackagePrice.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Recommended Interval (Days)</label>
              <input
                type="number"
                min="1"
                placeholder="21"
                value={formData.intervalDays}
                onChange={(e) => setFormData({ ...formData, intervalDays: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              >
                <option value="Active">Active (Available for purchase)</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">Package Description & Clinical Scope</label>
            <textarea
              rows={2}
              placeholder="e.g. Immunization package covering initial series plus follow-up boosters against DHPPIL."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8ECF0]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : editingPackage ? (
                'Update Package'
              ) : (
                'Save Vaccine Package'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
