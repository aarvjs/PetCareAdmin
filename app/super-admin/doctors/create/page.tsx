'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Stethoscope, ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Award, Clock, FileText, Info } from 'lucide-react';
import { validateEmail, validateIndianMobile } from '@/lib/validation';

export default function CreateDoctorPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    specialization: 'Small Animal Surgery & Wellness',
    qualification: 'BVSc & AH, MVSc',
    experience: '5 Years',
    registrationNumber: 'VET-IN-2026',
    availability: 'Mon - Sat (09:00 AM - 05:00 PM)',
    status: 'active',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Doctor Full Name is required.');
      return;
    }

    if (!formData.email.trim() || !validateEmail(formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (formData.phone && !validateIndianMobile(formData.phone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number (e.g. +91 9415011223).');
      return;
    }

    if (!formData.password) {
      setErrorMessage('Password is required.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage(
        `Doctor form validation passed for ${formData.fullName} (${formData.email})! UI and validation ready for future backend integration.`
      );
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#777980] hover:text-[#25242A]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Doctors List
        </Link>
        <span className="text-xs font-bold text-[#0284C7] bg-[#EAF8FE] px-2.5 py-1 rounded-full border border-[#0284C7]/20">
          Doctor Portal Access
        </span>
      </div>

      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#0284C7]" /> Create Doctor Account
          </h1>
          <p className="text-xs text-[#777980] font-medium mt-1">
            Register a veterinary doctor with clinical portal access, specialization credentials, and consultation availability.
          </p>
        </div>

        <div className="p-3.5 bg-[#EAF8FE] border border-[#8ED8F8]/40 rounded-xl text-xs text-[#0284C7] font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>Frontend UI & Client Validation active. Backend API integration can be connected in the next phase.</span>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
              Doctor Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Dr. Ananya Sharma"
                className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="dr.ananya@healthypaws.in"
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
                  placeholder="+91 94150 11223"
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
                  placeholder="e.g. Small Animal Surgery & Care"
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
                  placeholder="e.g. BVSc & AH, MVSc"
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Veterinary Reg / License No.
              </label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                placeholder="e.g. VET-UP-2026-441"
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
                placeholder="e.g. 8 Years"
                className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
              Clinic Consultation Availability
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                placeholder="e.g. Mon - Sat (09:00 AM - 05:00 PM)"
                className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-10 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777980] hover:text-[#25242A]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
              Initial Account Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#0284C7] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
            >
              <option value="active">Active (Immediate Portal Access)</option>
              <option value="inactive">Inactive (Disabled until activated)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
            <Link
              href="/super-admin/doctors"
              className="px-4 py-2.5 border border-[#E8ECF0] rounded-xl font-bold text-[#777980] hover:bg-[#FAFCFD]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {isLoading ? 'Validating...' : 'Validate & Save Doctor Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
