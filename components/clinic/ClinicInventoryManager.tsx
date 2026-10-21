'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Tag,
  Loader2,
  Edit2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Syringe,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';

export interface ClinicMedicineItem {
  id: string;
  name: string;
  category: string;
  stockQuantity: number;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  lowStockThreshold: number;
  notes?: string;
  businessId: string;
  shopId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES = [
  'All',
  'Vaccine',
  'Antibiotic',
  'Injection',
  'Dewormer',
  'Pain Relief',
  'Ointment',
  'Supplement',
  'Other',
];

const UNITS = ['vial', 'injection', 'tablet', 'bottle', 'ml', 'ampoule', 'dose', 'box'];

interface ClinicInventoryManagerProps {
  panelType: 'doctor' | 'admin';
}

export const ClinicInventoryManager: React.FC<ClinicInventoryManagerProps> = ({ panelType }) => {
  const { profile, business, user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ClinicMedicineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Vaccine',
    stockQuantity: '10',
    unit: 'vial',
    batchNumber: '',
    expiryDate: '',
    lowStockThreshold: '5',
    notes: '',
  });

  // Adjust Stock Modal
  const [adjustingItem, setAdjustingItem] = useState<ClinicMedicineItem | null>(null);
  const [newStockInput, setNewStockInput] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');

  const targetBizId = profile?.businessId || business?.id || '';
  const targetShopId = profile?.shopId || business?.shopId || '';

  const fetchInventory = useCallback(async () => {
    try {
      const idToken = user ? await user.getIdToken() : '';
      const res = await fetch('/api/clinic/inventory', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': profile?.uid || user?.uid || '',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (e) {
      // quiet fallback
    } finally {
      setIsLoading(false);
    }
  }, [user, profile?.uid]);

  // 1. Initial and live sync for Clinic Medicine Inventory
  useEffect(() => {
    setIsLoading(true);
    fetchInventory();

    // Safe live listener on 'inventory' with silent fallback
    try {
      const colRef = collection(db, 'inventory');
      const q = query(colRef);
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            let list: ClinicMedicineItem[] = snapshot.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || '',
                category: data.category || 'Medicine',
                stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : parseInt(data.stockQuantity || '0', 10),
                unit: data.unit || 'unit',
                batchNumber: data.batchNumber || '',
                expiryDate: data.expiryDate || '',
                lowStockThreshold: typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : 5,
                notes: data.notes || '',
                businessId: data.businessId || '',
                shopId: data.shopId || '',
                status: data.status || 'active',
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
              };
            });

            if (profile?.role !== 'super_admin') {
              list = list.filter((item) => {
                const matchBiz = targetBizId && item.businessId === targetBizId;
                const matchShop = targetShopId && item.shopId && item.shopId.toUpperCase() === targetShopId.toUpperCase();
                const unassigned = !item.businessId && !item.shopId;
                return Boolean(matchBiz || matchShop || unassigned);
              });
            }

            list.sort((a, b) => a.name.localeCompare(b.name));
            setItems(list);
            setIsLoading(false);
          }
        },
        () => {
          // If Firestore client listener fails, fetchInventory has already fetched authoritatively
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (_) {
      setIsLoading(false);
    }
  }, [targetBizId, targetShopId, profile?.role, fetchInventory]);

  // 2. Filter & Search Logic
  const filtered = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batchNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Reset to first page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Pagination Slicing
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary Metrics
  const totalItemsCount = items.length;
  const lowStockCount = items.filter((i) => i.stockQuantity > 0 && i.stockQuantity <= i.lowStockThreshold).length;
  const outOfStockCount = items.filter((i) => i.stockQuantity <= 0).length;
  const vaccinesCount = items.filter((i) => i.category.toLowerCase() === 'vaccine').length;

  // 3. Handle Add New Medicine
  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Medicine name is required.');
      return;
    }

    const qty = parseInt(formData.stockQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      setFormError('Stock quantity must be 0 or greater.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<{ success: boolean; error?: string; message?: string }>(
        '/api/clinic/inventory',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            category: formData.category,
            stockQuantity: qty,
            unit: formData.unit,
            batchNumber: formData.batchNumber.trim(),
            expiryDate: formData.expiryDate.trim(),
            lowStockThreshold: parseInt(formData.lowStockThreshold, 10) || 5,
            notes: formData.notes.trim(),
            requesterUid: profile?.uid || user?.uid,
            businessId: targetBizId,
            shopId: targetShopId,
          }),
        }
      );

      if (error || !data?.success) {
        setFormError(error || data?.error || 'Failed to add medicine to inventory.');
      } else {
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          category: 'Vaccine',
          stockQuantity: '10',
          unit: 'vial',
          batchNumber: '',
          expiryDate: '',
          lowStockThreshold: '5',
          notes: '',
        });
        fetchInventory();
      }
    } catch (e: any) {
      setFormError(e.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Handle Stock Adjustment
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
        setAdjustError(error || data?.error || 'Failed to adjust stock quantity.');
      } else {
        setAdjustingItem(null);
        fetchInventory();
      }
    } catch (e: any) {
      setAdjustError(e.message || 'An error occurred during adjustment.');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Helper to check if item is expired
  const isItemExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return expiryDate < today;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Medicine & Injection Inventory"
        subtitle={`Track stock levels, vaccine batches, and clinical supplies for ${business?.name || 'Healthy Paws Clinic'} (${targetShopId || 'SHOP-D9E8'}).`}
        action={
          <Button
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Medicine / Vaccine
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-4" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center shrink-0 border border-[#7567E8]/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#737780] uppercase tracking-wider">Total Medicines</p>
            <p className="text-xl font-extrabold text-[#25242A] mt-0.5">{totalItemsCount}</p>
          </div>
        </Card>

        <Card padding="p-4" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
            <Syringe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#737780] uppercase tracking-wider">Core Vaccines</p>
            <p className="text-xl font-extrabold text-[#25242A] mt-0.5">{vaccinesCount}</p>
          </div>
        </Card>

        <Card padding="p-4" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#737780] uppercase tracking-wider">Low Stock</p>
            <p className="text-xl font-extrabold text-amber-600 mt-0.5">{lowStockCount}</p>
          </div>
        </Card>

        <Card padding="p-4" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#737780] uppercase tracking-wider">Out of Stock</p>
            <p className="text-xl font-extrabold text-red-600 mt-0.5">{outOfStockCount}</p>
          </div>
        </Card>
      </div>

      {/* Search & Category Filter */}
      <Card padding="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search by medicine, vaccine, or batch number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#25242A] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
        </div>
      </Card>

      {/* Inventory List (Desktop Table + Mobile Cards) */}
      {isLoading ? (
        <Card padding="p-12" className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-[#7567E8] animate-spin mb-3" />
          <p className="text-xs text-[#737780] font-semibold">Loading real-time clinic inventory...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="p-12" className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto mb-4 border border-[#7567E8]/20">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#25242A]">No Inventory Items Found</h3>
          <p className="text-xs text-[#737780] max-w-sm mx-auto mt-1 leading-relaxed">
            {searchTerm || selectedCategory !== 'All'
              ? 'No medicines match your current search criteria.'
              : 'Add your first vaccine, injection, or medicine to start recording pet treatments.'}
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={() => {
                setFormError('');
                setIsAddModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add First Medicine
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop / Tablet View */}
          <div className="hidden md:block">
            <Card padding="p-0" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E8ECF0] text-[11px] font-extrabold uppercase tracking-wider text-[#737780]">
                      <th className="py-3 px-4">Medicine / Supply</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Batch & Expiry</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8ECF0] text-xs">
                    {paginatedItems.map((item) => {
                      const isLow = item.stockQuantity > 0 && item.stockQuantity <= item.lowStockThreshold;
                      const isOut = item.stockQuantity <= 0;
                      const expired = isItemExpired(item.expiryDate);

                      return (
                        <tr key={item.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#25242A] text-xs">{item.name}</div>
                            {item.notes && (
                              <div className="text-[11px] text-[#737780] truncate max-w-xs">{item.notes}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-md bg-[#F1EEFF] text-[#7567E8] border border-[#7567E8]/20">
                              <Tag className="w-3 h-3" />
                              {item.category}
                            </span>
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
                            <div className="font-extrabold text-sm text-[#25242A]">
                              {item.stockQuantity}{' '}
                              <span className="text-xs font-semibold text-[#737780]">{item.unit}</span>
                            </div>
                            <div className="text-[10px] text-[#737780]">
                              Alert at ≤ {item.lowStockThreshold}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                                <AlertCircle className="w-3 h-3" /> Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> In Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAdjust(item)}
                              icon={<SlidersHorizontal className="w-3.5 h-3.5 text-[#7567E8]" />}
                            >
                              Adjust Stock
                            </Button>
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

              return (
                <Card key={item.id} padding="p-4" className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-[#25242A] text-sm leading-tight">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F1EEFF] text-[#7567E8]">
                          {item.category}
                        </span>
                        {item.batchNumber && (
                          <span className="font-mono text-[10px] font-semibold text-[#737780]">
                            #{item.batchNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {isOut ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                        Out of Stock
                      </span>
                    ) : isLow ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        In Stock
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E8ECF0]">
                    <div>
                      <span className="text-[10px] text-[#737780] block">Available Stock</span>
                      <strong className="text-[#25242A] font-extrabold text-sm">
                        {item.stockQuantity} <span className="text-xs font-semibold text-[#737780]">{item.unit}</span>
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#737780] block">Expiry Date</span>
                      <strong className={`text-xs ${expired ? 'text-red-600 font-bold' : 'text-[#25242A]'}`}>
                        {item.expiryDate || 'Not specified'}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8ECF0]">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-center"
                      onClick={() => handleOpenAdjust(item)}
                      icon={<SlidersHorizontal className="w-3.5 h-3.5 text-[#7567E8]" />}
                    >
                      Adjust Stock
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

      {/* Add Medicine / Vaccine Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Medicine or Injection to Inventory"
        maxWidth="md"
      >
        <form onSubmit={handleCreateMedicine} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">
              Medicine / Vaccine Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Anti-Rabies Vaccine (Nobivac), Amoxicillin 250mg"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2.5 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Current Stock Quantity *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Low-Stock Alert Threshold</label>
              <input
                type="number"
                min="0"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Batch Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. BAT-2026-09"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-mono uppercase text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">Storage / Usage Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Keep refrigerated at 2°C – 8°C. For subcutaneous use only."
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Adding...
                </>
              ) : (
                'Add to Inventory'
              )}
            </Button>
          </div>
        </form>
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
