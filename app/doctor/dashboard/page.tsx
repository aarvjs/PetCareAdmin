'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  Clock,
  Dog,
  CheckCircle,
  FileText,
  UserCheck,
  ArrowRight,
  Syringe,
  Sparkles,
} from 'lucide-react';
import { INITIAL_APPOINTMENTS, INITIAL_PETS } from '@/lib/mockData';

export default function DoctorDashboardPage() {
  const doctorAppointments = INITIAL_APPOINTMENTS.filter(
    (a) => a.doctorName.includes('Ananya') || true
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Greeting */}
      <div className="p-6 bg-gradient-to-r from-[#EAF8FE] to-[#F1EEFF] rounded-3xl border border-[#72CFF2]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284C7] bg-white px-3 py-1 rounded-full shadow-xs">
            Doctor Consultation Workspace
          </span>
          <h1 className="text-2xl font-extrabold text-[#25242A] mt-2">
            Good Morning, Dr. Ananya Sharma 👋
          </h1>
          <p className="text-xs text-[#737780] font-medium mt-1">
            You have 4 pet patient consultations scheduled for today.
          </p>
        </div>

        <Link
          href="/doctor/appointments"
          className="inline-flex items-center gap-2 bg-[#7567E8] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs hover:bg-[#6253df] transition-colors"
        >
          <Calendar className="w-4 h-4" />
          <span>View Today Schedule</span>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#737780]">Today Appointments</span>
            <div className="p-2 rounded-xl bg-[#EAF8FE] text-[#0284C7]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#25242A] mt-2">4</h3>
        </Card>

        <Card padding="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#737780]">Pending Consultations</span>
            <div className="p-2 rounded-xl bg-[#FFF8E6] text-[#D97706]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#25242A] mt-2">1</h3>
        </Card>

        <Card padding="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#737780]">Completed Today</span>
            <div className="p-2 rounded-xl bg-[#DFF7EE] text-[#35B779]">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#25242A] mt-2">2</h3>
        </Card>

        <Card padding="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#737780]">Total Patients</span>
            <div className="p-2 rounded-xl bg-[#F1EEFF] text-[#7567E8]">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-[#25242A] mt-2">142</h3>
        </Card>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments Table */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#25242A]">Today’s Patient Schedule</h3>
            <Link
              href="/doctor/appointments"
              className="text-xs font-bold text-[#72CFF2] hover:underline flex items-center gap-1"
            >
              All Appointments <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#737780] uppercase tracking-wider text-[10px] font-bold border-y border-[#E8ECF0]">
                <tr>
                  <th className="py-2.5 px-3">Pet & Owner</th>
                  <th className="py-2.5 px-3">Requested Service</th>
                  <th className="py-2.5 px-3">Time Slot</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8ECF0]">
                {doctorAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3">
                      <p className="font-bold text-[#25242A]">{apt.petName}</p>
                      <p className="text-[11px] text-[#737780]">{apt.petType} • Owner: {apt.ownerName}</p>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#0284C7]">{apt.service}</td>
                    <td className="py-3 px-3 text-[#737780] font-medium">{apt.time}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={apt.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Actions & Recent Patients */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-base font-bold text-[#25242A] mb-3">Quick Doctor Actions</h3>
            <div className="space-y-2">
              <Link
                href="/doctor/appointments"
                className="w-full flex items-center justify-between p-3 bg-[#F8FAFC] hover:bg-[#EAF8FE] rounded-xl text-xs font-bold text-[#25242A] transition-colors border border-[#E8ECF0]"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#72CFF2]" /> View Appointments
                </span>
                <ArrowRight className="w-4 h-4 text-[#737780]" />
              </Link>

              <Link
                href="/doctor/patients"
                className="w-full flex items-center justify-between p-3 bg-[#F8FAFC] hover:bg-[#F1EEFF] rounded-xl text-xs font-bold text-[#25242A] transition-colors border border-[#E8ECF0]"
              >
                <span className="flex items-center gap-2">
                  <Dog className="w-4 h-4 text-[#7567E8]" /> Patient Records
                </span>
                <ArrowRight className="w-4 h-4 text-[#737780]" />
              </Link>

              <Link
                href="/doctor/vaccinations"
                className="w-full flex items-center justify-between p-3 bg-[#F8FAFC] hover:bg-[#DFF7EE] rounded-xl text-xs font-bold text-[#25242A] transition-colors border border-[#E8ECF0]"
              >
                <span className="flex items-center gap-2">
                  <Syringe className="w-4 h-4 text-[#35B779]" /> Vaccination Logs
                </span>
                <ArrowRight className="w-4 h-4 text-[#737780]" />
              </Link>
            </div>
          </Card>

          <Card>
            <h3 className="text-base font-bold text-[#25242A] mb-3">Recent Patients</h3>
            <div className="space-y-3">
              {INITIAL_PETS.map((pet) => (
                <div key={pet.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F8FAFC]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pet.photo}
                    alt={pet.name}
                    className="w-10 h-10 rounded-xl object-cover border border-[#E8ECF0]"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#25242A]">{pet.name}</p>
                    <p className="text-[11px] text-[#737780]">{pet.breed} • Owner: {pet.ownerName}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
