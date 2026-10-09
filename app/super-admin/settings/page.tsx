'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { Settings, User, Mail, Phone, Lock, Save, CheckCircle2, AlertCircle, Building, ShieldCheck } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  const { user, profile, updateProfileData } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    clinicTitle: 'Healthy Paws Pet Clinic',
    supportEmail: 'support@healthypaws.in',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profile || user) {
      setFormData((prev) => ({
        ...prev,
        fullName: profile?.fullName || 'Super Admin',
        email: profile?.email || user?.email || 'superadmin@healthypaws.in',
        phone: profile?.phone || '',
      }));
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await updateProfileData({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
      });
      setSuccessMessage('Super Admin settings updated successfully!');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs">
        <h1 className="text-xl font-extrabold text-[#25242A] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#7567E8]" /> Super Admin Settings
        </h1>
        <p className="text-xs text-[#777980] font-medium mt-1">
          Manage your administrator profile credentials, security preferences, and clinic platform settings.
        </p>
      </div>

      <div className="bg-white border border-[#E8ECF0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
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

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Profile Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2 border-b border-[#E8ECF0] pb-2">
              <User className="w-4 h-4 text-[#7567E8]" /> Super Admin Profile
            </h2>

            <div>
              <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#777980] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full bg-slate-100 border border-[#E8ECF0] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#777980] cursor-not-allowed"
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
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] pl-10 pr-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Platform Information */}
          <div className="space-y-4 pt-4 border-t border-[#E8ECF0]">
            <h2 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2 border-b border-[#E8ECF0] pb-2">
              <Building className="w-4 h-4 text-[#7567E8]" /> Clinic Platform Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Clinic Brand Title
                </label>
                <input
                  type="text"
                  value={formData.clinicTitle}
                  onChange={(e) => setFormData({ ...formData, clinicTitle: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#25242A] uppercase tracking-wider mb-1.5">
                  Technical Support Email
                </label>
                <input
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  className="w-full bg-[#FAFCFD] border border-[#E8ECF0] focus:border-[#7567E8] px-4 py-2.5 rounded-xl font-semibold text-[#25242A] outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
