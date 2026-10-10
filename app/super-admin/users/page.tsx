'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/authContext';
import { UserStatusBadge } from '@/components/super-admin/UserStatusBadge';
import { EmptyState } from '@/components/super-admin/EmptyState';
import { Users, Search, Filter, ShieldCheck, Stethoscope, Crown, Eye } from 'lucide-react';

export default function AllUsersDirectoryPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'doctor'>('all');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        // Ignore business records or malformed documents
        if (data && !data.isBusinessDoc && data.role !== 'business' && data.role !== 'business_tenant') {
          list.push({
            ...data,
            uid: data.uid || docSnap.id,
            fullName: data.fullName || data.name || data.email?.split('@')[0] || 'User',
            email: data.email || 'No email',
            role: data.role || 'customer',
          } as UserProfile);
        }
      });
      setUsers(list);
      setFilteredUsers(list);
    } catch (error) {
      console.error('Error fetching users directory:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = [...users];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          (u.fullName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone && u.phone.includes(q))
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(result);
  }, [searchQuery, roleFilter, users]);

  const renderRoleBadge = (role: string) => {
    if (role === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F1EEFF] text-[#7567E8] border border-[#7567E8]/20">
          <Crown className="w-3 h-3" /> Super Admin
        </span>
      );
    }
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF8FE] text-[#0284C7] border border-[#0284C7]/20">
          <ShieldCheck className="w-3 h-3" /> Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Stethoscope className="w-3 h-3" /> Doctor
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#7567E8]" /> Central User Directory
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Complete list of all Super Admins, Store Admins, and Veterinary Practitioners.
          </p>
        </div>
      </div>

      {/* Search and Role Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E8ECF0] p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search directory by name, email, or mobile..."
            className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2 text-xs text-[#25242A] font-semibold rounded-xl outline-hidden transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#777980]" />
          <span className="text-xs font-bold text-[#777980]">Role:</span>
          {(['all', 'super_admin', 'admin', 'doctor'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                roleFilter === r
                  ? 'bg-[#F1EEFF] text-[#7567E8] border border-[#7567E8]/20'
                  : 'bg-[#FAFCFD] text-[#777980] border border-[#E8ECF0] hover:text-[#25242A]'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center text-xs text-[#777980] font-medium">
          Loading Central User Directory...
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Users Found"
          description="No accounts match your current search or role filter criteria."
        />
      ) : (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFCFD] border-b border-[#E8ECF0] text-[#777980] font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Mobile</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-[#FAFCFD] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#25242A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#F1EEFF] text-[#7567E8] font-bold text-xs flex items-center justify-center border border-[#7567E8]/20 shrink-0">
                          {(u.fullName || u.email || 'User').slice(0, 2).toUpperCase()}
                        </div>
                        <span>{u.fullName || u.email || 'User'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{renderRoleBadge(u.role)}</td>
                    <td className="py-3.5 px-4 text-[#777980] font-medium">{u.email}</td>
                    <td className="py-3.5 px-4 text-[#777980] font-medium">{u.phone || 'Not added'}</td>
                    <td className="py-3.5 px-4">
                      <UserStatusBadge status={u.status || 'active'} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.role === 'admin' && (
                        <Link
                          href={`/super-admin/admins/${u.uid}`}
                          className="p-1.5 text-[#7567E8] hover:bg-[#F1EEFF] rounded-lg transition-colors inline-flex items-center gap-1 font-bold"
                        >
                          <Eye className="w-4 h-4" /> Manage
                        </Link>
                      )}
                      {u.role === 'doctor' && (
                        <Link
                          href={`/super-admin/doctors/${u.uid}`}
                          className="p-1.5 text-[#0284C7] hover:bg-[#EAF8FE] rounded-lg transition-colors inline-flex items-center gap-1 font-bold"
                        >
                          <Eye className="w-4 h-4" /> Manage
                        </Link>
                      )}
                      {u.role === 'super_admin' && (
                        <span className="text-[11px] text-[#777980] italic">Primary Control</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
