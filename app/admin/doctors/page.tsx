'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Plus, Stethoscope, Mail, Phone, Award, Calendar, Edit, Power, ShieldAlert, Loader2, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DoctorRecord {
  id: string;
  uid?: string;
  name: string;
  fullName?: string;
  qualification: string;
  specialization: string;
  experience: string;
  phone: string;
  email: string;
  status: 'Active' | 'On Leave' | 'Inactive' | string;
  photo?: string;
  shopId?: string;
  businessId?: string;
  appointmentsCount?: number;
}

export default function AdminDoctorsPage() {
  const { user, profile } = useAuth();
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    qualification: '',
    specialization: '',
    experience: '',
    phone: '',
    email: '',
  });

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      // 1. Try querying via API with Admin's shopId / businessId
      const targetShopId = profile?.shopId || '';
      const url = targetShopId ? `/api/admin/doctors?shopId=${encodeURIComponent(targetShopId)}` : '/api/admin/doctors';
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.doctors)) {
        const formatted = data.doctors.map((d: any) => ({
          id: d.uid || d.id,
          uid: d.uid || d.id,
          name: d.fullName || d.name || 'Dr. Specialist',
          qualification: d.qualification || 'BVSc & AH',
          specialization: d.specialization || 'Veterinary Practitioner',
          experience: d.experience || '5 Years',
          phone: d.phone || '',
          email: d.email || '',
          status: d.status === 'active' || d.status === 'Active' ? 'Active' : 'On Leave',
          shopId: d.shopId || '',
          businessId: d.businessId || '',
          appointmentsCount: d.appointmentsCount || 0,
          photo: d.photoUrl || d.photo || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop',
        }));
        setDoctors(formatted);
      } else {
        // Fallback to client Firestore
        const q = targetShopId
          ? query(collection(db, 'users'), where('role', '==', 'doctor'), where('shopId', '==', targetShopId))
          : query(collection(db, 'users'), where('role', '==', 'doctor'));
        const snap = await getDocs(q);
        const list: DoctorRecord[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            uid: docSnap.id,
            name: d.fullName || d.name || 'Dr. Specialist',
            qualification: d.qualification || 'BVSc & AH',
            specialization: d.specialization || 'Veterinary Practitioner',
            experience: d.experience || '5 Years',
            phone: d.phone || '',
            email: d.email || '',
            status: d.status === 'active' || d.status === 'Active' ? 'Active' : 'On Leave',
            shopId: d.shopId || '',
            businessId: d.businessId || '',
            appointmentsCount: d.appointmentsCount || 0,
            photo: d.photoUrl || d.photo || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop',
          });
        });
        setDoctors(list);
      }
    } catch (e) {
      console.warn('Error loading doctors list:', e);
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [profile?.shopId, profile?.businessId]);

  const handleOpenEdit = (docItem: DoctorRecord) => {
    setSelectedDoctor(docItem);
    setFormData({
      name: docItem.name,
      qualification: docItem.qualification,
      specialization: docItem.specialization,
      experience: docItem.experience,
      phone: docItem.phone,
      email: docItem.email,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id: string) => {
    const docToUpdate = doctors.find((d) => d.id === id);
    if (!docToUpdate) return;
    const newStatus = docToUpdate.status === 'Active' ? 'On Leave' : 'Active';

    // Optimistic UI update
    setDoctors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );

    try {
      await updateDoc(doc(db, 'users', id), {
        status: newStatus.toLowerCase(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Could not persist status toggle:', err);
    }
  };

  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    setDoctors((prev) =>
      prev.map((d) =>
        d.id === selectedDoctor.id ? { ...d, ...formData } : d
      )
    );

    try {
      await updateDoc(doc(db, 'users', selectedDoctor.id), {
        fullName: formData.name,
        qualification: formData.qualification,
        specialization: formData.specialization,
        experience: formData.experience,
        phone: formData.phone,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to update doctor in Firestore:', err);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Doctor Roster & Vets"
        subtitle="Manage clinic veterinary surgeons, qualifications, availability, and active profiles for your clinic."
        action={
          <Link href="/admin/doctors/create">
            <Button icon={<Plus className="w-4 h-4" />}>
              Create Doctor
            </Button>
          </Link>
        }
      />

      {/* Clinic Context Badge */}
      {profile?.shopId && (
        <div className="p-3.5 bg-white border border-[#E8ECF0] rounded-2xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EAF8FE] text-[#0284C7] flex items-center justify-center border border-[#0284C7]/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#25242A]">Clinic Doctor Management</span>
              <span className="text-[11px] text-[#777980] block font-mono">
                Assigned Shop ID: <strong className="text-[#0284C7]">{profile.shopId}</strong>
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#0284C7] bg-[#EAF8FE] px-2.5 py-1 rounded-lg">
            Authorized Clinic Admin
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-[#E8ECF0] rounded-2xl p-12 text-center text-xs text-[#777980] flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#0284C7]" /> Loading Doctor Roster...
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white border border-[#E8ECF0] rounded-3xl p-10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EAF8FE] text-[#0284C7] flex items-center justify-center border border-[#0284C7]/20">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-[#25242A] text-base">No Doctors Registered for This Clinic Yet</h3>
            <p className="text-xs text-[#777980] mt-1 max-w-md mx-auto">
              As an authorized Clinic Admin, you can add licensed veterinary surgeons and staff doctors to your clinic roster.
            </p>
          </div>
          <Link href="/admin/doctors/create" className="inline-block pt-2">
            <Button icon={<Plus className="w-4 h-4" />}>
              Create First Doctor
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doctors.map((docItem) => (
            <Card key={docItem.id} className="relative">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#EAF8FE] text-[#0284C7] font-black text-lg flex items-center justify-center border border-[#0284C7]/20 shrink-0">
                  {(docItem.name || 'Dr').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#25242A] truncate">{docItem.name}</h3>
                    <StatusBadge status={docItem.status} />
                  </div>
                  <p className="text-xs font-semibold text-[#0284C7] mt-0.5">{docItem.specialization}</p>
                  <p className="text-[11px] text-[#737780] font-medium mt-1">{docItem.qualification}</p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-[#737780]">
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-[#0284C7]" /> {docItem.experience}
                    </span>
                    {docItem.shopId && (
                      <span className="font-mono text-[10px] font-bold text-[#7567E8] bg-[#F1EEFF] px-1.5 py-0.5 rounded">
                        {docItem.shopId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#E8ECF0] flex items-center justify-between text-xs">
                <div className="space-y-0.5 text-[#737780]">
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#7567E8]" /> {docItem.email}</p>
                  <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#7567E8]" /> {docItem.phone || 'No phone'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(docItem.id)}
                    icon={<Power className="w-3.5 h-3.5" />}
                  >
                    {docItem.status === 'Active' ? 'Set Leave' : 'Activate'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenEdit(docItem)}
                    icon={<Edit className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Doctor Profile"
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
