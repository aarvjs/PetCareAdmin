'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Search,
  AlertTriangle,
  Boxes,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  PackageCheck,
  TrendingDown,
  History,
  Loader2,
  Lock,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Edit,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';

export interface InventoryProduct {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  petType?: string;
  sellingPrice?: number | string;
  mrp?: number | string;
  stock?: number;
  stockQuantity?: number;
  status?: string;
  lowStockThreshold?: number;
  imageUrl?: string;
  image?: string;
  images?: string[];
  isPublished?: boolean;
  shopId?: string;
  businessId?: string;
  createdBy?: string;
  updatedAt?: string;
  lastStockAdjustment?: {
    previousStock: number;
    newStock: number;
    diff: number;
    reason: string;
    adjustedBy?: string;
    timestamp: string;
  };
}

const ADJUSTMENT_REASONS = [
  'Stock Intake / New Shipment Received',
  'Physical Count Audit Correction',
  'Damaged / Expired Goods Discarded',
  'Customer Return Restocked',
  'Store Inventory Rebalancing',
  'Manual Stock Correction',
];

export default function AdminInventoryPage() {
  const { profile, business, user } = useAuth();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Adjust stock modal state
  const [adjustingProduct, setAdjustingProduct] = useState<InventoryProduct | null>(null);
  const [adjustedStock, setAdjustedStock] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(10);
  const [adjustmentReason, setAdjustmentReason] = useState<string>(ADJUSTMENT_REASONS[0]);
  const [customNote, setCustomNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check E-commerce module permission
  const hasEcommerceModule =
    profile?.role === 'super_admin' ||
    (profile?.role === 'admin' && profile?.modules?.includes('ecommerce'));

  // 1. Real-time Firestore sync strictly scoped to Admin's business
  useEffect(() => {
    if (!profile || !hasEcommerceModule) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const targetShopId = profile.shopId || business?.shopId || '';
    const targetBizId = profile.businessId || business?.id || '';
    const currentUid = profile.uid || user?.uid || '';

    try {
      const prodRef = collection(db, 'products');
      const unsubscribe = onSnapshot(
        prodRef,
        (snapshot) => {
          let list: InventoryProduct[] = snapshot.docs.map((d) => {
            const data = d.data();
            const currentStock = typeof data.stock === 'number' ? data.stock : (typeof data.stockQuantity === 'number' ? data.stockQuantity : 0);
            const thresh = typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : 10;
            
            let calcStatus = 'In Stock';
            if (currentStock <= 0) calcStatus = 'Out of Stock';
            else if (currentStock <= thresh) calcStatus = 'Low Stock';

            return {
              id: d.id,
              ...data,
              name: data.name || 'Unnamed Product',
              sku: data.sku || `SKU-${d.id.slice(-6).toUpperCase()}`,
              category: data.category || 'General',
              stock: currentStock,
              stockQuantity: currentStock,
              status: calcStatus,
              lowStockThreshold: thresh,
              imageUrl: data.imageUrl || data.image || (data.images && data.images[0]) || '',
            } as InventoryProduct;
          });

          // Strict Business Scoping with Creator and Legacy Fallback
          if (profile.role === 'admin') {
            list = list.filter((p) => {
              const matchCreator = currentUid && p.createdBy && p.createdBy.toLowerCase() === currentUid.toLowerCase();
              const matchShop = targetShopId && p.shopId && p.shopId.toUpperCase() === targetShopId.toUpperCase();
              const matchBiz = targetBizId && p.businessId && p.businessId === targetBizId;
              const matchUnassigned = (!p.shopId && !p.businessId);
              return Boolean(matchCreator || matchShop || matchBiz || matchUnassigned);
            });
          }

          // Sort by stock ascending (low stock/out of stock prioritized)
          list.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

          setProducts(list);
          setIsLoading(false);
        },
        (err) => {
          console.warn('[Inventory onSnapshot Warning]', err);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Inventory listener setup error:', e);
      setIsLoading(false);
    }
  }, [profile, hasEcommerceModule]);

  // Handle open adjust modal
  const handleOpenAdjustModal = (product: InventoryProduct) => {
    setAdjustingProduct(product);
    setAdjustedStock(product.stock ?? 0);
    setThreshold(product.lowStockThreshold ?? 10);
    setAdjustmentReason(ADJUSTMENT_REASONS[0]);
    setCustomNote('');
    setFeedback(null);
  };

  // Save stock adjustment to Firestore atomically
  const handleSaveStockAdjustment = async () => {
    if (!adjustingProduct) return;
    setIsSaving(true);
    setFeedback(null);

    const prevStock = adjustingProduct.stock ?? 0;
    const newStock = Math.max(0, adjustedStock);
    const diff = newStock - prevStock;
    const thresh = Math.max(1, threshold);

    let newStatus = 'In Stock';
    if (newStock === 0) newStatus = 'Out of Stock';
    else if (newStock <= thresh) newStatus = 'Low Stock';

    const now = new Date().toISOString();
    const adjustmentRecord = {
      previousStock: prevStock,
      newStock,
      diff,
      reason: customNote ? `${adjustmentReason} (${customNote})` : adjustmentReason,
      adjustedBy: profile?.fullName || user?.email || 'Admin',
      timestamp: now,
    };

    try {
      const prodRef = doc(db, 'products', adjustingProduct.id);
      await updateDoc(prodRef, {
        stock: newStock,
        stockQuantity: newStock,
        status: newStatus,
        lowStockThreshold: thresh,
        updatedAt: now,
        lastStockAdjustment: adjustmentRecord,
      });

      // Optional: log to activity_logs collection for audit trail
      try {
        await addDoc(collection(db, 'activity_logs'), {
          actorUid: user?.uid || 'admin',
          actorName: profile?.fullName || 'Admin',
          actorRole: profile?.role || 'admin',
          action: 'INVENTORY_STOCK_UPDATE',
          targetUid: adjustingProduct.id,
          targetName: adjustingProduct.name,
          details: `Stock changed from ${prevStock} to ${newStock} (${diff >= 0 ? `+${diff}` : diff} units). Reason: ${adjustmentRecord.reason}`,
          timestamp: now,
          shopId: profile?.shopId || adjustingProduct.shopId || '',
        });
      } catch (_) {}

      setFeedback({ type: 'success', message: `Stock for "${adjustingProduct.name}" updated to ${newStock} units.` });
      setTimeout(() => {
        setAdjustingProduct(null);
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update stock.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Compute stock metrics
  const totalSkus = products.length;
  const inStockCount = products.filter((p) => (p.stock ?? 0) > (p.lowStockThreshold ?? 10)).length;
  const lowStockCount = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.lowStockThreshold ?? 10)).length;
  const outOfStockCount = products.filter((p) => (p.stock ?? 0) <= 0).length;

  // Distinct categories
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[]))];

  // Filtered product items
  const filteredProducts = products.filter((p) => {
    const sTerm = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !sTerm ||
      p.name.toLowerCase().includes(sTerm) ||
      (p.sku || '').toLowerCase().includes(sTerm) ||
      (p.category || '').toLowerCase().includes(sTerm);

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'In Stock' && (p.stock ?? 0) > (p.lowStockThreshold ?? 10)) ||
      (statusFilter === 'Low Stock' && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.lowStockThreshold ?? 10)) ||
      (statusFilter === 'Out of Stock' && (p.stock ?? 0) <= 0);

    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // If Admin doesn't have E-commerce permission
  if (!isLoading && !hasEcommerceModule) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#25242A]">E-commerce Module Restricted</h2>
        <p className="text-xs text-[#737780] leading-relaxed">
          Your Administrator account is assigned to the <strong>Clinic & Veterinary Module</strong> only.
          Inventory and product management requires the <strong>E-commerce Module</strong> permission.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 bg-[#7567E8] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#6050e4] transition-colors"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Inventory & Stock Control"
          subtitle={`Real-time stock management and low-stock alerts for your business catalog${
            profile?.shopId ? ` (Shop ID: ${profile.shopId})` : ''
          }.`}
        />
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 bg-[#7567E8] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#6050e4] transition-colors shadow-sm shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('All')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'All' ? 'bg-[#F5F3FF] border-[#7567E8] shadow-sm' : 'bg-white border-[#E8ECF0] hover:border-[#DDD6FE]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#737780] uppercase tracking-wider">Total Tracked SKUs</span>
            <Boxes className="w-4 h-4 text-[#7567E8]" />
          </div>
          <p className="text-2xl font-black text-[#25242A]">{totalSkus}</p>
          <p className="text-[10px] text-[#737780] mt-0.5">Catalog products on file</p>
        </div>

        <div
          onClick={() => setStatusFilter('In Stock')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'In Stock' ? 'bg-[#ECFDF5] border-[#10B981] shadow-sm' : 'bg-white border-[#E8ECF0] hover:border-[#A7F3D0]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">In Stock</span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{inStockCount}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Healthy quantity levels</p>
        </div>

        <div
          onClick={() => setStatusFilter('Low Stock')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Low Stock' ? 'bg-[#FFFBEB] border-[#F59E0B] shadow-sm' : 'bg-white border-[#E8ECF0] hover:border-[#FDE68A]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700">{lowStockCount}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">&le; threshold units left</p>
        </div>

        <div
          onClick={() => setStatusFilter('Out of Stock')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'Out of Stock' ? 'bg-[#FEF2F2] border-[#EF4444] shadow-sm' : 'bg-white border-[#E8ECF0] hover:border-[#FECACA]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Out of Stock</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700">{outOfStockCount}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">0 units available</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card padding="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search product name, SKU, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#737780]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A] font-medium"
              >
                <option value="All">All Stock Levels</option>
                <option value="In Stock">In Stock (&gt;10)</option>
                <option value="Low Stock">Low Stock Alert (&le;10)</option>
                <option value="Out of Stock">Out of Stock (0)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#737780]">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A] font-medium"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Inventory Products Table */}
      <Card padding="p-0" className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[#737780] flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#7567E8] mb-3" />
            <p className="text-xs font-semibold">Connecting to live inventory catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-[#737780]">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-[#25242A]">No inventory items found</p>
            <p className="text-xs mt-1">
              {products.length === 0
                ? 'No products have been added to your business catalog yet.'
                : 'No products match your current search and filter criteria.'}
            </p>
            {products.length === 0 && (
              <div className="mt-4">
                <Link
                  href="/admin/products"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7567E8] bg-[#F1EEFF] px-3.5 py-2 rounded-xl hover:bg-[#e4dfff] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Product</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-b border-[#E8ECF0]">
                <tr>
                  <th className="py-3.5 px-4">Product Info</th>
                  <th className="py-3.5 px-4">SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Current Stock</th>
                  <th className="py-3.5 px-4">Threshold</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filteredProducts.map((p) => {
                  const stockNum = p.stock ?? 0;
                  const thresh = p.lowStockThreshold ?? 10;
                  const isOut = stockNum === 0;
                  const isLow = stockNum > 0 && stockNum <= thresh;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isOut ? 'bg-[#FFF1F2]/40 hover:bg-[#FFF1F2]/60' : isLow ? 'bg-[#FFFBEB]/40 hover:bg-[#FFFBEB]/60' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-[#E8ECF0] overflow-hidden shrink-0 flex items-center justify-center relative">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#25242A] line-clamp-1">{p.name}</p>
                            <p className="text-[11px] text-[#737780]">₹{parseFloat((p.sellingPrice || 0).toString()).toFixed(0)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-[#737780] font-semibold">
                        {p.sku || '-'}
                      </td>

                      <td className="py-3 px-4 font-medium text-[#25242A]">
                        {p.category || 'General'}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`font-black text-sm ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {stockNum} units
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#737780] font-medium">
                        Alert at &le;{thresh}
                      </td>

                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B]">
                            <XCircle className="w-3 h-3 text-[#DC2626]" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E]">
                            <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D1FAE5] text-[#065F46]">
                            <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                            In Stock
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAdjustModal(p)}
                          icon={<Edit className="w-3.5 h-3.5 text-[#7567E8]" />}
                          className="text-xs font-bold"
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
        )}
      </Card>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        title={`Adjust Inventory: ${adjustingProduct?.name}`}
        maxWidth="md"
      >
        {adjustingProduct && (
          <div className="space-y-5 text-xs">
            {/* Product Summary Mini Card */}
            <div className="flex items-center gap-3.5 p-3.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E8ECF0] overflow-hidden shrink-0 flex items-center justify-center">
                {adjustingProduct.imageUrl ? (
                  <img src={adjustingProduct.imageUrl} alt={adjustingProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-[#25242A]">{adjustingProduct.name}</p>
                <p className="text-[11px] text-[#737780]">
                  SKU: <span className="font-mono">{adjustingProduct.sku}</span> | Price: ₹{adjustingProduct.sellingPrice}
                </p>
                <p className="text-[11px] text-[#7567E8] font-bold mt-0.5">
                  Current Available Stock: {adjustingProduct.stock} units
                </p>
              </div>
            </div>

            {/* Quick Increment/Decrement Buttons */}
            <div>
              <label className="block font-bold text-[#25242A] mb-2 uppercase text-[10px] tracking-wider">
                Quick Adjust Quantity
              </label>
              <div className="flex flex-wrap gap-2">
                {[+1, +5, +10, +25, +50, -1, -5, -10].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setAdjustedStock((prev) => Math.max(0, prev + delta))}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${
                      delta > 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Quantity & Threshold Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#25242A] mb-1.5">
                  New Total Stock Level <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={adjustedStock}
                  onChange={(e) => setAdjustedStock(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-[#DDD6FE] focus:border-[#7567E8] rounded-xl px-3 py-2 text-sm font-bold text-[#25242A] focus:outline-none"
                />
                <span className="text-[10px] text-[#737780] block mt-1">
                  Change: {adjustedStock - (adjustingProduct.stock ?? 0) >= 0 ? `+${adjustedStock - (adjustingProduct.stock ?? 0)}` : adjustedStock - (adjustingProduct.stock ?? 0)} units
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#25242A] mb-1.5">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 10)}
                  className="w-full bg-white border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-sm font-bold text-[#25242A] focus:outline-none"
                />
                <span className="text-[10px] text-[#737780] block mt-1">
                  Alert triggers when stock &le; this value
                </span>
              </div>
            </div>

            {/* Reason for Adjustment */}
            <div>
              <label className="block font-bold text-[#25242A] mb-1.5">
                Adjustment Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full bg-white border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs font-semibold text-[#25242A] focus:outline-none focus:border-[#7567E8]"
              >
                {ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block font-bold text-[#25242A] mb-1.5">
                Optional Reference / Audit Note
              </label>
              <input
                type="text"
                placeholder="e.g. PO #1084 from supplier or batch write-off"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-white border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none focus:border-[#7567E8]"
              />
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8ECF0]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdjustingProduct(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveStockAdjustment}
                disabled={isSaving}
                className="font-bold text-xs px-5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Updating Stock...
                  </>
                ) : (
                  'Confirm & Save Stock'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
