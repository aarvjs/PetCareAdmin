'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/authContext';
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
  Building2,
  Copy,
  Check,
  MapPin,
  Phone,
  Mail,
  Stethoscope,
} from 'lucide-react';
import { INITIAL_APPOINTMENTS, INITIAL_PETS } from '@/lib/mockData';

export default function DoctorDashboardPage() {
  const { profile, business } = useAuth();
  const [copiedShopId, setCopiedShopId] = useState(false);
  const [greeting, setGreeting] = useState('Good Day');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  const rawDoctorName = profile?.fullName?.trim() || 'Doctor';
  const doctorDisplayName = rawDoctorName.toLowerCase().startsWith('dr')
    ? rawDoctorName
    : `Dr. ${rawDoctorName}`;

  const currentShopId = business?.shopId || profile?.shopId || '';
  const clinicName = business?.name || profile?.assignedBusinessName || 'Healthy Paws Pet Clinic';
  const clinicAddress = [business?.city, business?.state || 'India'].filter(Boolean).join(', ');

  const handleCopyShopId = () => {
    if (currentShopId) {
      navigator.clipboard.writeText(currentShopId);
      setCopiedShopId(true);
      setTimeout(() => setCopiedShopId(false), 2000);
    }
  };

  const doctorAppointments = INITIAL_APPOINTMENTS.filter(
    (a) => a.doctorName.includes('Ananya') || true
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Greeting */}
      <div className="p-6 bg-gradient-to-r from-[#EAF8FE] via-[#F1EEFF] to-[#FAF9FF] rounded-3xl border border-[#72CFF2]/40 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0284C7] bg-white px-3 py-1 rounded-full shadow-2xs border border-[#72CFF2]/30">
              Doctor Consultation Workspace
            </span>
            {currentShopId && (
              <span className="text-[11px] font-mono font-extrabold text-[#7567E8] bg-white px-2.5 py-1 rounded-full shadow-2xs border border-[#7567E8]/20">
                Clinic: {clinicName}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#25242A] mt-2.5 tracking-tight">
            {greeting}, {doctorDisplayName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#737780] font-medium mt-1">
            Welcome to your consultation workspace at <strong className="text-[#25242A] font-bold">{clinicName}</strong>. You have 4 patient consultations scheduled for today.
          </p>
        </div>

        <Link
          href="/doctor/appointments"
          className="inline-flex items-center gap-2 bg-[#7567E8] hover:bg-[#6253df] text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xs transition-colors shrink-0"
        >
          <Calendar className="w-4 h-4" />
          <span>View Today Schedule</span>
        </Link>
      </div>

      {/* Clinic & Shop Identity Card */}
      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-[#72CFF2]/10 via-[#7567E8]/5 to-transparent pointer-events-none rounded-bl-full" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          {/* Clinic Brand & Details */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            {business?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt={clinicName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-[#E8ECF0] shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#72CFF2] to-[#7567E8] flex items-center justify-center text-white shadow-xs shrink-0">
                <Building2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#737780] bg-[#F8FAFC] px-2.5 py-0.5 rounded-md border border-[#E8ECF0]">
                  Assigned Practice
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#10B981] bg-[#E6F7F0] px-2.5 py-0.5 rounded-full border border-[#10B981]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Active Clinic
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-[#25242A] tracking-tight">
                {clinicName}
              </h2>

              <div className="flex items-center gap-3 text-xs text-[#737780] flex-wrap font-medium">
                {clinicAddress && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#7567E8]" />
                    <span>{clinicAddress}</span>
                  </span>
                )}
                {business?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>{business.phone}</span>
                  </span>
                )}
                {business?.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#737780]" />
                    <span>{business.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Shop ID Pill & Doctor Accreditation */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E8ECF0]">
            {currentShopId && (
              <div className="flex items-center gap-2">
                <div className="px-3.5 py-1.5 bg-[#FAF9FF] border border-[#7567E8]/30 rounded-2xl shadow-2xs flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7567E8]">
                    Clinic Shop ID:
                  </span>
                  <span className="font-mono font-black text-sm text-[#25242A] tracking-wider">
                    {currentShopId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyShopId}
                  title="Copy Permanent Shop ID"
                  className="p-2 bg-white border border-[#E8ECF0] hover:border-[#7567E8] text-[#7567E8] rounded-xl transition-all shadow-2xs"
                >
                  {copiedShopId ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold text-[#0284C7] bg-[#EAF8FE] px-3 py-1 rounded-full border border-[#72CFF2]/30 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>{profile?.specialization || 'Veterinary Specialist'}</span>
              </span>
              {profile?.qualification && (
                <span className="text-[11px] font-bold text-[#7567E8] bg-[#F1EEFF] px-2.5 py-1 rounded-full border border-[#7567E8]/20">
                  {profile.qualification}
                </span>
              )}
              {profile?.registrationNumber && (
                <span className="text-[10px] font-mono font-bold text-[#737780] bg-[#F8FAFC] px-2 py-1 rounded-md border border-[#E8ECF0]">
                  Reg: {profile.registrationNumber}
                </span>
              )}
            </div>
          </div>
        </div>
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
