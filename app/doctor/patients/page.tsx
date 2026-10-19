'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Search,
  FileText,
  Dog,
  User,
  Phone,
  MapPin,
  Calendar,
  Palette,
  Transgender,
  ShieldAlert,
  Loader2,
  Edit3,
  History,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeFetchJson } from '@/lib/safeFetch';

export interface RegisteredPet {
  id: string;
  registrationNumber: string;
  ownerId: string;
  ownerName: string;
  ownerAddress: string;
  contactNumber: string;
  name: string;
  species: string;
  gender: string;
  coatColour: string;
  breed: string;
  dob: string;
  photoUrl?: string;
  storagePath?: string;
  businessId: string;
  shopId: string;
  status: string;
  medicalNotes?: string;
  lastVisit?: string;
  createdAt?: string;
  updatedAt?: string;
  auditHistory?: Array<{
    action?: string;
    previousRegistrationNumber?: string;
    newRegistrationNumber?: string;
    updatedByUid?: string;
    updatedByName?: string;
    updatedByRole?: string;
    timestamp?: string;
    reason?: string;
  }>;
}

export default function DoctorPatientsPage() {
  const { profile, business, user } = useAuth();
  const [pets, setPets] = useState<RegisteredPet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [selectedPet, setSelectedPet] = useState<RegisteredPet | null>(null);

  // Edit Registration Number State
  const [editingPet, setEditingPet] = useState<RegisteredPet | null>(null);
  const [newRegNumber, setNewRegNumber] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isUpdatingReg, setIsUpdatingReg] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Medical Notes Editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const targetBizId = profile?.businessId || business?.id || '';
  const targetShopId = profile?.shopId || business?.shopId || '';

  // 1. Live Firestore Sync for Business-scoped Registered Pets
  useEffect(() => {
    if (!targetBizId && !targetShopId && profile?.role !== 'super_admin') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const petsRef = collection(db, 'pets');
    const q = query(petsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let list: RegisteredPet[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            registrationNumber: data.registrationNumber || data.regNo || '',
            ownerId: data.ownerId || '',
            ownerName: data.ownerName || data.customerName || 'Valued Pet Parent',
            ownerAddress: data.ownerAddress || data.address || '',
            contactNumber: data.contactNumber || data.ownerPhone || data.phone || '',
            name: data.name || data.petName || 'Unnamed Pet',
            species: data.species || data.type || data.petType || 'Dog',
            gender: data.gender || 'Male',
            coatColour: data.coatColour || data.coatColor || '',
            breed: data.breed || 'Indie / Mixed',
            dob: data.dob || data.dateOfBirth || '',
            photoUrl: data.photoUrl || data.photo || data.image || '',
            storagePath: data.storagePath || '',
            businessId: data.businessId || '',
            shopId: data.shopId || '',
            status: data.status || 'Active',
            medicalNotes: data.medicalNotes || '',
            lastVisit: data.lastVisit || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            auditHistory: data.auditHistory || [],
          } as RegisteredPet;
        });

        // Strict multi-tenant isolation
        if (profile?.role === 'doctor' || profile?.role === 'admin') {
          list = list.filter((p) => {
            const matchBiz = targetBizId && p.businessId === targetBizId;
            const matchShop = targetShopId && p.shopId && p.shopId.toUpperCase() === targetShopId.toUpperCase();
            const isUnassigned = !p.businessId && !p.shopId;
            return Boolean(matchBiz || matchShop || isUnassigned);
          });
        }

        // Sort by registration number or createdAt
        list.sort((a, b) => {
          const regA = a.registrationNumber || '';
          const regB = b.registrationNumber || '';
          return regA.localeCompare(regB);
        });

        setPets(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[Doctor Patients Snapshot Error]', err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetBizId, targetShopId, profile?.role]);

  // 2. Filter & Search Logic
  const filtered = pets.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contactNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecies = speciesFilter === 'All' || p.species.toLowerCase() === speciesFilter.toLowerCase();
    return matchesSearch && matchesSpecies;
  });

  // 3. Open Edit Reg Number Modal
  const handleOpenEditReg = (pet: RegisteredPet) => {
    setEditingPet(pet);
    setNewRegNumber(pet.registrationNumber);
    setEditReason('');
    setUpdateError('');
    setUpdateSuccess('');
  };

  // 4. Save Corrected Registration Number with Audit Log
  const handleSaveRegNumber = async () => {
    if (!editingPet) return;
    const trimmed = newRegNumber.trim();
    if (!trimmed) {
      setUpdateError('Registration number cannot be empty.');
      return;
    }
    if (trimmed === editingPet.registrationNumber) {
      setUpdateError('Please enter a different registration number to update.');
      return;
    }
    if (!editReason.trim()) {
      setUpdateError('Please enter an audit reason for this correction.');
      return;
    }

    setIsUpdatingReg(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<{ success: boolean; error?: string; pet?: RegisteredPet }>(
        `/api/pets/${editingPet.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            registrationNumber: trimmed,
            reason: editReason.trim(),
            requesterUid: profile?.uid || user?.uid,
            updatedByUid: profile?.uid || user?.uid,
          }),
        }
      );

      if (error || !data?.success) {
        setUpdateError(error || data?.error || 'Failed to update registration number.');
      } else {
        setUpdateSuccess(`Registration number successfully updated to ${trimmed}!`);
        // Update local state if modal is open
        if (selectedPet && selectedPet.id === editingPet.id && data.pet) {
          setSelectedPet(data.pet);
        }
        setTimeout(() => {
          setEditingPet(null);
        }, 1200);
      }
    } catch (e: any) {
      setUpdateError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsUpdatingReg(false);
    }
  };

  // 5. Save Clinical Medical Notes
  const handleSaveNotes = async () => {
    if (!selectedPet) return;
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, 'pets', selectedPet.id), {
        medicalNotes: notesText.trim(),
        lastVisit: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        updatedAt: new Date().toISOString(),
      });
      setSelectedPet((prev) => (prev ? { ...prev, medicalNotes: notesText.trim() } : null));
      setEditingNotes(false);
    } catch (err: any) {
      console.error('Error saving notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Doctor Patient Directory"
        subtitle={`Live registry of pet patients registered for ${business?.name || 'Healthy Paws Pet Clinic'} (${targetShopId || 'SHOP-D9E8'}).`}
      />

      {/* Search & Species Filter Bar */}
      <Card padding="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search Reg No (e.g. HPPC/P/01), pet name, breed, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#72CFF2] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#25242A] focus:outline-none transition-colors"
            />
          </div>

          {/* Species Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map((type) => {
              const active = speciesFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setSpeciesFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    active
                      ? 'bg-[#0284C7] text-white shadow-2xs'
                      : 'bg-[#F8FAFC] text-[#737780] hover:text-[#25242A] border border-[#E8ECF0]'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse p-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="p-12" className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#EAF8FE] text-[#0284C7] flex items-center justify-center mx-auto mb-4 border border-[#72CFF2]/30">
            <Dog className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#25242A]">No Pet Patients Found</h3>
          <p className="text-xs text-[#737780] max-w-sm mx-auto mt-1 leading-relaxed">
            {searchTerm || speciesFilter !== 'All'
              ? 'No registered pet matches your current search or filter.'
              : `No registered pets found for ${business?.name || 'this clinic'}. Registered pets submitted via the customer app will appear here automatically in real time.`}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((pet) => (
            <Card key={pet.id} className="relative flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                {/* Pet Photo or Species Fallback */}
                {pet.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pet.photoUrl}
                    alt={pet.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-[#72CFF2] bg-white shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#EAF8FE] border border-[#72CFF2]/40 flex items-center justify-center text-[#0284C7] shrink-0">
                    <Dog className="w-8 h-8" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[#25242A] truncate">{pet.name}</h3>
                    {/* Official Registration Badge */}
                    <span className="font-mono text-[10px] font-black uppercase tracking-wider text-[#0284C7] bg-[#EAF8FE] px-2 py-0.5 rounded-lg border border-[#72CFF2]/30 shrink-0">
                      {pet.registrationNumber || 'UNASSIGNED'}
                    </span>
                  </div>

                  <p className="text-xs text-[#737780] font-medium mt-0.5">
                    {pet.species} • {pet.breed} • {pet.gender}
                  </p>

                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-[#25242A] font-semibold flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                      Owner: {pet.ownerName}
                    </p>
                    {pet.contactNumber && (
                      <p className="text-[#737780] font-medium flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-[#737780] shrink-0" />
                        {pet.contactNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3.5 border-t border-[#E8ECF0] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#737780]">
                  DOB: <strong className="text-[#25242A] font-semibold">{pet.dob || 'Not specified'}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditReg(pet)}
                    icon={<Edit3 className="w-3.5 h-3.5 text-[#0284C7]" />}
                  >
                    Edit Reg No
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setSelectedPet(pet);
                      setNotesText(pet.medicalNotes || '');
                      setEditingNotes(false);
                    }}
                    icon={<FileText className="w-3.5 h-3.5 text-white" />}
                  >
                    View Record
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Pet Patient Profile Modal */}
      <Modal
        isOpen={!!selectedPet}
        onClose={() => setSelectedPet(null)}
        title={`Patient Profile: ${selectedPet?.name}`}
        maxWidth="lg"
      >
        {selectedPet && (
          <div className="space-y-5 text-xs text-[#25242A]">
            {/* Top Identity Banner */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#EAF8FE] to-[#F1EEFF] border border-[#72CFF2]/30 rounded-2xl">
              {selectedPet.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedPet.photoUrl}
                  alt={selectedPet.name}
                  className="w-18 h-18 rounded-2xl object-cover border border-[#72CFF2] bg-white shadow-xs"
                />
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-white border border-[#72CFF2]/40 flex items-center justify-center text-[#0284C7] shadow-xs">
                  <Dog className="w-9 h-9" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-black text-[#25242A] truncate">{selectedPet.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#0284C7] bg-white px-2.5 py-1 rounded-xl border border-[#72CFF2]/50 shadow-2xs">
                      {selectedPet.registrationNumber}
                    </span>
                    <button
                      onClick={() => handleOpenEditReg(selectedPet)}
                      className="p-1.5 text-[#0284C7] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#72CFF2]"
                      title="Correct registration number"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#737780] font-semibold mt-0.5">
                  {selectedPet.species} • {selectedPet.breed} • {selectedPet.gender}
                </p>
                <p className="text-[11px] text-[#7567E8] font-bold mt-1">
                  Registered at {business?.name || 'Healthy Paws Clinic'}
                </p>
              </div>
            </div>

            {/* Physical & Clinical Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
                <span className="text-[10px] text-[#737780] font-bold uppercase tracking-wider block">Coat Colour</span>
                <span className="font-bold text-xs text-[#25242A] mt-1 block">{selectedPet.coatColour || 'Not noted'}</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
                <span className="text-[10px] text-[#737780] font-bold uppercase tracking-wider block">Date of Birth</span>
                <span className="font-bold text-xs text-[#25242A] mt-1 block">{selectedPet.dob || 'Not noted'}</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
                <span className="text-[10px] text-[#737780] font-bold uppercase tracking-wider block">Species</span>
                <span className="font-bold text-xs text-[#25242A] mt-1 block">{selectedPet.species}</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
                <span className="text-[10px] text-[#737780] font-bold uppercase tracking-wider block">Status</span>
                <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-1">
                  {selectedPet.status}
                </span>
              </div>
            </div>

            {/* Owner Contact Card */}
            <div className="p-4 bg-white border border-[#E8ECF0] rounded-2xl space-y-2">
              <h4 className="text-xs font-extrabold text-[#737780] uppercase tracking-wider">Owner / Guardian Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0284C7] shrink-0" />
                  <div>
                    <p className="text-[10px] text-[#737780]">Full Name</p>
                    <p className="text-xs font-bold text-[#25242A]">{selectedPet.ownerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0284C7] shrink-0" />
                  <div>
                    <p className="text-[10px] text-[#737780]">Contact Number</p>
                    <p className="text-xs font-bold text-[#25242A]">{selectedPet.contactNumber || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0284C7] shrink-0" />
                  <div>
                    <p className="text-[10px] text-[#737780]">Residential Address</p>
                    <p className="text-xs font-bold text-[#25242A] truncate" title={selectedPet.ownerAddress}>
                      {selectedPet.ownerAddress || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Veterinary Examination & Clinical Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-xs text-[#25242A] uppercase tracking-wider">Veterinary Clinical Notes</p>
                {!editingNotes ? (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="text-xs text-[#0284C7] font-bold hover:underline"
                  >
                    Edit Notes
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="text-xs text-[#737780] font-bold hover:underline"
                    >
                      Cancel
                    </button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveNotes}
                      isLoading={isSavingNotes}
                    >
                      Save Notes
                    </Button>
                  </div>
                )}
              </div>

              {editingNotes ? (
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={4}
                  placeholder="Record patient medical observations, prescriptions, allergies, or diagnosis..."
                  className="w-full bg-[#F8FAFC] border border-[#72CFF2] rounded-xl p-3 text-xs text-[#25242A] focus:outline-none"
                />
              ) : (
                <div className="p-4 bg-[#F8FAFC] border border-[#E8ECF0] text-[#25242A] rounded-2xl font-medium leading-relaxed min-h-[70px]">
                  {selectedPet.medicalNotes || (
                    <span className="text-[#737780] italic">No clinical notes recorded yet for this patient.</span>
                  )}
                </div>
              )}
            </div>

            {/* Registration Audit History */}
            {selectedPet.auditHistory && selectedPet.auditHistory.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E8ECF0]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#737780]" />
                  <p className="font-extrabold text-xs text-[#737780] uppercase tracking-wider">
                    Registration Audit History
                  </p>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedPet.auditHistory.map((h, i) => (
                    <div key={i} className="p-2.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#25242A]">
                          {h.action === 'edit_registration_number' ? 'Registration No. Edited' : 'Initial Registration'}
                        </span>
                        <span className="text-[#737780] text-[10px]">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      {h.previousRegistrationNumber && (
                        <p className="text-[#737780]">
                          Changed from <strong className="font-mono text-[#E46A6A]">{h.previousRegistrationNumber}</strong> to{' '}
                          <strong className="font-mono text-[#0284C7]">{h.newRegistrationNumber}</strong>
                        </p>
                      )}
                      {h.reason && <p className="text-[#737780] italic">&ldquo;{h.reason}&rdquo;</p>}
                      <p className="text-[10px] text-[#737780]">
                        By: <strong className="text-[#25242A]">{h.updatedByName || h.updatedByRole || 'Staff'}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Registration Number Modal (Requirement 2) */}
      <Modal
        isOpen={!!editingPet}
        onClose={() => setEditingPet(null)}
        title="Edit Pet Registration Number"
        maxWidth="md"
      >
        {editingPet && (
          <div className="space-y-4 text-xs text-[#25242A]">
            <div className="p-3 bg-[#EAF8FE] border border-[#72CFF2]/40 rounded-xl">
              <p className="text-xs font-bold text-[#0284C7]">Authorized Doctor Correction Workflow</p>
              <p className="text-[11px] text-[#737780] mt-0.5">
                Modifying this number requires validation against duplicate entries and writes an immutable audit record.
              </p>
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Pet Patient</label>
              <p className="text-xs text-[#737780] font-semibold">{editingPet.name} ({editingPet.breed} • Owner: {editingPet.ownerName})</p>
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Current Registration Number</label>
              <span className="font-mono text-xs font-black bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E8ECF0] inline-block text-[#737780]">
                {editingPet.registrationNumber}
              </span>
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">New Registration Number *</label>
              <input
                type="text"
                value={newRegNumber}
                onChange={(e) => setNewRegNumber(e.target.value)}
                placeholder="e.g. HPPC/P/01-A"
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#72CFF2] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#25242A] focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Audit Reason for Change *</label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={2}
                placeholder="Specify clinical or clerical reason for correction (e.g. Corrected sequential certificate typo)..."
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#72CFF2] rounded-xl p-3 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            {updateError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            {updateSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{updateSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingPet(null)}
                disabled={isUpdatingReg}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveRegNumber}
                isLoading={isUpdatingReg}
              >
                Save &amp; Log Audit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
