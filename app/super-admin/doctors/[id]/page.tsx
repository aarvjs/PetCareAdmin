'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/authContext';
import { UserStatusBadge } from '@/components/super-admin/UserStatusBadge';
import { ArrowLeft, Stethoscope, Mail, Phone, User, Save, CheckCircle2, AlertCircle, Award, Clock, FileText } from 'lucide-react';
import { logActivity } from '@/lib/auditLogger';

export default function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const doctorId = resolvedParams.id;

  const [doctor, setDoctor] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    specialization: '',
    qualification: '',
    experience: '',
    registrationNumber: '',
    availability: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  const fetchDoctorDetail = async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, 'users', doctorId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setDoctor(data);
        setFormData({
          fullName: data.fullName || '',
          phone: data.phone || '',
          specialization: data.specialization || '',
          qualification: data.qualification || '',
          experience: data.experience || '',
          registrationNumber: data.registrationNumber || '',
          availability: data.availability || '',
          status: data.status || 'active',
        });
      }
    } catch (e) {
      console.error('Error loading doctor details:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorDetail();
  }, [doctorId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: doctorId,
          fullName: formData.fullName,
          phone: formData.phone,
          specialization: formData.specialization,
          qualification: formData.qualification,
          experience: formData.experience,
          registrationNumber: formData.registrationNumber,
          availability: formData.availability,
          status: formData.status,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Failed to update doctor details.');
        setIsSaving(false);
        return;
      }

      setSuccessMessage('Doctor credentials updated successfully!');
      await logActivity({
        actorUid: 'super-admin',
        actorName: 'Super Admin',
        actorRole: 'super_admin',
        action: 'UPDATED_DOCTOR',
        targetUid: doctorId,
        targetName: formData.fullName,
        targetRole: 'doctor',
      });
      await fetchDoctorDetail();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center text-xs text-[#777980] font-medium">
        Loading Doctor Details...
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-base font-extrabold text-[#25242A]">Doctor Account Not Found</h2>
        <Link href="/super-admin/doctors" className="text-xs font-bold text-[#0284C7] hover:underline">
          Return to Doctors List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#777980] hover:text-[#25242A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Doctors
        </Link>
        <UserStatusBadge status={formData.status} />
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-[#E8ECF0]">
          <div className="w-16 h-16 rounded-2xl bg-[#EAF8FE] text-[#0284C7] font-bold text-xl flex items-center justify-center border border-[#0284C7]/20 shadow-xs">
            {doctor.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
              {doctor.fullName} <Stethoscope className="w-5 h-5 text-[#0284C7]" />
            </h1>
            <p className="text-xs text-[#0284C7] font-bold">{formData.specialization || 'Veterinary Specialist'}</p>
            <p className="text-xs text-[#777980] font-medium mt-0.5">{doctor.email}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-[#E6F7F0] border border-[#10B981]/20 rounded-xl text-[#10B981] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Doctor Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Specialization
              </label>
              <div className="relative">
                <Award className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Qualification
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Vet Registration / License No.
              </label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Experience
              </label>
              <input
                type="text"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Consultation Availability
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Account Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
              >
                <option value="active">Active (Granted Access)</option>
                <option value="inactive">Inactive (Disabled Access)</option>
                <option value="suspended">Suspended (Blocked Access)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Doctor Credentials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
