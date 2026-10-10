'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateEmail, validateIndianMobile, validatePassword } from '@/lib/validation';
import { useAuth } from '@/lib/authContext';
import {
  Stethoscope,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Award,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Building2,
  Loader2,
} from 'lucide-react';

export default function AdminCreateDoctorPage() {
  const router = useRouter();
  const { user, profile } = useAuth();

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
    status: 'active',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Permission Checks
  const isSuperAdmin = profile?.role === 'super_admin';
  const mods = profile?.modules || [];
  const perms = profile?.permissions || [];
  const hasClinicModule =
    profile?.role === 'admin' &&
    (mods.length > 0
      ? mods.includes('clinic')
      : perms.includes('doctors') || perms.includes('p_doctors'));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setSuccessMessage('');
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
      newErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
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

    try {
      const idToken = user ? await user.getIdToken() : '';
      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          specialization: formData.specialization.trim(),
          qualification: formData.qualification.trim(),
          registrationNumber: formData.registrationNumber.trim(),
          experience: formData.experience.trim(),
          password: formData.password,
          status: formData.status,
          businessId: profile?.businessId || '',
          shopId: profile?.shopId || '',
          createdBy: profile?.uid || user?.uid || 'admin',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setApiError(data.error || 'Failed to create Doctor account.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(`Doctor account for ${formData.fullName} created successfully for Shop ID ${profile?.shopId || 'your clinic'}!`);

      setTimeout(() => {
        router.push('/admin/doctors');
      }, 1500);
    } catch (err: any) {
      setApiError(err.message || 'Network error while creating doctor account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Guard: Super Admin is strictly blocked
  if (isSuperAdmin) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
        <div className="bg-white border border-[#E8ECF0] rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-base font-extrabold text-[#25242A]">
            Super Admin Doctor Creation Restricted
          </h2>
          <p className="text-xs text-[#777980] max-w-md mx-auto leading-relaxed">
            Super Admins are not permitted to create Doctor accounts. Doctor creation is exclusively delegated to authorized Clinic Administrators for their respective clinics.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7567E8] text-white rounded-xl text-xs font-bold hover:bg-[#6354D6]"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Guard: E-commerce only Admin is blocked
  if (!hasClinicModule) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
        <div className="bg-white border border-[#E8ECF0] rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-base font-extrabold text-[#25242A]">
            Clinic / Doctor Module Required
          </h2>
          <p className="text-xs text-[#777980] max-w-md mx-auto leading-relaxed">
            Your administrator account is configured for E-commerce operations only. You do not have permissions to create or manage Doctor accounts.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#7567E8] text-white rounded-xl text-xs font-bold hover:bg-[#6354D6]"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/doctors"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#737780] hover:text-[#25242A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Doctor Roster
        </Link>
        <div className="flex items-center gap-2">
          {profile?.shopId && (
            <span className="font-mono text-xs font-extrabold text-[#0284C7] bg-[#EAF8FE] px-3 py-1 rounded-full border border-[#0284C7]/20">
              Clinic Shop ID: {profile.shopId}
            </span>
          )}
        </div>
      </div>

      <PageHeader
        title="Create Doctor Account"
        subtitle="Provision veterinary doctor portal credentials, license registration, and clinical specialization for your clinic."
      />

      {/* Associated Clinic Notice */}
      <div className="p-4 bg-[#F8FAFC] border border-[#E8ECF0] rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EAF8FE] text-[#0284C7] flex items-center justify-center border border-[#0284C7]/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#777980] block">
              Assigned Clinic Business
            </span>
            <span className="font-bold text-xs text-[#25242A]">
              Shop ID: {profile?.shopId || 'Your Clinic'} • Admin UID: {profile?.uid?.slice(0, 10)}...
            </span>
          </div>
        </div>
        <span className="text-[10px] font-extrabold uppercase text-[#0284C7] bg-[#EAF8FE] px-2.5 py-1 rounded-lg">
          Clinic Module Active
        </span>
      </div>

      <Card>
        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-[#EAF8FE] border border-[#0284C7]/30 rounded-2xl flex items-center gap-3 text-[#0284C7] text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
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
              className="w-full bg-white border border-[#E8ECF0] focus:border-[#0284C7] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden cursor-pointer"
            >
              <option value="active">Active (Granted Access)</option>
              <option value="inactive">Inactive (Disabled Access)</option>
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
              Create Doctor Account
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
