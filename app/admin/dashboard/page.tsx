'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/lib/authContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  DollarSign,
  ShoppingCart,
  ShoppingBag,
  Users,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Building2,
  Copy,
  Check,
  Stethoscope,
  MapPin,
  User,
  Dog,
  RefreshCw,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Boxes,
} from 'lucide-react';

interface RealOrder {
  id: string;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount?: number;
  amount?: number;
  status?: string;
  orderStatus?: string;
  shopId?: string;
  businessId?: string;
  createdAt?: any;
  items?: any[];
}

interface RealProduct {
  id: string;
  name?: string;
  sku?: string;
  price?: number;
  stock?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  status?: string;
  isPublished?: boolean;
  shopId?: string;
  businessId?: string;
  createdBy?: string;
  imageUrl?: string;
}

interface RealAppointment {
  id: string;
  petName?: string;
  petType?: string;
  customerName?: string;
  ownerName?: string;
  serviceName?: string;
  service?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  date?: string;
  time?: string;
  status?: string;
  fee?: number;
  amount?: number;
  shopId?: string;
  businessId?: string;
  createdAt?: any;
}

export default function AdminDashboardPage() {
  const { profile, business, user, loading: authLoading } = useAuth();
  const [copiedShopId, setCopiedShopId] = useState(false);

  // Real Database State
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [products, setProducts] = useState<RealProduct[]>([]);
  const [appointments, setAppointments] = useState<RealAppointment[]>([]);
  const [assignedDoctorsCount, setAssignedDoctorsCount] = useState<number>(0);

  // Loading & Error states
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const mods = profile?.modules || [];
  const perms = profile?.permissions || [];

  const hasEcommerce =
    mods.includes('ecommerce') ||
    perms.includes('products') ||
    perms.includes('p_products') ||
    perms.includes('ALL_ACCESS');

  const hasClinic =
    mods.includes('clinic') ||
    perms.includes('doctors') ||
    perms.includes('p_doctors') ||
    perms.includes('ALL_ACCESS');

  const currentShopId = business?.shopId || profile?.shopId || '';
  const currentBusinessName = business?.name || profile?.assignedBusinessName || 'Healthy Paws Pet Clinic';

  const handleCopyShopId = () => {
    if (currentShopId) {
      navigator.clipboard.writeText(currentShopId);
      setCopiedShopId(true);
      setTimeout(() => setCopiedShopId(false), 2000);
    }
  };

  // Helper to format Indian Rupee currency safely
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Safe parse Date from Firestore Timestamp or string
  const parseFirestoreDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (typeof dateVal.toDate === 'function') {
      return dateVal.toDate();
    }
    const parsed = new Date(dateVal);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Real-time Firestore Listeners strictly scoped to the Admin's business
  useEffect(() => {
    if (!profile) return;
    const targetShopId = profile.shopId || business?.shopId || '';
    const targetBizId = profile.businessId || business?.id || '';
    const currentUid = profile.uid || user?.uid || '';

    setDataError(null);
    let unsubOrders = () => {};
    let unsubProducts = () => {};
    let unsubAppointments = () => {};
    let unsubDoctors = () => {};

    // 1. Orders Listener
    if (hasEcommerce) {
      setIsLoadingOrders(true);
      try {
        const ordersRef = collection(db, 'orders');
        unsubOrders = onSnapshot(
          ordersRef,
          (snapshot) => {
            let list: RealOrder[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }));

            // Strict Business Scoping with Legacy Support
            if (profile.role === 'admin') {
              list = list.filter((ord) => {
                const matchShop = targetShopId && ord.shopId && ord.shopId.toUpperCase() === targetShopId.toUpperCase();
                const matchBiz = targetBizId && ord.businessId && ord.businessId === targetBizId;
                const matchUnassigned = (!ord.shopId && !ord.businessId);
                return Boolean(matchShop || matchBiz || matchUnassigned);
              });
            }

            // Sort newest first
            list.sort((a, b) => {
              const timeA = parseFirestoreDate(a.createdAt)?.getTime() || 0;
              const timeB = parseFirestoreDate(b.createdAt)?.getTime() || 0;
              return timeB - timeA;
            });

            setOrders(list);
            setIsLoadingOrders(false);
            setLastRefreshed(new Date());
          },
          (err) => {
            console.warn('[Dashboard Orders Snapshot Error]', err);
            setDataError('Failed to load real-time orders data from database.');
            setIsLoadingOrders(false);
          }
        );
      } catch (e: any) {
        console.warn('Orders listener setup error', e);
        setIsLoadingOrders(false);
      }
    } else {
      setIsLoadingOrders(false);
    }

    // 2. Products Listener
    if (hasEcommerce) {
      setIsLoadingProducts(true);
      try {
        const prodRef = collection(db, 'products');
        unsubProducts = onSnapshot(
          prodRef,
          (snapshot) => {
            let list: RealProduct[] = snapshot.docs.map((d) => {
              const data = d.data();
              const stock =
                typeof data.stock === 'number'
                  ? data.stock
                  : typeof data.stockQuantity === 'number'
                  ? data.stockQuantity
                  : 0;
              const thresh =
                typeof data.lowStockThreshold === 'number'
                  ? data.lowStockThreshold
                  : 10;
              return {
                id: d.id,
                ...data,
                stock,
                stockQuantity: stock,
                lowStockThreshold: thresh,
              } as RealProduct;
            });

            // Strict Business Scoping with Creator & Legacy Fallback
            if (profile.role === 'admin') {
              list = list.filter((p) => {
                const matchCreator = currentUid && p.createdBy && p.createdBy.toLowerCase() === currentUid.toLowerCase();
                const matchShop = targetShopId && p.shopId && p.shopId.toUpperCase() === targetShopId.toUpperCase();
                const matchBiz = targetBizId && p.businessId && p.businessId === targetBizId;
                const matchUnassigned = (!p.shopId && !p.businessId);
                return Boolean(matchCreator || matchShop || matchBiz || matchUnassigned);
              });
            }

            setProducts(list);
            setIsLoadingProducts(false);
            setLastRefreshed(new Date());
          },
          (err) => {
            console.warn('[Dashboard Products Snapshot Error]', err);
            setDataError('Failed to load real-time products data from database.');
            setIsLoadingProducts(false);
          }
        );
      } catch (e: any) {
        console.warn('Products listener setup error', e);
        setIsLoadingProducts(false);
      }
    } else {
      setIsLoadingProducts(false);
    }

    // 3. Appointments & Doctors Listener (Clinic Module)
    if (hasClinic) {
      setIsLoadingAppointments(true);
      try {
        const appRef = collection(db, 'appointments');
        unsubAppointments = onSnapshot(
          appRef,
          (snapshot) => {
            let list: RealAppointment[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }));

            // Strict Business Scoping
            if (profile.role === 'admin' && (targetShopId || targetBizId)) {
              list = list.filter((apt) => {
                const matchShop = targetShopId && apt.shopId === targetShopId;
                const matchBiz = targetBizId && apt.businessId === targetBizId;
                return matchShop || matchBiz;
              });
            }

            // Sort newest first
            list.sort((a, b) => {
              const timeA = parseFirestoreDate(a.createdAt || a.appointmentDate || a.date)?.getTime() || 0;
              const timeB = parseFirestoreDate(b.createdAt || b.appointmentDate || b.date)?.getTime() || 0;
              return timeB - timeA;
            });

            setAppointments(list);
            setIsLoadingAppointments(false);
            setLastRefreshed(new Date());
          },
          (err) => {
            console.warn('[Dashboard Appointments Snapshot Error]', err);
            setIsLoadingAppointments(false);
          }
        );

        // Fetch active assigned doctors
        const usersRef = collection(db, 'users');
        unsubDoctors = onSnapshot(
          usersRef,
          (snapshot) => {
            let docs = snapshot.docs.map((d) => d.data());
            if (profile.role === 'admin' && (targetShopId || targetBizId)) {
              docs = docs.filter((u: any) => {
                const matchRole = u.role === 'doctor';
                const matchShop = targetShopId && u.shopId === targetShopId;
                const matchBiz = targetBizId && u.businessId === targetBizId;
                return matchRole && (matchShop || matchBiz);
              });
            } else {
              docs = docs.filter((u: any) => u.role === 'doctor');
            }
            setAssignedDoctorsCount(docs.length);
          },
          () => {}
        );
      } catch (e: any) {
        console.warn('Appointments listener setup error', e);
        setIsLoadingAppointments(false);
      }
    } else {
      setIsLoadingAppointments(false);
    }

    return () => {
      unsubOrders();
      unsubProducts();
      unsubAppointments();
      unsubDoctors();
    };
  }, [profile, hasEcommerce, hasClinic]);

  // ================= CALCULATED REAL METRICS =================
  const metrics = useMemo(() => {
    // E-commerce Calculations
    const validOrders = orders.filter(
      (o) => !['Cancelled', 'Rejected'].includes(o.status || o.orderStatus || '')
    );

    const totalSales = validOrders.reduce((sum, ord) => {
      const val = typeof ord.totalAmount === 'number' ? ord.totalAmount : ord.amount || 0;
      return sum + val;
    }, 0);

    const totalOrdersCount = orders.length;
    const pendingOrdersCount = orders.filter((o) =>
      ['Placed', 'Pending', 'Processing'].includes(o.status || o.orderStatus || 'Pending')
    ).length;
    const deliveredOrdersCount = orders.filter((o) =>
      ['Delivered', 'Completed'].includes(o.status || o.orderStatus || '')
    ).length;
    const cancelledOrdersCount = orders.filter((o) =>
      ['Cancelled', 'Rejected'].includes(o.status || o.orderStatus || '')
    ).length;

    // Unique customers from real orders
    const uniqueCustomerIds = new Set<string>();
    orders.forEach((o) => {
      const identifier = o.customerEmail || o.customerPhone || o.customerName;
      if (identifier) uniqueCustomerIds.add(identifier.trim().toLowerCase());
    });
    const totalCustomersCount = uniqueCustomerIds.size;

    // Products calculations
    const activeProducts = products.filter(
      (p) => p.isPublished !== false && p.status !== 'Inactive'
    );
    const lowStockItems = products.filter((p) => {
      const stock = p.stock ?? 0;
      const threshold = p.lowStockThreshold ?? 10;
      return stock <= threshold;
    }).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

    const outOfStockCount = lowStockItems.filter((p) => (p.stock ?? 0) <= 0).length;

    // Clinic Calculations
    const totalAppointmentsCount = appointments.length;
    const upcomingAppointmentsCount = appointments.filter((a) =>
      ['Pending', 'Confirmed', 'Scheduled'].includes(a.status || 'Pending')
    ).length;
    const completedAppointmentsCount = appointments.filter((a) =>
      ['Completed', 'Done'].includes(a.status || '')
    ).length;

    const clinicRevenue = appointments
      .filter((a) => !['Cancelled'].includes(a.status || ''))
      .reduce((sum, apt) => {
        const val = typeof apt.fee === 'number' ? apt.fee : apt.amount || 0;
        return sum + val;
      }, 0);

    const uniquePets = new Set<string>();
    appointments.forEach((a) => {
      if (a.petName) uniquePets.add(a.petName.trim().toLowerCase());
    });
    const petsCount = uniquePets.size;

    return {
      totalSales,
      totalOrdersCount,
      pendingOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
      totalCustomersCount,
      totalProductsCount: products.length,
      activeProductsCount: activeProducts.length,
      lowStockItems,
      lowStockCount: lowStockItems.length,
      outOfStockCount,
      totalAppointmentsCount,
      upcomingAppointmentsCount,
      completedAppointmentsCount,
      clinicRevenue,
      petsCount,
    };
  }, [orders, products, appointments]);

  // ================= DYNAMIC 6-MONTH CHART AGGREGATION =================
  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const label = d.toLocaleString('en-US', { month: 'short' });

      // Aggregate real sales for this month
      let salesSum = 0;
      if (hasEcommerce) {
        orders.forEach((ord) => {
          if (['Cancelled', 'Rejected'].includes(ord.status || ord.orderStatus || '')) return;
          const orderDate = parseFirestoreDate(ord.createdAt);
          if (orderDate && orderDate.getFullYear() === year && orderDate.getMonth() === monthIdx) {
            salesSum += typeof ord.totalAmount === 'number' ? ord.totalAmount : ord.amount || 0;
          }
        });
      }

      // Aggregate real clinic revenue for this month
      let clinicSum = 0;
      if (hasClinic) {
        appointments.forEach((apt) => {
          if (['Cancelled'].includes(apt.status || '')) return;
          const aptDate = parseFirestoreDate(apt.createdAt || apt.appointmentDate || apt.date);
          if (aptDate && aptDate.getFullYear() === year && aptDate.getMonth() === monthIdx) {
            clinicSum += typeof apt.fee === 'number' ? apt.fee : apt.amount || 0;
          }
        });
      }

      months.push({
        label,
        year,
        sales: salesSum,
        clinic: clinicSum,
      });
    }

    const maxSales = Math.max(...months.map((m) => m.sales), 1);
    const maxClinic = Math.max(...months.map((m) => m.clinic), 1);
    const overallMax = Math.max(maxSales, maxClinic);

    const hasAnySales = months.some((m) => m.sales > 0 || m.clinic > 0);

    return {
      months,
      overallMax,
      hasAnySales,
    };
  }, [orders, appointments, hasEcommerce, hasClinic]);

  const isLoadingTotal = authLoading || (hasEcommerce && (isLoadingOrders || isLoadingProducts)) || (hasClinic && isLoadingAppointments);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Business Identity Banner */}
      <div className="bg-gradient-to-r from-white via-[#FAF9FF] to-[#F3F1FD] border border-[#E8ECF0] rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {business?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt={currentBusinessName}
                className="w-14 h-14 rounded-2xl object-cover border border-[#E8ECF0] shadow-xs shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7567E8] to-[#72CFF2] flex items-center justify-center text-white shadow-xs shrink-0">
                <Building2 className="w-7 h-7" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-[#25242A] tracking-tight truncate">
                  {currentBusinessName}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#10B981] bg-[#E6F7F0] px-2.5 py-0.5 rounded-full border border-[#10B981]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Active Clinic
                </span>
              </div>

              <div className="flex items-center gap-2.5 mt-1.5 text-xs text-[#777980] flex-wrap">
                <div className="flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5 text-[#7567E8]" />
                  <span>
                    Admin: <strong className="text-[#25242A]">{profile?.fullName}</strong> ({profile?.email})
                  </span>
                </div>
                {business?.city && (
                  <div className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#737780]" />
                    <span>{business.city}, {business.state || 'India'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shop ID & Module Access Controls */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-2.5 shrink-0">
            {currentShopId && (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-white border border-[#7567E8]/30 rounded-xl shadow-2xs flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7567E8]">
                    Permanent Shop ID:
                  </span>
                  <span className="font-mono font-black text-xs text-[#25242A] tracking-wider">
                    {currentShopId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShopId}
                  title="Copy Shop ID"
                  className="p-1.5 bg-white border border-[#E8ECF0] hover:border-[#7567E8] text-[#7567E8] rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  {copiedShopId ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-[#737780] mr-0.5">Assigned Modules:</span>
              {hasEcommerce && (
                <span className="text-[10px] font-extrabold text-[#7567E8] bg-[#F1EEFF] px-2.5 py-0.5 rounded-full border border-[#7567E8]/20 flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" /> E-commerce
                </span>
              )}
              {hasClinic && (
                <span className="text-[10px] font-extrabold text-[#0284C7] bg-[#EAF8FE] px-2.5 py-0.5 rounded-full border border-[#0284C7]/20 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" /> Clinic / Doctor
                </span>
              )}
              {!hasEcommerce && !hasClinic && (
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  None (Restricted Access)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Operational Dashboard"
          subtitle={`Verified real-time database metrics for ${currentBusinessName}.`}
        />

        <div className="flex items-center gap-3 self-start sm:self-center">
          <span className="text-[11px] text-[#737780] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            Live Firestore Sync
          </span>
          <span className="text-[11px] text-[#737780] font-mono">
            {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Error Banner if any query failed */}
      {dataError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-700 font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{dataError}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-white border border-red-300 rounded-lg hover:bg-red-50 text-red-700 font-bold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoadingTotal ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding="p-5" className="animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-100" />
                <div className="w-16 h-4 bg-slate-100 rounded-full" />
              </div>
              <div className="w-24 h-3 bg-slate-100 rounded" />
              <div className="w-32 h-6 bg-slate-100 rounded" />
            </Card>
          ))}
        </div>
      ) : !hasEcommerce && !hasClinic ? (
        <Card className="p-8 text-center bg-white border border-[#E8ECF0]">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-sm font-extrabold text-[#25242A]">No Operational Modules Assigned</h3>
            <p className="text-xs text-[#737780]">
              Your administrator account does not currently have permissions for the E-commerce or Clinic modules. Please contact your Super Administrator to enable access.
            </p>
          </div>
        </Card>
      ) : (
        /* Dynamic Statistics Grid Calculated from Real Records */
        <div className="space-y-4">
          {/* E-commerce Stats Section */}
          {hasEcommerce && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-[#7567E8]" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#737780]">
                  E-Commerce Metrics
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Real Sales / Revenue */}
                <Card padding="p-5" className="hover:border-[#7567E8]/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-[#F1EEFF] text-[#7567E8]">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#10B981] bg-[#DFF7EE] px-2 py-0.5 rounded-full border border-[#10B981]/20">
                      {metrics.deliveredOrdersCount} Completed
                    </span>
                  </div>
                  <p className="text-xs text-[#737780] font-medium">Total Shop Sales</p>
                  <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">
                    {formatCurrency(metrics.totalSales)}
                  </h3>
                  <p className="text-[11px] text-[#737780] mt-1.5">
                    From {metrics.totalOrdersCount - metrics.cancelledOrdersCount} valid orders
                  </p>
                </Card>

                {/* 2. Real Orders Count */}
                <Card padding="p-5" className="hover:border-[#72CFF2]/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-[#EAF8FE] text-[#0284C7]">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    {metrics.pendingOrdersCount > 0 ? (
                      <span className="text-[11px] font-extrabold text-[#D97706] bg-[#FFF8E6] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                        {metrics.pendingOrdersCount} Pending
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#737780] bg-slate-100 px-2 py-0.5 rounded-full">
                        Up to date
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#737780] font-medium">Total Orders Placed</p>
                  <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">
                    {metrics.totalOrdersCount}
                  </h3>
                  <p className="text-[11px] text-[#737780] mt-1.5">
                    {metrics.deliveredOrdersCount} delivered · {metrics.cancelledOrdersCount} cancelled
                  </p>
                </Card>

                {/* 3. Real Active Products */}
                <Card padding="p-5" className="hover:border-[#10B981]/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-[#DFF7EE] text-[#10B981]">
                      <Package className="w-5 h-5" />
                    </div>
                    {metrics.lowStockCount > 0 ? (
                      <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {metrics.lowStockCount} Low Stock
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-[#10B981] bg-[#DFF7EE] px-2 py-0.5 rounded-full">
                        Healthy Stock
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#737780] font-medium">Published Products</p>
                  <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">
                    {metrics.activeProductsCount}
                  </h3>
                  <p className="text-[11px] text-[#737780] mt-1.5">
                    {metrics.totalProductsCount} total in business catalog
                  </p>
                </Card>

                {/* 4. Real Total Customers */}
                <Card padding="p-5" className="hover:border-[#7567E8]/40 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-[#F1EEFF] text-[#7567E8]">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#7567E8] bg-[#F1EEFF] px-2 py-0.5 rounded-full border border-[#7567E8]/20">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-[#737780] font-medium">Unique Buyers</p>
                  <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">
                    {metrics.totalCustomersCount}
                  </h3>
                  <p className="text-[11px] text-[#737780] mt-1.5">
                    Registered pet parents who purchased
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* Clinic Stats Section (If Clinic Module Enabled) */}
          {hasClinic && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4 text-[#0284C7]" />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#737780]">
                  Clinic & Doctor Operations
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Appointments */}
                <Card padding="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-[#EAF8FE] text-[#0284C7]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    {metrics.upcomingAppointmentsCount > 0 && (
                      <span className="text-[11px] font-bold text-[#0284C7] bg-[#EAF8FE] px-2 py-0.5 rounded-full">
                        {metrics.upcomingAppointmentsCount} Upcoming
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#737780] font-medium">Total Bookings</p>
                  <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">
                    {metrics.totalAppointmentsCount}
                  </h3>
                  <p className="text-[11px] text-[#737780] mt-1.5">
                    {metrics.completedAppointmentsCount} completed consultations
                  </p>
                </Card>

                {/* 2. Clinic Revenue */}
                <Card padding="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-[#DFF7EE] text-[#10B981]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#10B981] bg-[#DFF7EE] px-2 py-0.5 rounded-full">
                      Services
                    </span>
                  </div>
                  <p className="text-xs text-[#737780] font-medium">Clinic Services Revenue</p>
                  <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">
                    {formatCurrency(metrics.clinicRevenue)}
                  </h3>
                  <p className="text-[11px] text-[#737780] mt-1.5">
                    From completed clinical consultations
                  </p>
                </Card>

                {/* 3. Assigned Doctors */}
                <Card padding="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-[#F1EEFF] text-[#7567E8]">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#7567E8] bg-[#F1EEFF] px-2 py-0.5 rounded-full">
                      Staff
                    </span>
                  </div>
                  <p className="text-xs text-[#737780] font-medium">Assigned Doctors</p>
                  <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">
                    {assignedDoctorsCount} Active
                  </h3>
                  <p className="text-[11px] text-[#737780] mt-1.5">
                    Authorized veterinary specialists
                  </p>
                </Card>

                {/* 4. Registered Pets */}
                <Card padding="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-[#FEF7EA] text-[#F59E0B]">
                      <Dog className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-[#F59E0B] bg-[#FEF7EA] px-2 py-0.5 rounded-full">
                      Patients
                    </span>
                  </div>
                  <p className="text-xs text-[#737780] font-medium">Registered Patients</p>
                  <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">
                    {metrics.petsCount}
                  </h3>
                  <p className="text-[11px] text-[#737780] mt-1.5">
                    Pets treated at this facility
                  </p>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics & Inventory Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Monthly Performance Chart (Calculated from Real Database) */}
        <Card className={hasEcommerce ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-[#25242A]">Monthly Revenue Trends</h3>
              <p className="text-xs text-[#737780] mt-0.5">
                Calculated from actual completed order records over the rolling 6-month window.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              {hasEcommerce && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#7567E8]" />
                  Product Sales
                </span>
              )}
              {hasClinic && (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#72CFF2]" />
                  Clinic Revenue
                </span>
              )}
            </div>
          </div>

          {!chartData.hasAnySales ? (
            <div className="h-56 w-full flex flex-col items-center justify-center p-6 text-center border border-dashed border-[#E8ECF0] rounded-2xl bg-[#F8FAFC]">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8ECF0] flex items-center justify-center text-[#737780] mb-2 shadow-2xs">
                <TrendingUp className="w-6 h-6 text-[#7567E8]" />
              </div>
              <h4 className="text-xs font-bold text-[#25242A]">No Sales History in this Period</h4>
              <p className="text-[11px] text-[#737780] mt-1 max-w-xs">
                When completed customer orders or clinic bookings are placed for {currentShopId || 'this business'}, real-time monthly bars will appear here.
              </p>
            </div>
          ) : (
            /* True SVG/CSS Proportional Bar Chart */
            <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 px-2">
              {chartData.months.map((d, i) => {
                const salesHeightPct = chartData.overallMax > 0 ? (d.sales / chartData.overallMax) * 100 : 0;
                const clinicHeightPct = chartData.overallMax > 0 ? (d.clinic / chartData.overallMax) * 100 : 0;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      {hasEcommerce && (
                        <div
                          style={{ height: `${Math.max(salesHeightPct, d.sales > 0 ? 6 : 0)}%` }}
                          className={`w-full max-w-[24px] ${d.sales > 0 ? 'bg-[#7567E8] hover:bg-[#6253df]' : 'bg-slate-100'} rounded-t-lg transition-all relative cursor-pointer`}
                        >
                          {d.sales > 0 && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#25242A] text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md pointer-events-none">
                              {formatCurrency(d.sales)}
                            </span>
                          )}
                        </div>
                      )}
                      {hasClinic && (
                        <div
                          style={{ height: `${Math.max(clinicHeightPct, d.clinic > 0 ? 6 : 0)}%` }}
                          className={`w-full max-w-[24px] ${d.clinic > 0 ? 'bg-[#72CFF2] hover:bg-[#5bbfe2]' : 'bg-slate-100'} rounded-t-lg transition-all relative cursor-pointer`}
                        >
                          {d.clinic > 0 && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#25242A] text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md pointer-events-none">
                              {formatCurrency(d.clinic)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-[#737780]">{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Real Low Stock Alerts Card (E-commerce only) */}
        {hasEcommerce && (
          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                  <h3 className="text-base font-bold text-[#25242A]">Inventory Stock Alerts</h3>
                </div>
                <Link
                  href="/admin/inventory"
                  className="text-xs font-bold text-[#7567E8] hover:underline flex items-center gap-1"
                >
                  Manage <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <p className="text-xs text-[#737780] mb-4">
                Live products in your database requiring inventory replenishment.
              </p>

              {metrics.lowStockItems.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-[#E8ECF0] rounded-2xl bg-[#F8FAFC]">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#25242A]">All Products Well Stocked</p>
                  <p className="text-[11px] text-[#737780] mt-1">
                    No products have fallen below their configured low-stock threshold.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metrics.lowStockItems.slice(0, 5).map((prod) => {
                    const currentStock = prod.stock ?? 0;
                    const isOut = currentStock <= 0;
                    return (
                      <div
                        key={prod.id}
                        className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#25242A] truncate">{prod.name}</p>
                          <p className="text-[11px] font-mono text-[#737780] truncate">
                            SKU: {prod.sku || prod.id.slice(-6).toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                              isOut
                                ? 'bg-red-50 text-[#EF4444] border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : `${currentStock} left`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E8ECF0] mt-4">
              <Link
                href="/admin/inventory"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#F1EEFF] text-[#7567E8] font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-[#e4ddfe] transition-colors"
              >
                <Boxes className="w-4 h-4" /> Open Full Inventory Manager
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Order Status Distribution & Real Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Order Status Distribution Bar */}
        {hasEcommerce && (
          <Card className="lg:col-span-1">
            <h3 className="text-base font-bold text-[#25242A] mb-1">Order Status Breakdown</h3>
            <p className="text-xs text-[#737780] mb-4">
              Distribution of all {metrics.totalOrdersCount} shop orders.
            </p>

            {metrics.totalOrdersCount === 0 ? (
              <div className="py-8 text-center text-xs text-[#737780]">
                No orders placed yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Placed / Pending */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#D97706] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Placed / Pending
                    </span>
                    <span className="text-[#25242A]">
                      {metrics.pendingOrdersCount} (
                      {Math.round((metrics.pendingOrdersCount / metrics.totalOrdersCount) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#E8ECF0] h-2 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${(metrics.pendingOrdersCount / metrics.totalOrdersCount) * 100}%`,
                      }}
                      className="bg-[#F59E0B] h-full rounded-full transition-all"
                    />
                  </div>
                </div>

                {/* Delivered */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#10B981] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Delivered / Fulfilled
                    </span>
                    <span className="text-[#25242A]">
                      {metrics.deliveredOrdersCount} (
                      {Math.round((metrics.deliveredOrdersCount / metrics.totalOrdersCount) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#E8ECF0] h-2 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${(metrics.deliveredOrdersCount / metrics.totalOrdersCount) * 100}%`,
                      }}
                      className="bg-[#10B981] h-full rounded-full transition-all"
                    />
                  </div>
                </div>

                {/* Cancelled */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-[#EF4444] flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Cancelled / Rejected
                    </span>
                    <span className="text-[#25242A]">
                      {metrics.cancelledOrdersCount} (
                      {Math.round((metrics.cancelledOrdersCount / metrics.totalOrdersCount) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#E8ECF0] h-2 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${(metrics.cancelledOrdersCount / metrics.totalOrdersCount) * 100}%`,
                      }}
                      className="bg-[#EF4444] h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Real Recent Orders Table */}
        {hasEcommerce && (
          <Card className={hasEcommerce ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#25242A]">Recent Shop Orders</h3>
                <p className="text-xs text-[#737780]">Live feed of recent purchases for {currentShopId || 'this business'}.</p>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-[#7567E8] hover:underline flex items-center gap-1"
              >
                All Orders <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-y border-[#E8ECF0]">
                  <tr>
                    <th className="py-2.5 px-3">Order Code</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF0]">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#737780] text-xs">
                        No orders recorded yet. As customers check out in the app, their orders will appear here.
                      </td>
                    </tr>
                  ) : (
                    orders.slice(0, 5).map((ord) => {
                      const orderCode = ord.orderId || `#${ord.id.slice(-6).toUpperCase()}`;
                      const amount = typeof ord.totalAmount === 'number' ? ord.totalAmount : ord.amount || 0;
                      const status = ord.status || ord.orderStatus || 'Placed';
                      return (
                        <tr key={ord.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#7567E8]">{orderCode}</td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-[#25242A]">{ord.customerName || 'Customer'}</p>
                            {ord.customerEmail && (
                              <p className="text-[10px] text-[#737780]">{ord.customerEmail}</p>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#25242A]">{formatCurrency(amount)}</td>
                          <td className="py-3 px-3">
                            <StatusBadge status={status} />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              href="/admin/orders"
                              className="text-[11px] font-bold text-[#7567E8] hover:underline"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Upcoming Appointments Table (Clinic Module Only) */}
      {hasClinic && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#25242A]">Upcoming Clinic Appointments</h3>
              <p className="text-xs text-[#737780]">Registered pet consultations and surgical bookings.</p>
            </div>
            <Link
              href="/admin/appointments"
              className="text-xs font-bold text-[#7567E8] hover:underline flex items-center gap-1"
            >
              All Appointments <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-y border-[#E8ECF0]">
                <tr>
                  <th className="py-2.5 px-3">Pet & Parent</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#737780] text-xs">
                      No clinical appointments scheduled yet.
                    </td>
                  </tr>
                ) : (
                  appointments.slice(0, 5).map((apt) => (
                    <tr key={apt.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-[#25242A]">
                          {apt.petName || 'Pet'} ({apt.petType || 'Pet'})
                        </p>
                        <p className="text-[11px] text-[#737780]">
                          Owner: {apt.customerName || apt.ownerName || 'Pet Parent'}
                        </p>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#25242A]">
                        {apt.serviceName || apt.service || 'General Consultation'}
                      </td>
                      <td className="py-3 px-3 text-[#737780] font-semibold">
                        {apt.appointmentDate || apt.date || 'Today'}, {apt.appointmentTime || apt.time || 'TBD'}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={apt.status || 'Pending'} />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href="/admin/appointments"
                          className="text-[11px] font-bold text-[#7567E8] hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
