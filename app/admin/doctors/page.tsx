'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Plus, Stethoscope, Mail, Phone, Award, Calendar, Edit, Power } from 'lucide-react';
import { INITIAL_DOCTORS, Doctor } from '@/lib/mockData';

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    qualification: '',
    specialization: '',
    experience: '',
    phone: '',
    email: '',
    photo: '',
  });

  const handleOpenAdd = (doc?: Doctor) => {
    if (doc) {
      setSelectedDoctor(doc);
      setFormData({
        name: doc.name,
        qualification: doc.qualification,
        specialization: doc.specialization,
        experience: doc.experience,
        phone: doc.phone,
        email: doc.email,
        photo: doc.photo,
      });
    } else {
      setSelectedDoctor(null);
      setFormData({
        name: '',
        qualification: '',
        specialization: '',
        experience: '',
        phone: '',
        email: '',
        photo: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    setDoctors((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: d.status === 'Active' ? 'On Leave' : 'Active' } : d
      )
    );
  };

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDoctor) {
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === selectedDoctor.id ? { ...d, ...formData } : d
        )
      );
    } else {
      const newDoc: Doctor = {
        id: `DOC-${Math.floor(100 + Math.random() * 900)}`,
        name: formData.name,
        qualification: formData.qualification || 'BVSc & AH',
        specialization: formData.specialization || 'General Veterinary Practitioner',
        experience: formData.experience || '5 Years',
        phone: formData.phone,
        email: formData.email,
        status: 'Active',
        photo: formData.photo || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop',
        appointmentsCount: 0,
      };
      setDoctors((prev) => [newDoc, ...prev]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Doctor Roster & Vets"
        subtitle="Manage clinic veterinary surgeons, qualifications, availability, and active profiles."
        action={
          <Button onClick={() => handleOpenAdd()} icon={<Plus className="w-4 h-4" />}>
            Add Doctor
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {doctors.map((doc) => (
          <Card key={doc.id} className="relative">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.photo}
                alt={doc.name}
                className="w-20 h-20 rounded-2xl object-cover border border-[#72CFF2] bg-[#EAF8FE]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#25242A] truncate">{doc.name}</h3>
                  <StatusBadge status={doc.status} />
                </div>
                <p className="text-xs font-semibold text-[#7567E8] mt-0.5">{doc.specialization}</p>
                <p className="text-[11px] text-[#737780] font-medium mt-1">{doc.qualification}</p>

                <div className="flex items-center gap-4 mt-3 text-xs text-[#737780]">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#0284C7]" /> {doc.experience}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#35B779]" /> {doc.appointmentsCount} Appointments
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E8ECF0] flex items-center justify-between text-xs">
              <div className="space-y-0.5 text-[#737780]">
                <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#7567E8]" /> {doc.email}</p>
                <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#7567E8]" /> {doc.phone}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleStatus(doc.id)}
                  icon={<Power className="w-3.5 h-3.5" />}
                >
                  {doc.status === 'Active' ? 'Set Leave' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleOpenAdd(doc)}
                  icon={<Edit className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDoctor ? 'Edit Doctor Profile' : 'Add New Doctor'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveDoctor} className="space-y-4">
          <Input
            label="Doctor Full Name"
            placeholder="Dr. Ananya Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Qualification"
              placeholder="BVSc & AH, MVSc"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              required
            />
            <Input
              label="Experience"
              placeholder="8 Years"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              required
            />
          </div>

          <Input
            label="Specialization"
            placeholder="Small Animal Surgery & Wellness"
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mobile Number"
              placeholder="+91 94150 11223"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="doctor@petcare.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8ECF0]">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Doctor Profile</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
