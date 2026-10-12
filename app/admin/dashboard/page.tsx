'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/lib/authContext';
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
  ShieldCheck,
  MapPin,
  Mail,
  User,
  Dog,
} from 'lucide-react';
import { INITIAL_ORDERS, INITIAL_APPOINTMENTS, INITIAL_PRODUCTS } from '@/lib/mockData';

export default function AdminDashboardPage() {
  const { profile, business } = useAuth();
  const [copiedShopId, setCopiedShopId] = useState(false);

  const isSuper = profile?.role === 'super_admin';
  const mods = profile?.modules || [];
  const perms = profile?.permissions || [];

  const hasEcommerce =
    isSuper ||
    mods.includes('ecommerce') ||
    perms.includes('products') ||
    perms.includes('p_products') ||
    perms.includes('ALL_ACCESS');

  const hasClinic =
    isSuper ||
    mods.includes('clinic') ||
    perms.includes('doctors') ||
    perms.includes('p_doctors') ||
    perms.includes('ALL_ACCESS');

  const currentShopId = business?.shopId || profile?.shopId || '';
  const currentBusinessName = business?.name || 'Healthy Paws Pet Clinic';

  const handleCopyShopId = () => {
    if (currentShopId) {
      navigator.clipboard.writeText(currentShopId);
      setCopiedShopId(true);
      setTimeout(() => setCopiedShopId(false), 2000);
    }
  };

  // E-commerce metrics
  const ecommerceStats = [
    { title: 'Total Sales', value: '₹1,18,250', change: '+12.5%', icon: <DollarSign className="w-5 h-5 text-[#7567E8]" />, bg: 'bg-[#F1EEFF]' },
    { title: 'Total Orders', value: '1,420', change: '+8.2%', icon: <ShoppingCart className="w-5 h-5 text-[#72CFF2]" />, bg: 'bg-[#EAF8FE]' },
    { title: 'Active Products', value: '148', change: '+4', icon: <ShoppingBag className="w-5 h-5 text-[#35B779]" />, bg: 'bg-[#DFF7EE]' },
    { title: 'Total Customers', value: '890', change: '+18.4%', icon: <Users className="w-5 h-5 text-[#7567E8]" />, bg: 'bg-[#F1EEFF]' },
  ];

  // Clinic metrics
  const clinicStats = [
    { title: 'Appointments', value: '342', change: '+9.1%', icon: <Calendar className="w-5 h-5 text-[#0284C7]" />, bg: 'bg-[#EAF8FE]' },
    { title: 'Clinic Revenue', value: '₹84,500', change: '+15.3%', icon: <Sparkles className="w-5 h-5 text-[#35B779]" />, bg: 'bg-[#DFF7EE]' },
    { title: 'Assigned Doctors', value: '6 Active', change: '+1', icon: <Stethoscope className="w-5 h-5 text-[#7567E8]" />, bg: 'bg-[#F1EEFF]' },
    { title: 'Pets Registered', value: '520', change: '+22.0%', icon: <Dog className="w-5 h-5 text-[#F2B84B]" />, bg: 'bg-[#FEF7EA]' },
  ];

  // Combined stats depending on permissions
  const displayStats = [
    ...(hasEcommerce ? ecommerceStats : []),
    ...(hasClinic ? clinicStats : []),
  ];

  const lowStockItems = INITIAL_PRODUCTS.filter((p) => p.status === 'Low Stock' || p.stock < 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Business Identity Banner */}
      <div className="bg-gradient-to-r from-white via-[#FAF9FF] to-[#F3F1FD] border border-[#E8ECF0] rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {business?.logoUrl ? (
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
                  <span>Admin: <strong className="text-[#25242A]">{profile?.fullName}</strong> ({profile?.email})</span>
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
                  className="p-1.5 bg-white border border-[#E8ECF0] hover:border-[#7567E8] text-[#7567E8] rounded-xl transition-all shadow-2xs"
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

      <PageHeader
        title="Dashboard Overview"
        subtitle={`Real-time operational metrics for ${currentBusinessName}.`}
      />

      {/* Dynamic Statistics Grid */}
      {displayStats.length === 0 ? (
        <Card className="p-8 text-center bg-white border border-[#E8ECF0]">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-sm font-extrabold text-[#25242A]">No Operational Modules Assigned</h3>
            <p className="text-xs text-[#737780]">
              Your administrator account does not currently have permissions for the E-commerce or Clinic modules. Please contact your Super Administrator to enable access.
            </p>
          </div>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${displayStats.length > 4 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-4'} gap-4`}>
          {displayStats.map((stat, idx) => (
            <Card key={idx} padding="p-4" className="hover:border-[#7567E8]/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>{stat.icon}</div>
                <span className="text-[11px] font-extrabold text-[#35B779] bg-[#DFF7EE] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> {stat.change}
                </span>
              </div>
              <p className="text-xs text-[#737780] font-medium">{stat.title}</p>
              <h3 className="text-xl font-extrabold text-[#25242A] mt-1 tracking-tight">{stat.value}</h3>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Orders Overview Chart */}
        <Card className={hasEcommerce ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-[#25242A]">Performance Analytics</h3>
              <p className="text-xs text-[#737780]">
                {hasEcommerce && hasClinic
                  ? 'Monthly overview of product sales vs clinic services'
                  : hasEcommerce
                  ? 'Monthly overview of product sales and fulfillment'
                  : 'Monthly overview of appointments and clinic operations'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              {hasEcommerce && (
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#7567E8]" /> Product Sales</span>
              )}
              {hasClinic && (
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#72CFF2]" /> Clinic Revenue</span>
              )}
            </div>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="h-56 w-full flex items-end justify-between gap-3 pt-4 px-2">
            {[
              { month: 'Apr', sales: 45, clinic: 30 },
              { month: 'May', sales: 60, clinic: 40 },
              { month: 'Jun', sales: 75, clinic: 55 },
              { month: 'Jul', sales: 50, clinic: 42 },
              { month: 'Aug', sales: 85, clinic: 65 },
              { month: 'Sep', sales: 95, clinic: 80 },
            ].map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1.5 h-full">
                  {hasEcommerce && (
                    <div
                      style={{ height: `${d.sales}%` }}
                      className="w-full max-w-[20px] bg-[#7567E8] rounded-t-lg group-hover:bg-[#6253df] transition-all relative"
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#25242A] text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        ₹{d.sales * 1000}
                      </span>
                    </div>
                  )}
                  {hasClinic && (
                    <div
                      style={{ height: `${d.clinic}%` }}
                      className="w-full max-w-[20px] bg-[#72CFF2] rounded-t-lg group-hover:bg-[#5bbfe2] transition-all relative"
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#25242A] text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        ₹{d.clinic * 900}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#737780]">{d.month}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Low Stock Warning Card (E-commerce only) */}
        {hasEcommerce && (
          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#F2B84B]" />
                  <h3 className="text-base font-bold text-[#25242A]">Low Stock Alerts</h3>
                </div>
                <Link href="/admin/inventory" className="text-xs font-bold text-[#7567E8] hover:underline flex items-center gap-1">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-xs text-[#737780] mb-4">Products requiring immediate inventory replenishment for {currentBusinessName}.</p>

              <div className="space-y-3">
                {lowStockItems.map((prod) => (
                  <div key={prod.id} className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#25242A]">{prod.name}</p>
                      <p className="text-[11px] text-[#737780]">SKU: {prod.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-[#E46A6A] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        {prod.stock} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8ECF0] mt-4">
              <Link
                href="/admin/inventory"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#EAF8FE] text-[#7567E8] font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-[#d9f2fc] transition-colors"
              >
                Manage Inventory
              </Link>
            </div>
          </Card>
        )}
      </div>

      {/* Tables Section based on Modules */}
      <div className={`grid grid-cols-1 ${hasEcommerce && hasClinic ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6`}>
        {/* Recent Orders (E-commerce only) */}
        {hasEcommerce && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#25242A]">Recent Shop Orders</h3>
              <Link href="/admin/orders" className="text-xs font-bold text-[#7567E8] hover:underline flex items-center gap-1">
                All Orders <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-y border-[#E8ECF0]">
                  <tr>
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF0]">
                  {INITIAL_ORDERS.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-bold text-[#7567E8]">{ord.id}</td>
                      <td className="py-3 px-3 font-semibold text-[#25242A]">{ord.customerName}</td>
                      <td className="py-3 px-3 font-bold text-[#25242A]">₹{ord.amount.toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={ord.orderStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Upcoming Appointments (Clinic only) */}
        {hasClinic && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#25242A]">Upcoming Clinic Appointments</h3>
              <Link href="/admin/appointments" className="text-xs font-bold text-[#7567E8] hover:underline flex items-center gap-1">
                All Appointments <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-y border-[#E8ECF0]">
                  <tr>
                    <th className="py-2.5 px-3">Pet & Owner</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF0]">
                  {INITIAL_APPOINTMENTS.map((apt) => (
                    <tr key={apt.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3">
                        <p className="font-bold text-[#25242A]">{apt.petName} ({apt.petType})</p>
                        <p className="text-[11px] text-[#737780]">Owner: {apt.ownerName}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#25242A]">{apt.service}</td>
                      <td className="py-3 px-3 text-[#737780] font-semibold">{apt.time}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={apt.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
