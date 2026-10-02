'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Search, Filter, Calendar, Clock, User, Phone, CheckCircle } from 'lucide-react';
import { INITIAL_APPOINTMENTS, Appointment } from '@/lib/mockData';

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const updateStatus = (id: string, newStatus: Appointment['status']) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      a.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Clinic Appointments Master List"
        subtitle="Manage vet appointments, doctor assignments, and patient consultation schedules."
      />

      <Card padding="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search pet name, owner, doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-4 h-4 text-[#737780]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs text-[#25242A]"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-b border-[#E8ECF0]">
              <tr>
                <th className="py-3.5 px-4">Pet Patient</th>
                <th className="py-3.5 px-4">Owner Contact</th>
                <th className="py-3.5 px-4">Requested Service</th>
                <th className="py-3.5 px-4">Assigned Doctor</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF0]">
              {filtered.map((apt) => (
                <tr key={apt.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4">
                    <p className="font-bold text-[#25242A]">{apt.petName}</p>
                    <p className="text-[11px] text-[#737780]">{apt.petType}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-[#25242A]">{apt.ownerName}</p>
                    <p className="text-[#737780]">{apt.ownerPhone}</p>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#7567E8]">{apt.service}</td>
                  <td className="py-3 px-4 font-semibold text-[#25242A]">{apt.doctorName}</td>
                  <td className="py-3 px-4 text-[#737780]">
                    <p className="font-bold text-[#25242A]">{apt.date}</p>
                    <p>{apt.time}</p>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={apt.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {apt.status !== 'Confirmed' && apt.status !== 'Completed' && (
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(apt.id, 'Confirmed')}>
                          Confirm
                        </Button>
                      )}
                      {apt.status !== 'Completed' && (
                        <Button size="sm" onClick={() => updateStatus(apt.id, 'Completed')}>
                          Complete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
