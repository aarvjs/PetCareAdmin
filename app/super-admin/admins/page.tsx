'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/authContext';
import { UserStatusBadge } from '@/components/super-admin/UserStatusBadge';
import { ConfirmDialog } from '@/components/super-admin/ConfirmDialog';
import { EmptyState } from '@/components/super-admin/EmptyState';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Power,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShoppingBag,
  Stethoscope,
  Building2,
} from 'lucide-react';
import { logActivity } from '@/lib/auditLogger';

export default function AdminsListPage() {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');

  // Confirmation modal state
  const [selectedAdmin, setSelectedAdmin] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchAdmins = async () => {
    setIsLoading(true);
    const sampleAdmins: UserProfile[] = [
      {
        uid: 'adm-001',
        fullName: 'Vikram Sharma',
        email: 'admin.vikram@petcare.in',
        phone: '+91 98765 43210',
        role: 'admin',
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
      },
      {
        uid: 'adm-002',
        fullName: 'Meera Patel',
        email: 'admin.meera@petcare.in',
        phone: '+91 98765 11223',
        role: 'admin',
        status: 'active',
        createdAt: '2026-02-01T10:00:00Z',
      },
    ];

    try {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: UserProfile[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as UserProfile);
        });
        setAdmins(list);
        setFilteredAdmins(list);
        return;
      }
      setAdmins(sampleAdmins);
      setFilteredAdmins(sampleAdmins);
    } catch (error) {
      setAdmins(sampleAdmins);
      setFilteredAdmins(sampleAdmins);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    let result = [...admins];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.phone && a.phone.includes(q)) ||
          (a.shopId && a.shopId.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((a) => (a.status || 'active') === statusFilter);
    }

    setFilteredAdmins(result);
  }, [searchQuery, statusFilter, admins]);

  const handleStatusChange = async () => {
    if (!selectedAdmin || !actionType) return;
    setIsUpdating(true);

    const newStatus = actionType === 'activate' ? 'active' : 'inactive';

    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: selectedAdmin.uid,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Admin account ${selectedAdmin.fullName} is now ${newStatus}.`);
        await logActivity({
          actorUid: 'super-admin',
          actorName: 'Super Admin',
          actorRole: 'super_admin',
          action: actionType === 'activate' ? 'ACTIVATED_ADMIN' : 'DEACTIVATED_ADMIN',
          targetUid: selectedAdmin.uid,
          targetName: selectedAdmin.fullName,
          targetRole: 'admin',
        });
        await fetchAdmins();
      }
    } catch (error) {
      console.error('Failed to change admin status:', error);
    } finally {
      setIsUpdating(false);
      setSelectedAdmin(null);
      setActionType(null);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#7567E8]" /> Admin Account Management
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Create, edit, activate, deactivate and manage store & clinic administrator privileges.
          </p>
        </div>

        <Link
          href="/super-admin/admins/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Admin
        </Link>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-[#E6F7F0] border border-[#10B981]/20 rounded-xl text-[#10B981] text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4" /> {toastMessage}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E8ECF0] p-4 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or mobile..."
            className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2 text-xs text-[#25242A] font-semibold rounded-xl outline-hidden transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#777980]" />
          <span className="text-xs font-bold text-[#777980]">Status:</span>
          {(['all', 'active', 'inactive', 'suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-[#F1EEFF] text-[#7567E8] border border-[#7567E8]/20'
                  : 'bg-[#FAFCFD] text-[#777980] border border-[#E8ECF0] hover:text-[#25242A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Admins Table */}
      {isLoading ? (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center text-xs text-[#777980] font-medium">
          Loading Admin Accounts...
        </div>
      ) : filteredAdmins.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Admin Accounts Found"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'No admin accounts match your search or filter criteria.'
              : 'There are currently no store or clinic admin accounts registered.'
          }
          actionLabel="Create First Admin"
          onAction={() => (window.location.href = '/super-admin/admins/create')}
        />
      ) : (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFCFD] border-b border-[#E8ECF0] text-[#777980] font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Admin Name</th>
                  <th className="py-3.5 px-4">Shop ID</th>
                  <th className="py-3.5 px-4">Assigned Modules</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filteredAdmins.map((admin) => {
                  const mods = admin.modules || [];
                  const hasEcom =
                    mods.includes('ecommerce') ||
                    (admin.permissions || []).includes('products') ||
                    (admin.permissions || []).includes('p_products') ||
                    mods.length === 0;
                  const hasClinic =
                    mods.includes('clinic') ||
                    (admin.permissions || []).includes('doctors') ||
                    (admin.permissions || []).includes('p_doctors') ||
                    mods.length === 0;

                  return (
                    <tr key={admin.uid} className="hover:bg-[#FAFCFD] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#25242A]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#F1EEFF] text-[#7567E8] font-bold text-xs flex items-center justify-center border border-[#7567E8]/20 shrink-0">
                            {admin.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="block leading-tight">{admin.fullName}</span>
                            <span className="text-[10px] text-[#777980] font-normal">{admin.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {admin.shopId ? (
                          <span className="font-mono font-bold text-[11px] text-[#7567E8] bg-[#F1EEFF] px-2 py-0.5 rounded-md border border-[#7567E8]/20">
                            {admin.shopId}
                          </span>
                        ) : (
                          <span className="text-[#777980] text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {hasEcom && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F7F0] text-[#059669] border border-[#10B981]/20">
                              <ShoppingBag className="w-3 h-3" /> E-commerce
                            </span>
                          )}
                          {hasClinic && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF8FE] text-[#0284C7] border border-[#8ED8F8]/40">
                              <Stethoscope className="w-3 h-3" /> Clinic
                            </span>
                          )}
                          {!hasEcom && !hasClinic && (
                            <span className="text-[10px] text-red-500 font-bold">None</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#777980] font-medium text-[11px]">
                        {admin.phone || 'No phone'}
                      </td>
                      <td className="py-3.5 px-4">
                        <UserStatusBadge status={admin.status || 'active'} />
                      </td>
                      <td className="py-3.5 px-4 text-[#777980] font-medium text-[11px]">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/super-admin/admins/${admin.uid}`}
                          className="p-1.5 text-[#7567E8] hover:bg-[#F1EEFF] rounded-lg transition-colors inline-flex items-center gap-1 font-bold"
                          title="View & Edit Admin"
                        >
                          <Eye className="w-4 h-4" /> View
                        </Link>

                        {(admin.status || 'active') === 'active' ? (
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setActionType('deactivate');
                            }}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Deactivate Account"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setActionType('activate');
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Activate Account"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!selectedAdmin && !!actionType}
        title={`${actionType === 'activate' ? 'Activate' : 'Deactivate'} Admin Account`}
        description={`Are you sure you want to ${actionType} access for ${selectedAdmin?.fullName}? ${
          actionType === 'deactivate' ? 'This user will be blocked from logging into the Admin Portal.' : ''
        }`}
        confirmText={actionType === 'activate' ? 'Activate Admin' : 'Deactivate Admin'}
        isDangerous={actionType === 'deactivate'}
        isLoading={isUpdating}
        onConfirm={handleStatusChange}
        onCancel={() => {
          setSelectedAdmin(null);
          setActionType(null);
        }}
      />
    </div>
  );
}
