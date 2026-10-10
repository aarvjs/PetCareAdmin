'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/authContext';
import { StatCard } from '@/components/super-admin/StatCard';
import { UserStatusBadge } from '@/components/super-admin/UserStatusBadge';
import { EmptyState } from '@/components/super-admin/EmptyState';
import {
  ShieldCheck,
  Stethoscope,
  Users,
  Activity,
  Plus,
  ArrowRight,
  KeyRound,
  FileText,
  CheckCircle2,
  Server,
  Database,
  Lock,
  Sparkles,
  Info,
} from 'lucide-react';

const SAMPLE_USERS: UserProfile[] = [
  {
    uid: 'adm-001',
    fullName: 'Vikram Sharma',
    email: 'admin.vikram@petcare.in',
    phone: '+91 98765 43210',
    role: 'admin',
    status: 'active',
  },
  {
    uid: 'adm-002',
    fullName: 'Meera Patel',
    email: 'admin.meera@petcare.in',
    phone: '+91 98765 11223',
    role: 'admin',
    status: 'active',
  },
  {
    uid: 'doc-001',
    fullName: 'Dr. Ananya Sharma',
    email: 'dr.ananya@healthypaws.in',
    phone: '+91 94150 11223',
    role: 'doctor',
    specialization: 'Small Animal Surgery & Care',
    qualification: 'BVSc & AH, MVSc',
    status: 'active',
  },
  {
    uid: 'doc-002',
    fullName: 'Dr. Rajesh Kumar',
    email: 'dr.rajesh@healthypaws.in',
    phone: '+91 94150 44556',
    role: 'doctor',
    specialization: 'Veterinary Cardiology',
    qualification: 'BVSc & AH',
    status: 'active',
  },
];

const SAMPLE_LOGS = [
  {
    id: 'log-1',
    action: 'SUPER_ADMIN_LOGIN',
    actorName: 'Super Admin',
    actorRole: 'super_admin',
    timestamp: null,
  },
  {
    id: 'log-2',
    action: 'ADMIN_ROSTER_VIEWED',
    actorName: 'Super Admin',
    actorRole: 'super_admin',
    timestamp: null,
  },
];

export default function SuperAdminDashboardPage() {
  const [usersList, setUsersList] = useState<UserProfile[]>(SAMPLE_USERS);
  const [activityLogs, setActivityLogs] = useState<any[]>(SAMPLE_LOGS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        if (!usersSnap.empty) {
          const usersData: UserProfile[] = [];
          usersSnap.forEach((docSnap) => {
            usersData.push(docSnap.data() as UserProfile);
          });
          setUsersList(usersData);
        }

        try {
          const logsQuery = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(5));
          const logsSnap = await getDocs(logsQuery);
          if (!logsSnap.empty) {
            const logs: any[] = [];
            logsSnap.forEach((docSnap) => {
              logs.push({ id: docSnap.id, ...docSnap.data() });
            });
            setActivityLogs(logs);
          }
        } catch (e) {
          // Fall back to sample UI logs if query fails
        }
      } catch (error) {
        // Fall back gracefully to sample UI preview data if Firestore is uninitialized
      }
    }

    loadDashboardData();
  }, []);

  const totalAdmins = usersList.filter((u) => u.role === 'admin').length;
  const activeAdmins = usersList.filter((u) => u.role === 'admin' && (u.status || 'active') === 'active').length;

  const totalDoctors = usersList.filter((u) => u.role === 'doctor').length;
  const activeDoctors = usersList.filter((u) => u.role === 'doctor' && (u.status || 'active') === 'active').length;

  const totalUsers = usersList.length;
  const activeSessions = usersList.filter((u) => (u.status || 'active') === 'active').length;

  const recentAdmins = usersList.filter((u) => u.role === 'admin').slice(0, 4);
  const recentDoctors = usersList.filter((u) => u.role === 'doctor').slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#7567E8] to-[#8ED8F8] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 backdrop-blur-3xl transform skew-x-12 translate-x-10 pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" /> Healthy Paws Ecosystem Control Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Super Admin Control Portal
          </h1>
          <p className="text-xs sm:text-sm text-white/90 max-w-xl font-medium leading-relaxed">
            Manage admin accounts, doctor credentials, permissions, and security monitoring from one central workspace.
          </p>
        </div>
      </div>

      {/* Mode Info Notice */}
      <div className="p-3.5 bg-[#EAF8FE] border border-[#8ED8F8]/40 rounded-2xl text-xs text-[#0284C7] font-semibold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>Super Admin Frontend UI active. Registration & Login UI flows are completely functional.</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/super-admin-login"
            className="px-2.5 py-1 bg-white border border-[#0284C7]/20 rounded-lg text-[11px] font-bold text-[#0284C7] hover:bg-[#EAF8FE]"
          >
            Super Admin Login UI
          </Link>
          <Link
            href="/super-admin-register"
            className="px-2.5 py-1 bg-[#7567E8] text-white rounded-lg text-[11px] font-bold hover:bg-[#6354D6]"
          >
            Super Admin Register UI
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Admins"
          value={isLoading ? '...' : totalAdmins}
          subtitle={`${activeAdmins} Active Admins`}
          icon={ShieldCheck}
          trend="+100%"
          accentColor="purple"
        />
        <StatCard
          title="Total Doctors"
          value={isLoading ? '...' : totalDoctors}
          subtitle={`${activeDoctors} Active Doctors`}
          icon={Stethoscope}
          trend="+100%"
          accentColor="sky"
        />
        <StatCard
          title="Total Accounts"
          value={isLoading ? '...' : totalUsers}
          subtitle="All ecosystem roles"
          icon={Users}
          accentColor="emerald"
        />
        <StatCard
          title="Active Sessions"
          value={isLoading ? '...' : activeSessions}
          subtitle="System status normal"
          icon={Activity}
          accentColor="amber"
        />
      </div>

      {/* Quick Action Bar */}
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#777980]">
          Super Admin Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/super-admin/admins/create"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E8ECF0] hover:border-[#7567E8]/40 hover:bg-[#F1EEFF]/50 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#25242A] group-hover:text-[#7567E8]">Create Admin</p>
              <p className="text-[10px] text-[#777980]">Add new store/clinic admin</p>
            </div>
          </Link>

          <Link
            href="/super-admin/doctors/create"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E8ECF0] hover:border-[#8ED8F8]/60 hover:bg-[#EAF8FE]/50 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#EAF8FE] text-[#0284C7] flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#25242A] group-hover:text-[#0284C7]">Create Doctor</p>
              <p className="text-[10px] text-[#777980]">Register vet practitioner</p>
            </div>
          </Link>

          <Link
            href="/super-admin/permissions"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E8ECF0] hover:border-[#7567E8]/40 hover:bg-[#F1EEFF]/50 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#25242A] group-hover:text-[#7567E8]">Manage Permissions</p>
              <p className="text-[10px] text-[#777980]">Configure role matrices</p>
            </div>
          </Link>

          <Link
            href="/super-admin/activity-logs"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E8ECF0] hover:border-slate-300 hover:bg-[#FAFCFD] transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#25242A] group-hover:text-slate-800">Activity Logs</p>
              <p className="text-[10px] text-[#777980]">View audit trail events</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Account Highlights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admin Accounts Summary */}
          <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#7567E8]" />
                <h2 className="text-sm font-extrabold text-[#25242A]">Admin Accounts</h2>
              </div>
              <Link
                href="/super-admin/admins"
                className="text-xs font-bold text-[#7567E8] hover:underline flex items-center gap-1"
              >
                <span>View All ({totalAdmins})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentAdmins.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No Admin Accounts Found"
                description="Get started by creating your first store or clinic administrator."
                actionLabel="Create Admin"
                onAction={() => (window.location.href = '/super-admin/admins/create')}
              />
            ) : (
              <div className="divide-y divide-[#E8ECF0]">
                {recentAdmins.map((admin) => (
                  <div key={admin.uid} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#F1EEFF] text-[#7567E8] font-bold text-xs flex items-center justify-center border border-[#7567E8]/20">
                        {(admin.fullName || admin.email || 'Admin').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#25242A]">{admin.fullName}</p>
                        <p className="text-[11px] text-[#777980]">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <UserStatusBadge status={admin.status || 'active'} />
                      <Link
                        href={`/super-admin/admins/${admin.uid}`}
                        className="p-1.5 text-[#777980] hover:text-[#7567E8] hover:bg-[#F1EEFF] rounded-lg transition-colors text-xs font-semibold"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doctor Accounts Summary */}
          <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-[#0284C7]" />
                <h2 className="text-sm font-extrabold text-[#25242A]">Doctor Accounts</h2>
              </div>
              <Link
                href="/super-admin/doctors"
                className="text-xs font-bold text-[#0284C7] hover:underline flex items-center gap-1"
              >
                <span>View All ({totalDoctors})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentDoctors.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="No Doctor Accounts Found"
                description="Doctor accounts are created and managed by authorized Clinic Admins."
              />
            ) : (
              <div className="divide-y divide-[#E8ECF0]">
                {recentDoctors.map((doc) => (
                  <div key={doc.uid} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#EAF8FE] text-[#0284C7] font-bold text-xs flex items-center justify-center border border-[#0284C7]/20">
                        {(doc.fullName || doc.email || 'Doctor').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#25242A]">{doc.fullName}</p>
                        <p className="text-[11px] text-[#777980]">
                          {doc.specialization || doc.qualification || doc.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <UserStatusBadge status={doc.status || 'active'} />
                      <Link
                        href={`/super-admin/doctors/${doc.uid}`}
                        className="p-1.5 text-[#777980] hover:text-[#0284C7] hover:bg-[#EAF8FE] rounded-lg transition-colors text-xs font-semibold"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: System Health & Audit */}
        <div className="space-y-6">
          {/* System Health Status */}
          <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#7567E8]" /> System Health
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-[#10B981]" />
                  <span className="font-semibold text-[#25242A]">Frontend UI Portal</span>
                </div>
                <span className="text-[#10B981] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-[#7567E8]" />
                  <span className="font-semibold text-[#25242A]">Backend Integration</span>
                </div>
                <span className="text-[#7567E8] font-bold flex items-center gap-1">
                  Pending Next Phase
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span className="font-semibold text-[#25242A]">Client Validation</span>
                </div>
                <span className="text-[#10B981] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              </div>
            </div>
          </div>

          {/* Recent Audit Logs */}
          <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#7567E8]" /> Activity Audit
              </h2>
              <Link href="/super-admin/activity-logs" className="text-xs font-bold text-[#7567E8] hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {activityLogs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#25242A]">{log.action}</span>
                    <span className="text-[10px] text-[#777980]">UI Preview</span>
                  </div>
                  <p className="text-[11px] text-[#777980]">{log.actorName} ({log.actorRole})</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
