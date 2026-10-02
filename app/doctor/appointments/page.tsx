'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Search, Calendar, Clock, CheckCircle } from 'lucide-react';
import { INITIAL_APPOINTMENTS, Appointment } from '@/lib/mockData';

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [searchTerm, setSearchTerm] = useState('');

  const updateStatus = (id: string, newStatus: Appointment['status']) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const filtered = appointments.filter(
    (a) =>
      a.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="My Patient Appointments"
        subtitle="View and manage your assigned pet patient consultations and schedule."
      />

      <Card padding="p-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
          <input
            type="text"
            placeholder="Search pet name, owner, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#72CFF2] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
          />
        </div>
      </Card>

      <Card padding="p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-b border-[#E8ECF0]">
              <tr>
                <th className="py-3.5 px-4">Pet Patient</th>
                <th className="py-3.5 px-4">Owner Name</th>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECF0]">
              {filtered.map((apt) => (
                <tr key={apt.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-3 px-4">
                    <p className="font-bold text-[#25242A]">{apt.petName}</p>
                    <p className="text-[11px] text-[#737780]">{apt.petType}</p>
                  </td>
                  <td className="py-3 px-4 font-semibold text-[#25242A]">{apt.ownerName}</td>
                  <td className="py-3 px-4 font-bold text-[#0284C7]">{apt.service}</td>
                  <td className="py-3 px-4 text-[#737780]">
                    <p className="font-bold text-[#25242A]">{apt.date}</p>
                    <p>{apt.time}</p>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={apt.status} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {apt.status !== 'Completed' && (
                      <Button
                        size="sm"
                        className="bg-[#72CFF2] text-[#25242A] hover:bg-[#5bbfe2]"
                        onClick={() => updateStatus(apt.id, 'Completed')}
                        icon={<CheckCircle className="w-3.5 h-3.5" />}
                      >
                        Mark Completed
                      </Button>
                    )}
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
