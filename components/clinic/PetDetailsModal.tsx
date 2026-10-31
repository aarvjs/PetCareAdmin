'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Dog,
  User,
  Phone,
  MapPin,
  Calendar,
  Syringe,
  History,
  Edit3,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';
import { PetPurchasedPackage } from '@/lib/vaccineSchedule';
import { RecordTreatmentModal } from './RecordTreatmentModal';

export interface PetDetailsModalPet {
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
  treatments?: any[];
}

export interface PetTreatmentRecord {
  id: string;
  petId: string;
  petName: string;
  registrationNumber: string;
  medicineName: string;
  medicineCategory: string;
  quantityUsed: number;
  unit: string;
  batchNumber?: string;
  dosage?: string;
  administeredAt: string;
  administeredByName?: string;
  nextDueDate?: string | null;
  notes?: string;
  createdAt?: string;
  vaccineBrand?: string;
  doseNumber?: string;
  totalDoses?: number | null;
  dosesRemaining?: number | null;
  scheduleStatus?: string;
}

interface PetDetailsModalProps {
  pet: PetDetailsModalPet | null;
  onClose: () => void;
  onOpenEditReg: (pet: PetDetailsModalPet) => void;
  isDoctor?: boolean;
}

export const PetDetailsModal: React.FC<PetDetailsModalProps> = ({
  pet,
  onClose,
  onOpenEditReg,
  isDoctor = false,
}) => {
  const { profile, business, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'treatments' | 'packages' | 'notes'>('profile');
  const [treatments, setTreatments] = useState<PetTreatmentRecord[]>([]);
  const [petPackages, setPetPackages] = useState<PetPurchasedPackage[]>([]);
  const [isLoadingTreatments, setIsLoadingTreatments] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isAdministeringDose, setIsAdministeringDose] = useState(false);

  // Medical Notes Editing (for Doctors)
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  useEffect(() => {
    if (pet) {
      setNotesText(pet.medicalNotes || '');
      setIsEditingNotes(false);
      setNotesSavedSuccess(false);
      setActiveTab('profile');
    }
  }, [pet]);

  // Real-time sync for this specific pet's treatment & vaccination history
  useEffect(() => {
    if (!pet?.id) return;

    setIsLoadingTreatments(true);

    // Initial load from pet.treatments or API
    if (Array.isArray(pet.treatments) && pet.treatments.length > 0) {
      const list = [...pet.treatments];
      list.sort((a: any, b: any) => new Date(b.administeredAt || 0).getTime() - new Date(a.administeredAt || 0).getTime());
      setTreatments(list);
      setIsLoadingTreatments(false);
    }

    const loadTreatments = async () => {
      try {
        const { ok, data } = await safeFetchJson<any>(`/api/clinic/treatments?petId=${pet.id}`);
        if (ok && data?.success && Array.isArray(data.treatments)) {
          setTreatments(data.treatments);
        }
      } catch (_) {}
      setIsLoadingTreatments(false);
    };

    const loadPackages = async () => {
      try {
        const { ok, data } = await safeFetchJson<any>(`/api/clinic/pets/${pet.id}/vaccine-packages`);
        if (ok && data?.success && Array.isArray(data.packages)) {
          setPetPackages(data.packages);
        }
      } catch (_) {}
    };

    loadTreatments();
    loadPackages();

    // Listen to the pet document directly (which stores treatments and vaccinePackages)
    const petDocRef = doc(db, 'pets', pet.id);
    const unsubscribe = onSnapshot(
      petDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const petData = docSnap.data();
          if (Array.isArray(petData.treatments)) {
            const list = [...petData.treatments];
            list.sort((a: any, b: any) => new Date(b.administeredAt || 0).getTime() - new Date(a.administeredAt || 0).getTime());
            setTreatments(list);
          }
          if (Array.isArray(petData.vaccinePackages)) {
            setPetPackages(petData.vaccinePackages);
          }
        }
        setIsLoadingTreatments(false);
      },
      () => {
        setIsLoadingTreatments(false);
      }
    );

    return () => unsubscribe();
  }, [pet?.id, pet?.treatments]);

  if (!pet) return null;

  // Save clinical notes
  const handleSaveMedicalNotes = async () => {
    setIsSavingNotes(true);
    setNotesSavedSuccess(false);
    try {
      const petDocRef = doc(db, 'pets', pet.id);
      await updateDoc(petDocRef, {
        medicalNotes: notesText.trim(),
        updatedAt: new Date().toISOString(),
      });
      setIsEditingNotes(false);
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2000);
    } catch (e: any) {
      console.error('Failed to save clinical notes:', e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Helper for booster status
  const getBoosterStatus = (nextDueDate?: string | null) => {
    if (!nextDueDate) return null;
    const today = new Date().toISOString().split('T')[0];
    if (nextDueDate >= today) {
      return { label: `Booster Due: ${nextDueDate}`, color: 'bg-[#F1EEFF] text-[#7567E8] border-[#7567E8]/30' };
    }
    return { label: `Booster Was Due: ${nextDueDate}`, color: 'bg-amber-50 text-amber-800 border-amber-200' };
  };

  // Administer next pending package dose
  const handleAdministerPackageDose = async (pkg: PetPurchasedPackage) => {
    if (pkg.remainingDoses <= 0) {
      alert('All doses under this package have already been administered.');
      return;
    }
    const nextPendingDose = pkg.doses.find((d) => d.status === 'pending');
    const doseLabel = nextPendingDose ? nextPendingDose.doseNumber : `Dose ${(pkg.administeredDoses || 0) + 1}`;
    if (!window.confirm(`Administer ${doseLabel} of ${pkg.packageName} today? Fee is ₹0 as it is covered under this prepaid package.`)) {
      return;
    }

    setIsAdministeringDose(true);
    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<any>(`/api/clinic/pets/${pet.id}/vaccine-packages/${pkg.id}/administer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          doseIndex: nextPendingDose ? nextPendingDose.doseIndex : (pkg.administeredDoses || 0) + 1,
          doctorName: profile?.fullName || 'Attending Doctor',
          notes: 'Administered under active prepaid package',
        }),
      });

      if (error || !data?.success) {
        alert(error || data?.error || 'Failed to record package dose.');
      } else {
        alert(`${doseLabel} successfully recorded and scheduled!`);
      }
    } catch (e: any) {
      alert(`Error administering dose: ${e.message}`);
    } finally {
      setIsAdministeringDose(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={!!pet}
        onClose={onClose}
        title={`Pet Patient Profile: ${pet.name}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs text-[#25242A] max-h-[78vh] overflow-y-auto pr-1">
          {/* Identity Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-[#F1EEFF] to-[#EAF8FE] border border-[#7567E8]/30 rounded-2xl">
            <div className="flex items-center gap-3.5 min-w-0">
              {pet.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.photoUrl}
                  alt={pet.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-[#7567E8] bg-white shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#7567E8]/40 flex items-center justify-center text-[#7567E8] shadow-2xs shrink-0">
                  <Dog className="w-8 h-8" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#25242A] truncate">{pet.name}</h3>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    {pet.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-[#737780] font-semibold mt-0.5">
                  {pet.species} • {pet.breed} • {pet.gender}
                </p>
                <p className="text-[11px] text-[#7567E8] font-bold mt-1">
                  Registered at {business?.name || 'Healthy Paws Pet Clinic'}
                </p>
              </div>
            </div>

            {/* Registration Number Badge & Edit Button */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#7567E8]/20">
              <span className="font-mono text-xs font-black text-[#7567E8] bg-white px-3 py-1.5 rounded-xl border border-[#7567E8]/50 shadow-2xs">
                {pet.registrationNumber || 'UNASSIGNED'}
              </span>
              <button
                onClick={() => onOpenEditReg(pet)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7567E8] hover:text-[#5849D9] transition-colors"
                title="Edit registration number"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Reg No</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-[#E8ECF0] pb-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-[#7567E8] text-white shadow-2xs'
                  : 'bg-[#F8FAFC] text-[#737780] hover:text-[#25242A]'
              }`}
            >
              <Dog className="w-3.5 h-3.5" />
              Pet & Owner Information
            </button>

            <button
              onClick={() => setActiveTab('treatments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'treatments'
                  ? 'bg-[#7567E8] text-white shadow-2xs'
                  : 'bg-[#F8FAFC] text-[#737780] hover:text-[#25242A]'
              }`}
            >
              <Syringe className="w-3.5 h-3.5" />
              Vaccination & Treatment History ({treatments.length})
            </button>

            <button
              onClick={() => setActiveTab('packages')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'packages'
                  ? 'bg-[#7567E8] text-white shadow-2xs'
                  : 'bg-[#F8FAFC] text-[#737780] hover:text-[#25242A]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Vaccine Packages ({petPackages.length})
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-[#7567E8] text-white shadow-2xs'
                  : 'bg-[#F8FAFC] text-[#737780] hover:text-[#25242A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Clinical Notes
            </button>
          </div>

          {/* TAB 1: PET & OWNER INFORMATION */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Biological Attributes */}
              <div>
                <h4 className="text-[11px] font-extrabold text-[#737780] uppercase tracking-wider mb-2">
                  Pet Biological Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
                    <span className="text-[10px] text-[#737780] font-bold uppercase block">Coat Colour</span>
                    <span className="font-bold text-xs text-[#25242A] mt-0.5 block">{pet.coatColour || 'Not noted'}</span>
                  </div>
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
                    <span className="text-[10px] text-[#737780] font-bold uppercase block">Date of Birth</span>
                    <span className="font-bold text-xs text-[#25242A] mt-0.5 block">{pet.dob || 'Not noted'}</span>
                  </div>
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
                    <span className="text-[10px] text-[#737780] font-bold uppercase block">Species / Breed</span>
                    <span className="font-bold text-xs text-[#25242A] mt-0.5 block truncate">{pet.species} • {pet.breed}</span>
                  </div>
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl">
                    <span className="text-[10px] text-[#737780] font-bold uppercase block">Gender</span>
                    <span className="font-bold text-xs text-[#25242A] mt-0.5 block">{pet.gender || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h4 className="text-[11px] font-extrabold text-[#737780] uppercase tracking-wider mb-2">
                  Owner / Guardian Information
                </h4>
                <div className="p-3.5 bg-white border border-[#E8ECF0] rounded-2xl space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#7567E8] shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#737780]">Owner Full Name</p>
                        <p className="text-xs font-bold text-[#25242A]">{pet.ownerName || 'Valued Pet Parent'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#7567E8] shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#737780]">Contact Number</p>
                        <p className="text-xs font-bold text-[#25242A]">{pet.contactNumber || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#7567E8] shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#737780]">Residential Address</p>
                        <p className="text-xs font-bold text-[#25242A] truncate" title={pet.ownerAddress}>
                          {pet.ownerAddress || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Timestamps & Audit History */}
              <div className="p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl flex items-center justify-between text-[11px] text-[#737780]">
                <span>Registered: {pet.createdAt ? new Date(pet.createdAt).toLocaleDateString() : 'N/A'}</span>
                <span>Last Updated: {pet.updatedAt ? new Date(pet.updatedAt).toLocaleDateString() : 'N/A'}</span>
              </div>

              {pet.auditHistory && pet.auditHistory.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[#E8ECF0]">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#737780] uppercase">
                    <History className="w-3.5 h-3.5" />
                    <span>Registration Change History</span>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {pet.auditHistory.map((h, i) => (
                      <div key={i} className="p-2 bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg text-[10px]">
                        <span className="font-bold text-[#25242A]">
                          {h.action === 'edit_registration_number' ? 'Registration No. Edited' : 'Initial Registration'}
                        </span>
                        {h.previousRegistrationNumber && (
                          <span className="ml-2 text-[#737780]">
                            Changed from <strong className="font-mono text-red-600">{h.previousRegistrationNumber}</strong> to{' '}
                            <strong className="font-mono text-[#7567E8]">{h.newRegistrationNumber}</strong>
                          </span>
                        )}
                        {h.reason && <p className="italic text-[#737780] mt-0.5">&ldquo;{h.reason}&rdquo;</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VACCINATION & TREATMENT HISTORY */}
          {activeTab === 'treatments' && (
            <div className="space-y-3">
              {/* Record Treatment Action Header */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#F1EEFF] to-[#EAF8FE] border border-[#7567E8]/20 rounded-xl">
                <div>
                  <h4 className="font-bold text-xs text-[#25242A]">Pet-Specific Clinical Injections & Vaccines</h4>
                  <p className="text-[11px] text-[#737780]">
                    Real-time chronological treatment logs linked exclusively to {pet.name}.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsRecordModalOpen(true)}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Record Treatment
                </Button>
              </div>

              {isLoadingTreatments ? (
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-6 h-6 text-[#7567E8] animate-spin mb-2" />
                  <p className="text-xs text-[#737780]">Loading treatment history...</p>
                </div>
              ) : treatments.length === 0 ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-[#E8ECF0] rounded-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto mb-2">
                    <Syringe className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-xs text-[#25242A]">No Treatments Recorded Yet</h4>
                  <p className="text-[11px] text-[#737780] max-w-xs mx-auto mt-0.5">
                    No injections or vaccinations have been administered to {pet.name}. Click &ldquo;Record Treatment&rdquo; to add one.
                  </p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsRecordModalOpen(true)}
                      icon={<Plus className="w-3.5 h-3.5 text-[#7567E8]" />}
                    >
                      Record First Treatment
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {treatments.map((t) => {
                    const isVac = (t.medicineCategory || '').toLowerCase() === 'vaccine';
                    const booster = getBoosterStatus(t.nextDueDate);

                    return (
                      <div
                        key={t.id}
                        className="p-3.5 bg-white border border-[#E8ECF0] hover:border-[#7567E8]/40 rounded-xl transition-all shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-xs text-[#25242A]">{t.medicineName}</h5>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  isVac ? 'bg-[#DFF7EE] text-[#35B779]' : 'bg-[#F1EEFF] text-[#7567E8]'
                                }`}
                              >
                                {t.medicineCategory}
                              </span>
                            </div>

                            <p className="text-[11px] text-[#737780] font-medium mt-0.5">
                              Administered on{' '}
                              <strong className="text-[#25242A]">
                                {t.administeredAt ? new Date(t.administeredAt).toLocaleString() : 'N/A'}
                              </strong>{' '}
                              by <strong className="text-[#25242A]">{t.administeredByName || 'Doctor'}</strong>
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-xs text-[#25242A] block">
                              {t.quantityUsed} {t.unit}
                            </span>
                            {t.dosage && (
                              <span className="text-[10px] text-[#737780] block">{t.dosage}</span>
                            )}
                          </div>
                        </div>

                        {/* Booster Badge & Batch Number */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E8ECF0]">
                          {t.doseNumber && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                              {t.doseNumber}
                              {t.totalDoses ? ` of ${t.totalDoses}` : ''}
                            </span>
                          )}

                          {t.vaccineBrand && (
                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Brand: {t.vaccineBrand}
                            </span>
                          )}

                          {t.dosesRemaining !== null && t.dosesRemaining !== undefined && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {t.dosesRemaining === 0 ? 'Series Complete' : `${t.dosesRemaining} remaining`}
                            </span>
                          )}

                          {booster && (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${booster.color} flex items-center gap-1`}
                            >
                              <Calendar className="w-3 h-3" />
                              {booster.label}
                            </span>
                          )}

                          {t.batchNumber && (
                            <span className="font-mono text-[10px] font-semibold text-[#737780] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E8ECF0]">
                              Batch: #{t.batchNumber}
                            </span>
                          )}

                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Administered & Stock Deducted
                          </span>
                        </div>

                        {t.notes && (
                          <p className="text-[11px] text-[#737780] bg-[#F8FAFC] p-2 rounded-lg italic">
                            &ldquo;{t.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLINICAL NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-extrabold text-[#737780] uppercase tracking-wider">
                  Veterinary Medical Examination Notes
                </h4>
                {isDoctor && !isEditingNotes && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingNotes(true)}
                    icon={<Edit3 className="w-3.5 h-3.5 text-[#7567E8]" />}
                  >
                    Edit Notes
                  </Button>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Enter clinical examination notes, chronic conditions, allergy alerts..."
                    className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3 text-xs text-[#25242A] focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotesText(pet.medicalNotes || '');
                      }}
                      disabled={isSavingNotes}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveMedicalNotes} disabled={isSavingNotes}>
                      {isSavingNotes ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                        </>
                      ) : (
                        'Save Notes'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#F8FAFC] border border-[#E8ECF0] text-[#25242A] rounded-2xl font-medium leading-relaxed min-h-[90px]">
                  {notesText || (
                    <span className="text-[#737780] italic">
                      No clinical examination notes recorded yet for this pet patient.
                    </span>
                  )}
                </div>
              )}

              {notesSavedSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Clinical examination notes updated successfully!</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VACCINE PACKAGES & DOSE TRACKING */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-extrabold text-[#737780] uppercase tracking-wider">
                  Purchased Multi-Dose Vaccine Packages
                </h4>
              </div>

              {petPackages.length === 0 ? (
                <div className="p-8 text-center bg-[#F8FAFC] border border-[#E8ECF0] rounded-2xl space-y-2">
                  <Syringe className="w-8 h-8 text-[#7567E8] mx-auto opacity-60" />
                  <p className="font-bold text-xs text-[#25242A]">No Vaccine Packages Active</p>
                  <p className="text-[11px] text-[#737780] max-w-xs mx-auto">
                    This pet does not have an active prepaid vaccine package. You can assign packages during walk-in or treatment recording.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {petPackages.map((pkg) => {
                    const pct = Math.round(((pkg.administeredDoses || 0) / (pkg.totalDoses || 1)) * 100);
                    const nextPending = pkg.doses?.find((d) => d.status === 'pending');

                    return (
                      <div key={pkg.id} className="p-4 bg-white border border-[#E8ECF0] rounded-2xl space-y-3 shadow-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-extrabold text-sm text-[#25242A]">{pkg.packageName}</h5>
                            <p className="text-xs text-[#7567E8] font-bold mt-0.5">{pkg.vaccineName}</p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              pkg.remainingDoses === 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {pkg.remainingDoses === 0 ? 'Series Completed' : `${pkg.remainingDoses} doses left`}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-[#737780] mb-1">
                            <span>
                              {pkg.administeredDoses} of {pkg.totalDoses} Doses Completed
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-[#7567E8] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#F8FAFC] rounded-xl text-center text-xs">
                          <div>
                            <span className="text-[10px] text-[#737780] block">Package Price</span>
                            <strong className="text-slate-900 font-bold">₹{pkg.packagePrice.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#737780] block">Amount Paid</span>
                            <strong className="text-emerald-700 font-bold">₹{(pkg.amountPaid || 0).toFixed(2)}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#737780] block">Balance</span>
                            <strong className="text-slate-700 font-bold">₹{(pkg.outstandingAmount || 0).toFixed(2)}</strong>
                          </div>
                        </div>

                        {/* Doses Timeline */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-extrabold text-[#737780] uppercase block">Dose History & Schedule</span>
                          <div className="divide-y divide-slate-100">
                            {Array.isArray(pkg.doses) &&
                              pkg.doses.map((dose) => (
                                <div key={dose.doseIndex} className="py-1.5 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                        dose.status === 'administered'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      {dose.doseIndex}
                                    </span>
                                    <span className="font-bold text-slate-800">{dose.doseNumber}</span>
                                    {dose.administeredAt && (
                                      <span className="text-[10px] text-slate-500">
                                        (Administered {dose.administeredAt.split('T')[0]})
                                      </span>
                                    )}
                                    {dose.status === 'pending' && dose.scheduledDate && (
                                      <span className="text-[10px] text-purple-700 font-semibold">
                                        (Scheduled: {dose.scheduledDate})
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                      dose.status === 'administered'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {dose.status === 'administered' ? 'Administered' : 'Pending'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Administer Action */}
                        {pkg.remainingDoses > 0 && nextPending && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleAdministerPackageDose(pkg)}
                              disabled={isAdministeringDose}
                              icon={<Syringe className="w-3.5 h-3.5" />}
                            >
                              {isAdministeringDose ? 'Recording...' : `Administer ${nextPending.doseNumber} (₹0 fee)`}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer Close Button */}
          <div className="pt-2 border-t border-[#E8ECF0] flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Treatment Modal */}
      <RecordTreatmentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        pet={pet}
        onSuccess={() => {
          setActiveTab('treatments');
        }}
      />
    </>
  );
};
