'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, User, Phone, Mail, ShieldCheck, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function AdminProfilePage() {
  const { user, profile, updateProfileData } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profile || user) {
      setFormData({
        fullName: profile?.fullName || '',
        phone: profile?.phone || '',
        email: profile?.email || user?.email || '',
      });
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      await updateProfileData({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = formData.fullName || user?.email || 'Admin User';

  const getInitials = (name: string) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formattedDate = profile?.createdAt
    ? new Date(profile.createdAt.toDate ? profile.createdAt.toDate() : profile.createdAt).toLocaleDateString()
    : 'Not available';

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl">
      <PageHeader
        title="Admin Profile"
        subtitle="View and update your administrator credentials and account details."
      />

      <Card>
        {isSaved && (
          <div className="mb-4 p-3 bg-[#DFF7EE] border border-[#b5f0d8] rounded-xl text-[#35B779] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Admin profile updated successfully!
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E8ECF0]">
          {profile?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoURL}
              alt={displayName}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#7567E8]"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#7567E8] text-white flex items-center justify-center font-bold text-2xl border-2 border-[#7567E8]">
              {getInitials(displayName)}
            </div>
          )}

          <div>
            <h3 className="text-xl font-extrabold text-[#25242A]">{displayName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#7567E8] bg-[#F1EEFF] px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Administrator
              </span>
            </div>
            <p className="text-[11px] text-[#A0A4AB] font-medium mt-2">UID: {user?.uid || 'Not available'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. System Administrator"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            icon={<User className="w-4 h-4" />}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Number"
              placeholder={profile?.phone ? undefined : "Not added"}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              icon={<Phone className="w-4 h-4" />}
            />
            <div>
              <Input
                label="Email Address"
                value={formData.email}
                disabled
                icon={<Mail className="w-4 h-4" />}
              />
              <span className="text-[10px] text-[#737780] mt-1 block">
                Email identity is managed by Firebase Authentication.
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E8ECF0] flex items-center justify-between text-xs text-[#737780]">
            <span className="flex items-center gap-2 font-medium">
              <Calendar className="w-4 h-4 text-[#7567E8]" /> Account Created Date:
            </span>
            <span className="font-bold text-[#25242A]">{formattedDate}</span>
          </div>

          <Button type="submit" disabled={isSaving} className="bg-[#7567E8] text-white hover:bg-[#6354d6]">
            {isSaving ? 'Saving Profile...' : 'Save Admin Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
