'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Tag,
  Loader2,
  Edit2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Archive,
  Pill,
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';

export interface ClinicMedicineItem {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  strength?: string;
  dosageUnit?: string;
  manufacturer?: string;
  description?: string;
  defaultInstructions?: string;
  price?: number;
  stockQuantity: number;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  lowStockThreshold: number;
  notes?: string;
  businessId: string;
  shopId: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt?: string;
  updatedAt?: string;
  createdByUid?: string;
  createdByName?: string;
}

const CATEGORIES = [
  'All',
  'Tablet',
  'Syrup',
  'Capsule',
  'Injection',
  'Drops',
  'Ointment',
  'Vaccine',
  'Supplement',
  'Dewormer',
  'Pain Relief',
  'Antibiotic',
  'Other',
];

const UNITS = ['vial', 'injection', 'tablet', 'strip', 'bottle', 'ml', 'ampoule', 'capsule', 'drop', 'dose', 'box'];

interface ClinicInventoryManagerProps {
  panelType: 'doctor' | 'admin';
}

export const ClinicInventoryManager: React.FC<ClinicInventoryManagerProps> = ({ panelType }) => {
  const { profile, business, user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ClinicMedicineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add / Edit Medicine Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClinicMedicineItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    category: 'Tablet',
    strength: '',
    dosageUnit: 'tablet',
    manufacturer: '',
    description: '',
    defaultInstructions: '',
    price: '',
    stockQuantity: '10',
    unit: 'tablet',
    batchNumber: '',
    expiryDate: '',
    lowStockThreshold: '5',
    notes: '',
    status: 'active' as 'active' | 'inactive' | 'archived',
  });

  // View Details Modal
  const [viewingItem, setViewingItem] = useState<ClinicMedicineItem | null>(null);

  // Adjust Stock Modal
  const [adjustingItem, setAdjustingItem] = useState<ClinicMedicineItem | null>(null);
  const [newStockInput, setNewStockInput] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const targetBizId = profile?.businessId || business?.id || '';
  const targetShopId = profile?.shopId || business?.shopId || '';

  // 1. Fetch Inventory via API with live Firestore listener & fallback
  const fetchInventory = useCallback(async () => {
    try {
      const idToken = user ? await user.getIdToken() : '';
      const { ok, data } = await safeFetchJson<any>('/api/clinic/inventory', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': profile?.uid || user?.uid || '',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });

      if (ok && data?.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (e) {
      console.warn('Inventory fetch warning:', e);
    } finally {
      setIsLoading(false);
    }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;
    setIsLoading(true);

    try {
      const colRef = collection(db, 'inventory');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty && isMounted) {
            const list: ClinicMedicineItem[] = [];
            snapshot.docs.forEach((d) => {
              const item = { id: d.id, ...d.data() } as ClinicMedicineItem;
              if (profile?.role === 'super_admin') {
                list.push(item);
              } else if (targetBizId && item.businessId === targetBizId) {
                list.push(item);
              } else if (targetShopId && item.shopId === targetShopId) {
                list.push(item);
              } else if (!item.businessId && !item.shopId) {
                list.push(item);
              }
            });
            setItems(list);
            setIsLoading(false);
          } else {
            fetchInventory();
          }
        },
        (err) => {
          console.warn('Live inventory snapshot notice:', err);
          fetchInventory();
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (_) {
      fetchInventory();
    }
  }, [authLoading, profile, targetBizId, targetShopId, fetchInventory]);

  // 2. Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormError('');
    setFormData({
      name: '',
      genericName: '',
      category: 'Tablet',
      strength: '',
      dosageUnit: 'tablet',
      manufacturer: '',
      description: '',
      defaultInstructions: '',
      price: '',
      stockQuantity: '10',
      unit: 'tablet',
      batchNumber: '',
      expiryDate: '',
      lowStockThreshold: '5',
      notes: '',
      status: 'active',
    });
    setIsFormModalOpen(true);
  };

  // 3. Open Edit Modal
  const handleOpenEditModal = (item: ClinicMedicineItem) => {
    setEditingItem(item);
    setFormError('');
    setFormData({
      name: item.name || '',
      genericName: item.genericName || '',
      category: item.category || 'Tablet',
      strength: item.strength || '',
      dosageUnit: item.dosageUnit || item.unit || 'tablet',
      manufacturer: item.manufacturer || '',
      description: item.description || '',
      defaultInstructions: item.defaultInstructions || '',
      price: item.price !== undefined ? String(item.price) : '',
      stockQuantity: String(item.stockQuantity ?? 0),
      unit: item.unit || 'tablet',
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate || '',
      lowStockThreshold: String(item.lowStockThreshold ?? 5),
      notes: item.notes || '',
      status: item.status || 'active',
    });
    setIsFormModalOpen(true);
  };

  // 4. Save New or Edited Medicine
  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Medicine name is required.');
      return;
    }

    const qty = parseInt(formData.stockQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      setFormError('Stock quantity must be 0 or a positive number.');
      return;
    }

    const priceVal = formData.price ? parseFloat(formData.price) : 0;
    if (isNaN(priceVal) || priceVal < 0) {
      setFormError('Price must be a valid non-negative number.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    const payload = {
      name: formData.name.trim(),
      genericName: formData.genericName.trim(),
      category: formData.category,
      strength: formData.strength.trim(),
      dosageUnit: formData.dosageUnit.trim(),
      manufacturer: formData.manufacturer.trim(),
      description: formData.description.trim(),
      defaultInstructions: formData.defaultInstructions.trim(),
      price: priceVal,
      stockQuantity: qty,
      unit: formData.unit,
      batchNumber: formData.batchNumber.trim().toUpperCase(),
      expiryDate: formData.expiryDate.trim(),
      lowStockThreshold: parseInt(formData.lowStockThreshold, 10) || 5,
      notes: formData.notes.trim(),
      status: formData.status,
      requesterUid: profile?.uid || user?.uid,
      businessId: targetBizId,
      shopId: targetShopId,
    };

    try {
      const idToken = user ? await user.getIdToken() : '';
      const url = editingItem ? `/api/clinic/inventory/${editingItem.id}` : '/api/clinic/inventory';
      const method = editingItem ? 'PATCH' : 'POST';

      const { data, error } = await safeFetchJson<{ success: boolean; error?: string; message?: string }>(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (error || !data?.success) {
        // Direct Firestore fallback for resilience
        try {
          const docId = editingItem ? editingItem.id : `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const firestorePayload = {
            id: docId,
            ...payload,
            updatedAt: new Date().toISOString(),
            ...(editingItem ? {} : { createdAt: new Date().toISOString() }),
          };
          if (editingItem) {
            await updateDoc(doc(db, 'inventory', docId), firestorePayload);
          } else {
            await setDoc(doc(db, 'inventory', docId), firestorePayload);
          }
          setIsFormModalOpen(false);
          fetchInventory();
          return;
        } catch (directErr: any) {
          console.error('[Inventory Direct Save Error]', directErr);
          setFormError(error || data?.error || directErr.message || 'Failed to save medicine.');
          return;
        }
      }

      setIsFormModalOpen(false);
      fetchInventory();
    } catch (e: any) {
      setFormError(e.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Deactivate / Archive Medicine (Soft-delete)
  const handleToggleArchive = async (item: ClinicMedicineItem) => {
    const nextStatus = item.status === 'archived' ? 'active' : 'archived';
    const confirmMsg =
      nextStatus === 'archived'
        ? `Archive medicine "${item.name}"? It will no longer appear for new prescriptions or walk-ins, but past medical records will be preserved.`
        : `Re-activate medicine "${item.name}" into the active clinical catalog?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<any>(`/api/clinic/inventory/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (error || !data?.success) {
        // Direct Firestore fallback
        await updateDoc(doc(db, 'inventory', item.id), {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        });
      }
      fetchInventory();
    } catch (err: any) {
      alert(`Could not update medicine status: ${err.message}`);
    }
  };

  // 6. Handle Stock Adjustment
  const handleOpenAdjust = (item: ClinicMedicineItem) => {
    setAdjustingItem(item);
    setNewStockInput(item.stockQuantity.toString());
    setAdjustReason('');
    setAdjustError('');
  };

  const handleSaveStockAdjustment = async () => {
    if (!adjustingItem) return;
    const newQty = parseInt(newStockInput, 10);
    if (isNaN(newQty) || newQty < 0) {
      setAdjustError('Please enter a valid stock quantity (0 or greater).');
      return;
    }

    setIsAdjusting(true);
    setAdjustError('');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<{ success: boolean; error?: string; message?: string }>(
        `/api/clinic/inventory/${adjustingItem.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            stockQuantity: newQty,
            adjustmentReason: adjustReason.trim() || 'Manual stock reconciliation',
            requesterUid: profile?.uid || user?.uid,
          }),
        }
      );

      if (error || !data?.success) {
        // Direct Firestore fallback
        await updateDoc(doc(db, 'inventory', adjustingItem.id), {
          stockQuantity: newQty,
          updatedAt: new Date().toISOString(),
        });
      }

      setAdjustingItem(null);
      fetchInventory();
    } catch (e: any) {
      setAdjustError(e.message || 'An error occurred during adjustment.');
    } finally {
      setIsAdjusting(false);
    }
  };

  const isItemExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const exp = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  };

  // Filter Items
  const filtered = items.filter((item) => {
    // Status filter
    if (statusFilter === 'active' && item.status !== 'active') return false;
    if (statusFilter === 'inactive' && item.status === 'active') return false;

    // Category filter
    if (selectedCategory !== 'All' && (item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchGeneric = (item.genericName || '').toLowerCase().includes(q);
      const matchBatch = (item.batchNumber || '').toLowerCase().includes(q);
      const matchManufacturer = (item.manufacturer || '').toLowerCase().includes(q);
      return matchName || matchGeneric || matchBatch || matchManufacturer;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={panelType === 'admin' ? 'Clinic Medicine & Drug Management' : 'Clinical Medicine Inventory'}
        subtitle="Manage medicines, injections, strengths, dosages, pricing, stock levels, and clinical dispensing instructions."
        action={
          <Button onClick={handleOpenAddModal} icon={<Plus className="w-4 h-4" />}>
            Add Medicine
          </Button>
        }
      />

      {/* Search, Status & Category Filter */}
      <Card padding="p-4" className="space-y-3">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search by brand name, generic name, batch, or manufacturer..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none transition-colors"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 self-start md:self-auto bg-[#F1EEFF]/60 p-1 rounded-xl border border-[#7567E8]/20">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('active');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'active' ? 'bg-[#7567E8] text-white shadow-2xs' : 'text-[#737780] hover:text-[#25242A]'
              }`}
            >
              Active ({items.filter((i) => i.status === 'active').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('inactive');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'inactive' ? 'bg-[#7567E8] text-white shadow-2xs' : 'text-[#737780] hover:text-[#25242A]'
              }`}
            >
              Inactive / Archived ({items.filter((i) => i.status !== 'active').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-[#7567E8] text-white shadow-2xs' : 'text-[#737780] hover:text-[#25242A]'
              }`}
            >
              All ({items.length})
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-[#E8ECF0] pb-1">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-[#7567E8] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#737780] hover:text-[#25242A] border border-[#E8ECF0]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Inventory List (Desktop Table + Mobile Cards) */}
      {isLoading ? (
        <Card padding="p-12" className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-[#7567E8] animate-spin mb-3" />
          <p className="text-xs text-[#737780] font-semibold">Loading clinic medicine catalog...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="p-12" className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto mb-4 border border-[#7567E8]/20">
            <Pill className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#25242A]">No Medicines Found</h3>
          <p className="text-xs text-[#737780] max-w-sm mx-auto mt-1 leading-relaxed">
            {searchTerm || selectedCategory !== 'All'
              ? 'No medicines match your current search or category filter.'
              : 'No medicines added to your clinic catalog yet. Click below to add your first medicine or injection.'}
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={handleOpenAddModal} icon={<Plus className="w-4 h-4" />}>
              Add Medicine
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card padding="p-0" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E8ECF0] text-[11px] font-extrabold uppercase tracking-wider text-[#737780]">
                      <th className="py-3 px-4">Medicine & Strength</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Selling Price</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Batch / Expiry</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8ECF0] text-xs">
                    {paginatedItems.map((item) => {
                      const isLow = item.stockQuantity > 0 && item.stockQuantity <= item.lowStockThreshold;
                      const isOut = item.stockQuantity <= 0;
                      const expired = isItemExpired(item.expiryDate);
                      const isArchived = item.status === 'archived' || item.status === 'inactive';

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#F8FAFC]/60 transition-colors ${
                            isArchived ? 'opacity-75 bg-slate-50/50' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#25242A] text-xs flex items-center gap-1.5">
                              {item.name}
                              {item.strength && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                                  {item.strength}
                                </span>
                              )}
                            </div>
                            {item.genericName && (
                              <div className="text-[11px] text-[#737780] italic">{item.genericName}</div>
                            )}
                            {item.manufacturer && (
                              <div className="text-[10px] text-slate-400">Mfg: {item.manufacturer}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-md bg-[#F1EEFF] text-[#7567E8] border border-[#7567E8]/20">
                              <Tag className="w-3 h-3" />
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {item.price !== undefined && item.price > 0 ? `₹${item.price.toFixed(2)}` : '₹0.00'}
                            </div>
                            <span className="text-[10px] text-slate-400">per {item.unit}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-sm text-[#25242A]">
                              {item.stockQuantity}{' '}
                              <span className="text-xs font-semibold text-[#737780]">{item.unit}</span>
                            </div>
                            <div className="text-[10px] text-[#737780]">Alert at ≤ {item.lowStockThreshold}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] font-bold text-[#25242A]">
                              {item.batchNumber ? `Batch: ${item.batchNumber}` : '—'}
                            </div>
                            {item.expiryDate && (
                              <div
                                className={`text-[11px] font-medium flex items-center gap-1 ${
                                  expired ? 'text-red-600 font-bold' : 'text-[#737780]'
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {expired ? `Expired: ${item.expiryDate}` : `Exp: ${item.expiryDate}`}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isArchived ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                Archived
                              </span>
                            ) : isOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                                <AlertCircle className="w-3 h-3" /> Out
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" /> Low
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingItem(item)}
                                title="View Medicine Details"
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit Medicine"
                                className="p-1.5 text-[#7567E8] hover:bg-[#F1EEFF] rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(item)}
                                title="Adjust Stock"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(item)}
                                title={isArchived ? 'Re-activate Medicine' : 'Archive Medicine'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isArchived
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-red-500 hover:bg-red-50'
                                }`}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedItems.map((item) => {
              const isLow = item.stockQuantity > 0 && item.stockQuantity <= item.lowStockThreshold;
              const isOut = item.stockQuantity <= 0;
              const expired = isItemExpired(item.expiryDate);
              const isArchived = item.status === 'archived' || item.status === 'inactive';

              return (
                <Card key={item.id} padding="p-4" className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-[#25242A] text-sm leading-tight flex items-center gap-1.5">
                        {item.name}
                        {item.strength && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-semibold">
                            {item.strength}
                          </span>
                        )}
                      </h4>
                      {item.genericName && (
                        <p className="text-[11px] text-[#737780] italic mt-0.5">{item.genericName}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F1EEFF] text-[#7567E8]">
                          {item.category}
                        </span>
                        {item.price !== undefined && (
                          <span className="text-[11px] font-extrabold text-slate-900">
                            ₹{item.price.toFixed(2)} / {item.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {isArchived ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        Archived
                      </span>
                    ) : isOut ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                        Out
                      </span>
                    ) : isLow ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        Low
                      </span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E8ECF0]">
                    <div>
                      <span className="text-[10px] text-[#737780] block">Stock</span>
                      <strong className="text-[#25242A] font-extrabold text-sm">
                        {item.stockQuantity} <span className="text-xs font-semibold text-[#737780]">{item.unit}</span>
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#737780] block">Expiry</span>
                      <strong className={`text-xs ${expired ? 'text-red-600 font-bold' : 'text-[#25242A]'}`}>
                        {item.expiryDate || '—'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8ECF0]">
                    <Button size="sm" variant="outline" onClick={() => setViewingItem(item)} icon={<Eye className="w-3.5 h-3.5" />}>
                      Details
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(item)} icon={<Edit2 className="w-3.5 h-3.5" />}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenAdjust(item)} icon={<SlidersHorizontal className="w-3.5 h-3.5" />}>
                      Stock
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-[#737780]">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} items
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>

                <span className="px-2 font-bold text-[#25242A]">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Medicine Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingItem ? `Edit Medicine: ${editingItem.name}` : 'Add New Medicine to Catalog'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveMedicine} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Medicine Brand Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Amoxicillin 250mg, Meloxicam Inj"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2 text-xs text-[#25242A] focus:outline-none font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Generic Name / Composition</label>
              <input
                type="text"
                placeholder="e.g. Amoxicillin Trihydrate, Meloxicam"
                value={formData.genericName}
                onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none font-semibold"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Strength / Concentration</label>
              <input
                type="text"
                placeholder="e.g. 250 mg, 5 mg/ml"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Manufacturer</label>
              <input
                type="text"
                placeholder="e.g. Cipla Vet, Virbac"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Selling Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-bold text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Unit of Measure *</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none capitalize"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Catalog Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              >
                <option value="active">Active (Available for prescriptions)</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Current Stock Quantity *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Batch Number</label>
              <input
                type="text"
                placeholder="e.g. BAT-2026-09"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-mono uppercase text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">Default Dosage Instructions (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Give 1 tablet twice daily after meals for 5 days"
              value={formData.defaultInstructions}
              onChange={(e) => setFormData({ ...formData, defaultInstructions: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">Usage, Clinical Notes & Storage</label>
            <textarea
              rows={2}
              placeholder="e.g. For animal treatment only. Keep refrigerated between 2°C – 8°C. Do not freeze."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E8ECF0]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : editingItem ? (
                'Update Medicine'
              ) : (
                'Add Medicine to Catalog'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Medicine Details Modal */}
      <Modal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title="Medicine Clinical Information"
        maxWidth="md"
      >
        {viewingItem && (
          <div className="space-y-4 text-xs text-[#25242A]">
            <div className="p-3.5 bg-[#F1EEFF] border border-[#7567E8]/30 rounded-xl flex items-start justify-between">
              <div>
                <h4 className="font-extrabold text-[#7567E8] text-base">{viewingItem.name}</h4>
                {viewingItem.genericName && (
                  <p className="text-xs text-slate-700 italic mt-0.5">{viewingItem.genericName}</p>
                )}
                {viewingItem.strength && (
                  <p className="text-[11px] font-semibold text-slate-600 mt-1">
                    Strength: <span className="font-bold text-slate-900">{viewingItem.strength}</span>
                  </p>
                )}
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-[#7567E8] border border-[#7567E8]/20">
                {viewingItem.category}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Selling Price</span>
                <strong className="text-sm font-extrabold text-slate-900">
                  {viewingItem.price !== undefined ? `₹${viewingItem.price.toFixed(2)}` : '₹0.00'}
                </strong>
                <span className="text-[10px] text-slate-500 ml-1">/ {viewingItem.unit}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">In Stock</span>
                <strong className="text-sm font-extrabold text-slate-900">
                  {viewingItem.stockQuantity} {viewingItem.unit}
                </strong>
                <span className="text-[10px] text-slate-500 block">Alert threshold: {viewingItem.lowStockThreshold}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Batch Number</span>
                <strong className="text-xs font-mono text-slate-900">{viewingItem.batchNumber || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Expiry Date</span>
                <strong
                  className={`text-xs ${
                    isItemExpired(viewingItem.expiryDate) ? 'text-red-600 font-bold' : 'text-slate-900'
                  }`}
                >
                  {viewingItem.expiryDate || '—'}
                </strong>
              </div>
            </div>

            {viewingItem.defaultInstructions && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Default Prescribing Instructions</span>
                <p className="text-xs text-amber-950 mt-1">{viewingItem.defaultInstructions}</p>
              </div>
            )}

            {viewingItem.notes && (
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Storage & Usage Notes</span>
                <p className="text-xs text-slate-700 mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {viewingItem.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <Button size="sm" onClick={() => setViewingItem(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={!!adjustingItem}
        onClose={() => setAdjustingItem(null)}
        title="Adjust Medicine Stock Quantity"
        maxWidth="md"
      >
        {adjustingItem && (
          <div className="space-y-4 text-xs text-[#25242A]">
            <div className="p-3 bg-[#F1EEFF] border border-[#7567E8]/30 rounded-xl">
              <h4 className="font-bold text-[#7567E8] text-sm">{adjustingItem.name}</h4>
              <p className="text-[11px] text-[#737780] mt-0.5">
                Category: <strong>{adjustingItem.category}</strong> • Current Stock:{' '}
                <strong className="text-[#25242A]">
                  {adjustingItem.stockQuantity} {adjustingItem.unit}
                </strong>
              </p>
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">
                New Stock Quantity ({adjustingItem.unit}) *
              </label>
              <input
                type="number"
                min="0"
                value={newStockInput}
                onChange={(e) => setNewStockInput(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2.5 text-xs text-[#25242A] font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">
                Reason for Adjustment (Audit Log)
              </label>
              <input
                type="text"
                placeholder="e.g. Received new shipment of 20 vials, discarded damaged ampoule"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdjustingItem(null)}
                disabled={isAdjusting}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveStockAdjustment} disabled={isAdjusting}>
                {isAdjusting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Updating...
                  </>
                ) : (
                  'Save Stock Quantity'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
