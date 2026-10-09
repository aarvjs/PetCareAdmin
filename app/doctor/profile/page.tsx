'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, User, Award, Phone, Mail, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

export default function DoctorProfilePage() {
  const { user, profile, updateProfileData } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    qualification: '',
    specialization: '',
    experience: '',
    phone: '',
    email: '',
    availability: '',
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profile || user) {
      setFormData({
        fullName: profile?.fullName || '',
        qualification: profile?.qualification || '',
        specialization: profile?.specialization || '',
        experience: profile?.experience || '',
        phone: profile?.phone || '',
        email: profile?.email || user?.email || '',
        availability: profile?.availability || '',
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
        qualification: formData.qualification.trim(),
        specialization: formData.specialization.trim(),
        experience: formData.experience.trim(),
        phone: formData.phone.trim(),
        availability: formData.availability.trim(),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = formData.fullName || user?.email || 'Doctor';
  const displaySpec = formData.specialization || 'Doctor / Medical Specialist';
  const displayQual = formData.qualification || 'Doctor Profile';

  const getInitials = (name: string) => {
    if (!name) return 'D';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl">
      <PageHeader
        title="Doctor Profile"
        subtitle="Manage your professional credentials, contact details, and clinic availability hours."
      />

      <Card>
        {isSaved && (
          <div className="mb-4 p-3 bg-[#DFF7EE] border border-[#b5f0d8] rounded-xl text-[#35B779] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Doctor profile updated successfully!
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
              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#72CFF2]"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[#72CFF2] text-[#25242A] flex items-center justify-center font-bold text-2xl border-2 border-[#72CFF2]">
              {getInitials(displayName)}
            </div>
          )}

          <div>
            <h3 className="text-xl font-extrabold text-[#25242A]">{displayName}</h3>
            <p className="text-xs font-bold text-[#72CFF2]">{displaySpec}</p>
            <p className="text-xs text-[#737780] font-medium mt-1">{displayQual}</p>
            <p className="text-[11px] text-[#A0A4AB] font-medium mt-1">UID: {user?.uid || 'Not available'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Dr. Ramesh Kumar"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            icon={<User className="w-4 h-4" />}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Qualification"
              placeholder={profile?.qualification ? undefined : "Not added"}
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              icon={<Award className="w-4 h-4" />}
            />
            <Input
              label="Experience"
              placeholder={profile?.experience ? undefined : "Not added"}
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            />
          </div>

          <Input
            label="Specialization"
            placeholder={profile?.specialization ? undefined : "Not added"}
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
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

          <Input
            label="Clinic Consultation Availability Hours"
            placeholder={profile?.availability ? undefined : "Not added (e.g. Mon - Sat 09:00 AM - 05:00 PM)"}
            value={formData.availability}
            onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
            icon={<Clock className="w-4 h-4" />}
          />

          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#72CFF2] text-[#25242A] hover:bg-[#5bbfe2]"
          >
            {isSaving ? 'Saving Profile...' : 'Save Doctor Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
