'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateEmail, validateIndianMobile, validatePassword } from '@/lib/validation';
import { Stethoscope, ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff, Award, Clock, FileText, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export default function AdminCreateDoctorPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    registrationNumber: '',
    experience: '',
    password: '',
    confirmPassword: '',
    status: 'Active',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (validationSuccess) {
      setValidationSuccess(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationSuccess(false);
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Doctor Full Name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Mobile number is required.';
    } else if (!validateIndianMobile(formData.phone)) {
      newErrors.phone = 'Enter a valid 10-digit Indian mobile number (e.g. 9415011223).';
    }

    if (!formData.specialization.trim()) {
      newErrors.specialization = 'Specialization is required.';
    }

    if (!formData.qualification.trim()) {
      newErrors.qualification = 'Qualification is required.';
    }

    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration / License number is required.';
    }

    if (!formData.experience.trim()) {
      newErrors.experience = 'Experience duration is required.';
    }

    const pwdVal = validatePassword(formData.password);
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (!pwdVal.isValid) {
      newErrors.password = pwdVal.message || 'Password must be at least 6 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setValidationSuccess(true);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#737780] hover:text-[#25242A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Doctor Roster
        </Link>
        <span className="text-xs font-bold text-[#0284C7] bg-[#EAF8FE] px-3 py-1 rounded-full border border-[#0284C7]/20">
          Admin Portal • Create Doctor Interface
        </span>
      </div>

      <PageHeader
        title="Create Doctor Account"
        subtitle="Fill in veterinary practitioner credentials and clinical details for Doctor Portal access."
      />

      <Card>
        {validationSuccess && (
          <div className="mb-6 p-4 bg-[#EAF8FE] border border-[#0284C7]/30 rounded-2xl flex items-start gap-3 text-[#0284C7] text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-sm">Client-Side Form Validation Passed!</p>
              <p className="mt-0.5 text-xs text-[#0284C7]/90">
                Form inputs are valid. The submission handler is ready for future backend & authentication integration.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <Input
            label="Doctor Full Name *"
            name="fullName"
            placeholder="e.g. Dr. Ananya Sharma"
            value={formData.fullName}
            onChange={handleChange}
            error={errors.fullName}
            icon={<User className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Doctor Email Address *"
              name="email"
              type="email"
              placeholder="dr.ananya@healthypaws.in"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Mobile Number *"
              name="phone"
              placeholder="+91 94150 11223"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              icon={<Phone className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Specialization *"
              name="specialization"
              placeholder="Small Animal Surgery & Care"
              value={formData.specialization}
              onChange={handleChange}
              error={errors.specialization}
              icon={<Award className="w-4 h-4" />}
            />
            <Input
              label="Qualification *"
              name="qualification"
              placeholder="BVSc & AH, MVSc"
              value={formData.qualification}
              onChange={handleChange}
              error={errors.qualification}
              icon={<FileText className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Veterinary Registration / License No. *"
              name="registrationNumber"
              placeholder="VET-UP-2026-441"
              value={formData.registrationNumber}
              onChange={handleChange}
              error={errors.registrationNumber}
              icon={<ShieldAlert className="w-4 h-4" />}
            />
            <Input
              label="Experience *"
              name="experience"
              placeholder="8 Years"
              value={formData.experience}
              onChange={handleChange}
              error={errors.experience}
              icon={<Clock className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Password *"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                icon={<Lock className="w-4 h-4" />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-8 text-[#737780] hover:text-[#25242A] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password *"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                icon={<Lock className="w-4 h-4" />}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-8 text-[#737780] hover:text-[#25242A] transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Account Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full bg-white border border-[#E8ECF0] focus:border-[#0284C7] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
            >
              <option value="Active">Active (Granted Access)</option>
              <option value="Inactive">Inactive (Disabled Access)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/doctors')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              className="bg-[#0284C7] text-white hover:bg-[#0369A1] font-bold"
            >
              Validate & Create Doctor
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
