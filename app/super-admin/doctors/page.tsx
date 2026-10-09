'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/authContext';
import { UserStatusBadge } from '@/components/super-admin/UserStatusBadge';
import { ConfirmDialog } from '@/components/super-admin/ConfirmDialog';
import { EmptyState } from '@/components/super-admin/EmptyState';
import {
  Stethoscope,
  Plus,
  Search,
  Filter,
  Eye,
  Power,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { logActivity } from '@/lib/auditLogger';

export default function DoctorsListPage() {
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');

  const [selectedDoctor, setSelectedDoctor] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      setDoctors(list);
      setFilteredDoctors(list);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    let result = [...doctors];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          (d.specialization && d.specialization.toLowerCase().includes(q)) ||
          (d.phone && d.phone.includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((d) => (d.status || 'active') === statusFilter);
    }

    setFilteredDoctors(result);
  }, [searchQuery, statusFilter, doctors]);

  const handleStatusChange = async () => {
    if (!selectedDoctor || !actionType) return;
    setIsUpdating(true);

    const newStatus = actionType === 'activate' ? 'active' : 'inactive';

    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: selectedDoctor.uid,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToastMessage(`Doctor account ${selectedDoctor.fullName} is now ${newStatus}.`);
        await logActivity({
          actorUid: 'super-admin',
          actorName: 'Super Admin',
          actorRole: 'super_admin',
          action: actionType === 'activate' ? 'ACTIVATED_DOCTOR' : 'DEACTIVATED_DOCTOR',
          targetUid: selectedDoctor.uid,
          targetName: selectedDoctor.fullName,
          targetRole: 'doctor',
        });
        await fetchDoctors();
      }
    } catch (error) {
      console.error('Failed to change doctor status:', error);
    } finally {
      setIsUpdating(false);
      setSelectedDoctor(null);
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
            <Stethoscope className="w-6 h-6 text-[#0284C7]" /> Doctor Account Management
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Register veterinary doctors, manage clinic qualifications, licensing details and status.
          </p>
        </div>

        <Link
          href="/super-admin/doctors/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Doctor
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
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doctor name, email, specialization..."
            className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2 text-xs text-[#25242A] font-semibold rounded-xl outline-hidden transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#777980]" />
          <span className="text-xs font-bold text-[#777980]">Status:</span>
          {(['all', 'active', 'inactive', 'suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-[#EAF8FE] text-[#0284C7] border border-[#0284C7]/20'
                  : 'bg-[#FAFCFD] text-[#777980] border border-[#E8ECF0] hover:text-[#25242A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Table */}
      {isLoading ? (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center text-xs text-[#777980] font-medium">
          Loading Doctor Accounts...
        </div>
      ) : filteredDoctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No Doctor Accounts Found"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'No doctor accounts match your search or filter criteria.'
              : 'There are currently no veterinary doctors registered in the system.'
          }
          actionLabel="Create Doctor"
          onAction={() => (window.location.href = '/super-admin/doctors/create')}
        />
      ) : (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFCFD] border-b border-[#E8ECF0] text-[#777980] font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Doctor Name</th>
                  <th className="py-3.5 px-4">Specialization</th>
                  <th className="py-3.5 px-4">Email / Mobile</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Reg No</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filteredDoctors.map((docItem) => (
                  <tr key={docItem.uid} className="hover:bg-[#FAFCFD] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#25242A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#EAF8FE] text-[#0284C7] font-bold text-xs flex items-center justify-center border border-[#0284C7]/20 shrink-0">
                          {docItem.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#25242A]">{docItem.fullName}</p>
                          <p className="text-[10px] text-[#777980]">{docItem.qualification || 'BVSc & AH'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#0284C7] font-bold">
                      {docItem.specialization || 'Veterinary Surgeon'}
                    </td>
                    <td className="py-3.5 px-4 text-[#777980] font-medium">
                      <p>{docItem.email}</p>
                      <p className="text-[10px]">{docItem.phone || 'No phone'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <UserStatusBadge status={docItem.status || 'active'} />
                    </td>
                    <td className="py-3.5 px-4 text-[#777980] font-medium">
                      {docItem.registrationNumber || 'VET-IN-2026'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/super-admin/doctors/${docItem.uid}`}
                          className="p-1.5 text-[#0284C7] hover:bg-[#EAF8FE] rounded-lg transition-colors inline-flex items-center gap-1 font-bold"
                          title="View & Edit Doctor"
                        >
                          <Eye className="w-4 h-4" /> View
                        </Link>

                        {(docItem.status || 'active') === 'active' ? (
                          <button
                            onClick={() => {
                              setSelectedDoctor(docItem);
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
                              setSelectedDoctor(docItem);
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!selectedDoctor && !!actionType}
        title={`${actionType === 'activate' ? 'Activate' : 'Deactivate'} Doctor Account`}
        description={`Are you sure you want to ${actionType} access for ${selectedDoctor?.fullName}? ${
          actionType === 'deactivate' ? 'This doctor will be blocked from logging into the Doctor Portal.' : ''
        }`}
        confirmText={actionType === 'activate' ? 'Activate Doctor' : 'Deactivate Doctor'}
        isDangerous={actionType === 'deactivate'}
        isLoading={isUpdating}
        onConfirm={handleStatusChange}
        onCancel={() => {
          setSelectedDoctor(null);
          setActionType(null);
        }}
      />
    </div>
  );
}
