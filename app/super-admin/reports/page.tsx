'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/authContext';
import { StatCard } from '@/components/super-admin/StatCard';
import { BarChart3, Users, ShieldCheck, Stethoscope, Calendar, ShoppingBag, Download, RefreshCw } from 'lucide-react';

export default function SuperAdminReportsPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      setUsers(list);
    } catch (e) {
      console.error('Error fetching report data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const activeAdmins = users.filter((u) => u.role === 'admin' && (u.status || 'active') === 'active').length;

  const totalDoctors = users.filter((u) => u.role === 'doctor').length;
  const activeDoctors = users.filter((u) => u.role === 'doctor' && (u.status || 'active') === 'active').length;

  const inactiveUsers = users.filter((u) => u.status === 'inactive' || u.status === 'suspended').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#7567E8]" /> Ecosystem System Reports
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Aggregated analytics on user growth, role distribution, account statuses, and platform health.
          </p>
        </div>

        <button
          onClick={fetchReportData}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FAFCFD] border border-[#E8ECF0] hover:bg-white text-[#25242A] font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-[#7567E8] ${isLoading ? 'animate-spin' : ''}`} /> Refresh Reports
        </button>
      </div>

      {/* Top Stat Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Admin Growth Rate"
          value={isLoading ? '...' : `${totalAdmins} Accounts`}
          subtitle={`${activeAdmins} Active`}
          icon={ShieldCheck}
          trend="+100%"
          accentColor="purple"
        />
        <StatCard
          title="Doctor Growth Rate"
          value={isLoading ? '...' : `${totalDoctors} Accounts`}
          subtitle={`${activeDoctors} Active`}
          icon={Stethoscope}
          trend="+100%"
          accentColor="sky"
        />
        <StatCard
          title="Total Platform Accounts"
          value={isLoading ? '...' : `${users.length} Users`}
          subtitle="All ecosystem roles"
          icon={Users}
          accentColor="emerald"
        />
        <StatCard
          title="Deactivated Accounts"
          value={isLoading ? '...' : `${inactiveUsers} Suspended`}
          subtitle="Restricted access"
          icon={Calendar}
          accentColor="amber"
        />
      </div>

      {/* Role Distribution Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-[#25242A]">Role Distribution Breakdown</h2>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-bold text-[#25242A] mb-1">
                <span>Admins ({totalAdmins})</span>
                <span>{users.length ? Math.round((totalAdmins / users.length) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-[#E8ECF0] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#7567E8] h-full rounded-full transition-all duration-500"
                  style={{ width: `${users.length ? (totalAdmins / users.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-[#25242A] mb-1">
                <span>Doctors ({totalDoctors})</span>
                <span>{users.length ? Math.round((totalDoctors / users.length) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-[#E8ECF0] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0284C7] h-full rounded-full transition-all duration-500"
                  style={{ width: `${users.length ? (totalDoctors / users.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-bold text-[#25242A] mb-1">
                <span>Super Admins ({users.filter((u) => u.role === 'super_admin').length})</span>
                <span>
                  {users.length ? Math.round((users.filter((u) => u.role === 'super_admin').length / users.length) * 100) : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-[#E8ECF0] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      users.length ? (users.filter((u) => u.role === 'super_admin').length / users.length) * 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Portal Operations Summary */}
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-[#25242A]">Ecosystem Operational Status</h2>
          <div className="space-y-3 text-xs font-medium text-[#777980]">
            <div className="p-3 bg-[#FAFCFD] rounded-xl border border-[#E8ECF0] flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#25242A] font-bold">
                <ShoppingBag className="w-4 h-4 text-[#7567E8]" /> Admin Portal (Shop & Clinic Operations)
              </span>
              <span className="text-[#10B981] font-bold">Active</span>
            </div>
            <div className="p-3 bg-[#FAFCFD] rounded-xl border border-[#E8ECF0] flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#25242A] font-bold">
                <Stethoscope className="w-4 h-4 text-[#0284C7]" /> Doctor Portal (Veterinary Consultations)
              </span>
              <span className="text-[#10B981] font-bold">Active</span>
            </div>
            <div className="p-3 bg-[#FAFCFD] rounded-xl border border-[#E8ECF0] flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#25242A] font-bold">
                <Users className="w-4 h-4 text-[#7567E8]" /> Mobile App Client API Endpoint
              </span>
              <span className="text-[#10B981] font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
