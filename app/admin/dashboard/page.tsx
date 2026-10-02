'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
} from 'lucide-react';
import { INITIAL_ORDERS, INITIAL_APPOINTMENTS, INITIAL_PRODUCTS } from '@/lib/mockData';

export default function AdminDashboardPage() {
  const stats = [
    { title: 'Total Sales', value: '$14,280.50', change: '+12.5%', icon: <DollarSign className="w-5 h-5 text-[#7567E8]" />, bg: 'bg-[#F1EEFF]' },
    { title: 'Total Orders', value: '1,420', change: '+8.2%', icon: <ShoppingCart className="w-5 h-5 text-[#72CFF2]" />, bg: 'bg-[#EAF8FE]' },
    { title: 'Active Products', value: '148', change: '+4', icon: <ShoppingBag className="w-5 h-5 text-[#35B779]" />, bg: 'bg-[#DFF7EE]' },
    { title: 'Total Customers', value: '890', change: '+18.4%', icon: <Users className="w-5 h-5 text-[#7567E8]" />, bg: 'bg-[#F1EEFF]' },
    { title: 'Appointments', value: '342', change: '+9.1%', icon: <Calendar className="w-5 h-5 text-[#72CFF2]" />, bg: 'bg-[#EAF8FE]' },
    { title: 'Clinic Revenue', value: '$8,950.00', change: '+15.3%', icon: <Sparkles className="w-5 h-5 text-[#35B779]" />, bg: 'bg-[#DFF7EE]' },
  ];

  const lowStockItems = INITIAL_PRODUCTS.filter((p) => p.status === 'Low Stock' || p.stock < 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Real-time performance metrics across Pet Products E-Commerce and Clinic Services."
      />

      {/* Top Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, idx) => (
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Orders Overview Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-[#25242A]">Revenue & Orders Analytics</h3>
              <p className="text-xs text-[#737780]">Monthly overview of product sales vs clinic services</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#7567E8]" /> Product Sales</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#72CFF2]" /> Clinic Revenue</span>
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
                  <div
                    style={{ height: `${d.sales}%` }}
                    className="w-full max-w-[20px] bg-[#7567E8] rounded-t-lg group-hover:bg-[#6253df] transition-all relative"
                  >
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#25242A] text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      ${d.sales * 100}
                    </span>
                  </div>
                  <div
                    style={{ height: `${d.clinic}%` }}
                    className="w-full max-w-[20px] bg-[#72CFF2] rounded-t-lg group-hover:bg-[#5bbfe2] transition-all relative"
                  >
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#25242A] text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      ${d.clinic * 90}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#737780]">{d.month}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Low Stock Warning Card */}
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
            <p className="text-xs text-[#737780] mb-4">Products requiring immediate inventory replenishment.</p>

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
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
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
                    <td className="py-3 px-3 font-bold text-[#25242A]">${ord.amount.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={ord.orderStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Upcoming Appointments */}
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
      </div>
    </div>
  );
}
