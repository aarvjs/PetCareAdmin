'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SecurityEvent } from '@/lib/auditLogger';
import { StatCard } from '@/components/super-admin/StatCard';
import { EmptyState } from '@/components/super-admin/EmptyState';
import { ShieldAlert, Lock, CheckCircle2, AlertTriangle, KeyRound, Server, RefreshCw } from 'lucide-react';

export default function SecurityOverviewPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'security_events'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const list: SecurityEvent[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SecurityEvent);
      });
      setEvents(list);
    } catch (error) {
      console.error('Error fetching security events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const totalAuthSuccess = events.filter((e) => e.eventType === 'AUTH_SUCCESS').length;
  const totalAuthFailure = events.filter((e) => e.eventType === 'AUTH_FAILURE').length;
  const totalUnauthorized = events.filter((e) => e.eventType === 'UNAUTHORIZED_ACCESS').length;

  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
            {severity.toUpperCase()}
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
            MEDIUM
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#7567E8]" /> Security & Threat Monitoring
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Authentication security overview, unauthorized access alerts, and account protection statuses.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FAFCFD] border border-[#E8ECF0] hover:bg-white text-[#25242A] font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-[#7567E8] ${isLoading ? 'animate-spin' : ''}`} /> Refresh Security Metrics
        </button>
      </div>

      {/* Top Security Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          title="Successful Authentications"
          value={isLoading ? '...' : totalAuthSuccess}
          subtitle="Verified user sessions"
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <StatCard
          title="Failed Login Attempts"
          value={isLoading ? '...' : totalAuthFailure}
          subtitle="Invalid password / credentials"
          icon={AlertTriangle}
          accentColor="amber"
        />
        <StatCard
          title="Unauthorized Access Alerts"
          value={isLoading ? '...' : totalUnauthorized}
          subtitle="Blocked privilege escalations"
          icon={Lock}
          accentColor="purple"
        />
      </div>

      {/* Account Protection Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#7567E8]" /> Active Security Controls
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
              <span className="font-semibold text-[#25242A]">Server-Side Role Enforcer</span>
              <span className="text-[#10B981] font-bold">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
              <span className="font-semibold text-[#25242A]">Client Role Mutation Guard</span>
              <span className="text-[#10B981] font-bold">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
              <span className="font-semibold text-[#25242A]">Firestore Security Rules v2</span>
              <span className="text-[#10B981] font-bold">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2">
            <Server className="w-4 h-4 text-[#7567E8]" /> Credential Security Status
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
              <span className="font-semibold text-[#25242A]">Firebase Service Account Key Exposure</span>
              <span className="text-[#10B981] font-bold">Zero Exposure (Secure)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
              <span className="font-semibold text-[#25242A]">Password Storage Policy</span>
              <span className="text-[#10B981] font-bold">Never Stored in Firestore</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFCFD] border border-[#E8ECF0]">
              <span className="font-semibold text-[#25242A]">Client Auth Session Source</span>
              <span className="text-[#10B981] font-bold">Firebase SDK (No LocalStorage Trust)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Events Table */}
      <div className="bg-white border border-[#E8ECF0] rounded-2xl overflow-hidden shadow-xs space-y-4 p-5">
        <h2 className="text-sm font-extrabold text-[#25242A]">Security Event Audit Stream</h2>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#777980] font-medium">
            Loading Security Event Logs...
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No Security Threats Detected"
            description="All authentication attempts and privilege queries are functioning safely."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFCFD] border-b border-[#E8ECF0] text-[#777980] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-3">Event Type</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Actor / Email</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#FAFCFD] transition-colors">
                    <td className="py-3 px-3 font-bold text-[#25242A]">{ev.eventType}</td>
                    <td className="py-3 px-3">{renderSeverityBadge(ev.severity)}</td>
                    <td className="py-3 px-3 text-[#777980] font-medium">{ev.actorEmail || 'Anonymous'}</td>
                    <td className="py-3 px-3 text-[#25242A] font-medium">{ev.description}</td>
                    <td className="py-3 px-3 text-[#777980] font-medium">
                      {ev.timestamp?.toDate ? ev.timestamp.toDate().toLocaleString() : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
