'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, User, Award, Phone, Mail, Clock } from 'lucide-react';

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState({
    name: 'Dr. Ananya Sharma',
    qualification: 'BVSc & AH, MVSc (Surgery)',
    specialization: 'Small Animal Surgery & Wellness',
    experience: '8 Years',
    phone: '+91 94150 11223',
    email: 'ananya.sharma@petcare.in',
    availability: 'Mon - Sat (09:00 AM - 05:00 PM)',
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
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
            <CheckCircle2 className="w-4 h-4" /> Doctor profile updated successfully!
          </div>
        )}

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E8ECF0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop"
            alt="Dr. Ananya"
            className="w-20 h-20 rounded-2xl object-cover border-2 border-[#72CFF2]"
          />
          <div>
            <h3 className="text-xl font-extrabold text-[#25242A]">{profile.name}</h3>
            <p className="text-xs font-bold text-[#72CFF2]">{profile.specialization}</p>
            <p className="text-xs text-[#737780] font-medium mt-1">{profile.qualification}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            icon={<User className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Qualification"
              value={profile.qualification}
              onChange={(e) => setProfile({ ...profile, qualification: e.target.value })}
              icon={<Award className="w-4 h-4" />}
            />
            <Input
              label="Experience"
              value={profile.experience}
              onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
            />
          </div>

          <Input
            label="Specialization"
            value={profile.specialization}
            onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Number"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              icon={<Phone className="w-4 h-4" />}
            />
            <Input
              label="Email Address"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              icon={<Mail className="w-4 h-4" />}
            />
          </div>

          <Input
            label="Clinic Consultation Availability Hours"
            value={profile.availability}
            onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
            icon={<Clock className="w-4 h-4" />}
          />

          <Button type="submit" className="bg-[#72CFF2] text-[#25242A] hover:bg-[#5bbfe2]">
            Save Doctor Profile
          </Button>
        </form>
      </Card>
    </div>
  );
}
