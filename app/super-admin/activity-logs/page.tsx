'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ActivityLog } from '@/lib/auditLogger';
import { EmptyState } from '@/components/super-admin/EmptyState';
import { FileText, Search, Filter, RefreshCw, Clock, User, ShieldCheck } from 'lucide-react';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin' | 'doctor'>('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const list: ActivityLog[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ActivityLog);
      });
      setLogs(list);
      setFilteredLogs(list);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let result = [...logs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.actorName?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          l.targetName?.toLowerCase().includes(q) ||
          l.details?.toLowerCase().includes(q)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter((l) => l.actorRole === roleFilter);
    }

    setFilteredLogs(result);
  }, [searchQuery, roleFilter, logs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#7567E8]" /> Activity & Audit Logs
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Real-time audit trail of administrative creations, profile updates, status changes, and privilege modifications.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FAFCFD] border border-[#E8ECF0] hover:bg-white text-[#25242A] font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-[#7567E8] ${isLoading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E8ECF0] p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by action, actor, target..."
            className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2 text-xs text-[#25242A] font-semibold rounded-xl outline-hidden transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#777980]" />
          <span className="text-xs font-bold text-[#777980]">Actor Role:</span>
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

      {/* Activity Logs Table */}
      {isLoading ? (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center text-xs text-[#777980] font-medium">
          Loading Audit Trail...
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Activity Logs Recorded"
          description="System events and administrative actions will automatically appear here."
        />
      ) : (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFCFD] border-b border-[#E8ECF0] text-[#777980] font-extrabold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Target</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAFCFD] transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-[#7567E8]">
                      <span className="px-2.5 py-1 bg-[#F1EEFF] rounded-lg border border-[#7567E8]/20 inline-block">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#25242A]">
                      <div>
                        <span>{log.actorName}</span>
                        <span className="text-[10px] text-[#777980] block font-semibold uppercase">
                          {log.actorRole}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#777980] font-semibold">
                      {log.targetName ? (
                        <div>
                          <p className="text-[#25242A]">{log.targetName}</p>
                          <p className="text-[10px] text-[#777980]">{log.targetRole}</p>
                        </div>
                      ) : (
                        'System'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#777980] font-medium">
                      {log.timestamp?.toDate
                        ? log.timestamp.toDate().toLocaleString()
                        : new Date().toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-[#777980] font-medium">
                      {log.details || 'Administrative action performed.'}
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
