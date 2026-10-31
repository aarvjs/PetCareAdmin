'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Syringe,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Boxes,
  Loader2,
  AlertTriangle,
  Info,
  ShieldCheck,
  History,
  Search,
  X,
  Plus,
  Trash2,
  Package,
} from 'lucide-react';
import { collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';
import { ClinicMedicineItem } from './ClinicInventoryManager';
import {
  calculateVaccineDoseSchedule,
  getVaccineHistoryForPet,
  isVaccineItem,
  VACCINE_BRAND_OPTIONS,
  DOSE_OPTIONS,
  PetPurchasedPackage,
} from '@/lib/vaccineSchedule';

export interface SelectedVaccineItem {
  id: string; // unique frontend id
  medicineId: string;
  name: string;
  category: string;
  stockQuantity: number;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  brand: string;
  doseNumber: string;
  totalDoses: number | null;
  dosesRemaining: number | null;
  scheduleStatus: string;
  administeredAt: string; // YYYY-MM-DDTHH:mm
  nextDueDate: string; // YYYY-MM-DD
  dosage: string;
  quantityUsed: number;
  notes: string;
  packageId?: string | null;
  packageName?: string | null;
  isPackageCovered?: boolean;
}

interface RecordTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: {
    id: string;
    name: string;
    registrationNumber: string;
    breed?: string;
    species?: string;
    ownerName?: string;
    businessId?: string;
    shopId?: string;
    treatments?: any[];
    vaccinePackages?: PetPurchasedPackage[];
  };
  onSuccess?: (treatment: any) => void;
}

export const RecordTreatmentModal: React.FC<RecordTreatmentModalProps> = ({
  isOpen,
  onClose,
  pet,
  onSuccess,
}) => {
  const { profile, business, user } = useAuth();
  const [medicines, setMedicines] = useState<ClinicMedicineItem[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(true);

  // Active pet packages
  const [petPackages, setPetPackages] = useState<PetPurchasedPackage[]>([]);

  // Search & Multi-select State for Vaccines
  const [vaccineSearch, setVaccineSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedVaccines, setSelectedVaccines] = useState<SelectedVaccineItem[]>([]);

  // Optional Standard Non-vaccine Medicine State
  const [selectedMedId, setSelectedMedId] = useState('');
  const [medQuantity, setMedQuantity] = useState('1');
  const [medDosage, setMedDosage] = useState('');
  const [medNotes, setMedNotes] = useState('');

  // Quick Add Medicine State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickMedName, setQuickMedName] = useState('');
  const [quickMedCategory, setQuickMedCategory] = useState('Vaccine');
  const [quickMedStock, setQuickMedStock] = useState('10');
  const [quickMedUnit, setQuickMedUnit] = useState('vial');
  const [quickMedPrice, setQuickMedPrice] = useState('500');
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');

  // Execution state
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const targetBizId = profile?.businessId || business?.id || pet.businessId || '';
  const targetShopId = profile?.shopId || business?.shopId || pet.shopId || '';

  // Current timestamp formatted for datetime-local
  const getDefaultDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(`idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      setSelectedVaccines([]);
      setVaccineSearch('');
      setIsDropdownOpen(false);
      setSelectedMedId('');
      setMedQuantity('1');
      setMedDosage('');
      setMedNotes('');
      setErrorMessage('');
      setSuccessMessage('');

      // Load pet packages
      if (Array.isArray(pet.vaccinePackages)) {
        setPetPackages(pet.vaccinePackages);
      } else {
        safeFetchJson<{ success: boolean; packages: PetPurchasedPackage[] }>(
          `/api/clinic/pets/${pet.id}/vaccine-packages`
        ).then(({ data }) => {
          if (data?.success && Array.isArray(data.packages)) {
            setPetPackages(data.packages);
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, pet]);

  // Load clinic inventory
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingMedicines(true);

    const loadInventory = async () => {
      try {
        const idToken = user ? await user.getIdToken() : '';
        const { ok, data } = await safeFetchJson<any>('/api/clinic/inventory', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-uid': profile?.uid || user?.uid || '',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        if (ok && data?.success && Array.isArray(data.items)) {
          setMedicines(data.items);
        }
      } catch (_) {}
      setIsLoadingMedicines(false);
    };

    loadInventory();

    try {
      const colRef = collection(db, 'inventory');
      const q = query(colRef);
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            let list: ClinicMedicineItem[] = snapshot.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: data.name || '',
                category: data.category || 'Medicine',
                stockQuantity: typeof data.stockQuantity === 'number' ? data.stockQuantity : parseInt(data.stockQuantity || '0', 10),
                unit: data.unit || 'unit',
                batchNumber: data.batchNumber || '',
                expiryDate: data.expiryDate || '',
                lowStockThreshold: typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : 5,
                businessId: data.businessId || '',
                shopId: data.shopId || '',
                status: data.status || 'active',
              };
            });

            if (profile?.role !== 'super_admin') {
              list = list.filter((item) => {
                const matchBiz = targetBizId && item.businessId === targetBizId;
                const matchShop = targetShopId && item.shopId && item.shopId.toUpperCase() === targetShopId.toUpperCase();
                const unassigned = !item.businessId && !item.shopId;
                return Boolean(matchBiz || matchShop || unassigned);
              });
            }

            list.sort((a, b) => a.name.localeCompare(b.name));
            setMedicines(list);
            setIsLoadingMedicines(false);
          }
        },
        () => {
          setIsLoadingMedicines(false);
        }
      );
      return () => unsubscribe();
    } catch (_) {
      setIsLoadingMedicines(false);
    }
  }, [isOpen, targetBizId, targetShopId, profile?.role, user, profile?.uid]);

  // Only active medicines are selectable for new treatments
  const activeMedicines = useMemo(() => {
    return medicines.filter((m) => m.status === 'active' || !m.status);
  }, [medicines]);

  // Filter medicines: Separate vaccines and non-vaccine medicines
  const vaccineInventory = useMemo(() => {
    return activeMedicines.filter((m) => isVaccineItem(m.category, m.name));
  }, [activeMedicines]);

  const nonVaccineInventory = useMemo(() => {
    return activeMedicines.filter((m) => !isVaccineItem(m.category, m.name));
  }, [activeMedicines]);

  // Filtered vaccines for search dropdown
  const filteredVaccineOptions = useMemo(() => {
    const s = vaccineSearch.toLowerCase().trim();
    const alreadySelectedIds = new Set(selectedVaccines.map((v) => v.medicineId));

    return vaccineInventory.filter((v) => {
      if (alreadySelectedIds.has(v.id)) return false;
      if (!s) return true;
      return (
        v.name.toLowerCase().includes(s) ||
        (v.batchNumber || '').toLowerCase().includes(s) ||
        v.category.toLowerCase().includes(s)
      );
    });
  }, [vaccineInventory, vaccineSearch, selectedVaccines]);

  // Add vaccine to selected list
  const handleSelectVaccine = (med: ClinicMedicineItem) => {
    const petTreatments = Array.isArray(pet.treatments) ? pet.treatments : [];
    const history = getVaccineHistoryForPet(petTreatments, med.name);

    // Check if pet has an active purchased package for this vaccine
    const matchingPackage = petPackages.find(
      (pkg) =>
        pkg.status === 'active' &&
        pkg.remainingDoses > 0 &&
        (pkg.vaccineName.toLowerCase().includes(med.name.toLowerCase()) ||
          med.name.toLowerCase().includes(pkg.vaccineName.toLowerCase()))
    );

    const schedule = calculateVaccineDoseSchedule({
      vaccineName: med.name,
      petSpecies: pet.species,
      historicalDoses: history,
      adminDate: new Date(),
    });

    const newItem: SelectedVaccineItem = {
      id: `sel_vac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      medicineId: med.id,
      name: med.name,
      category: med.category || 'Vaccine',
      stockQuantity: med.stockQuantity,
      unit: med.unit || 'dose',
      batchNumber: med.batchNumber,
      expiryDate: med.expiryDate,
      brand: schedule.suggestedBrand || '',
      doseNumber: matchingPackage
        ? `Dose ${(matchingPackage.administeredDoses || 0) + 1}`
        : schedule.suggestedDoseNumber,
      totalDoses: matchingPackage ? matchingPackage.totalDoses : schedule.totalDoses,
      dosesRemaining: matchingPackage
        ? Math.max(0, matchingPackage.remainingDoses - 1)
        : schedule.dosesRemaining,
      scheduleStatus: matchingPackage ? 'Covered under package' : schedule.scheduleStatus,
      administeredAt: getDefaultDateTime(),
      nextDueDate: matchingPackage?.nextScheduledDoseDate || schedule.suggestedNextDueDate || '',
      dosage: '1 ml subcutaneous',
      quantityUsed: 1,
      notes: matchingPackage ? `Administered under package "${matchingPackage.packageName}".` : '',
      packageId: matchingPackage?.id || null,
      packageName: matchingPackage?.packageName || null,
      isPackageCovered: Boolean(matchingPackage),
    };

    setSelectedVaccines((prev) => [...prev, newItem]);
    setVaccineSearch('');
    setIsDropdownOpen(false);
  };

  // Remove selected vaccine chip
  const handleRemoveVaccine = (id: string) => {
    setSelectedVaccines((prev) => prev.filter((v) => v.id !== id));
  };

  // Update field of an individual selected vaccine
  const handleVaccineChange = (
    id: string,
    field: keyof SelectedVaccineItem,
    value: any
  ) => {
    setSelectedVaccines((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const updated = { ...v, [field]: value };

        // If doseNumber changed, recalculate remaining doses if totalDoses is known
        if (field === 'doseNumber' && v.totalDoses !== null) {
          const match = String(value).match(/\d+/);
          if (match) {
            const num = parseInt(match[0], 10);
            updated.dosesRemaining = Math.max(0, v.totalDoses - num);
          }
        }
        return updated;
      })
    );
  };

  // Quick next due date shortcut for individual vaccine
  const applyQuickNextDueDate = (id: string, days: number) => {
    const item = selectedVaccines.find((v) => v.id === id);
    const base = item?.administeredAt ? new Date(item.administeredAt) : new Date();
    base.setDate(base.getDate() + days);
    handleVaccineChange(id, 'nextDueDate', base.toISOString().split('T')[0]);
  };

  // Non-vaccine medicine details
  const selectedNonVacMed = nonVaccineInventory.find((m) => m.id === selectedMedId);

  // Quick Add Medicine Handler
  const handleQuickAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMedName.trim()) {
      setQuickAddError('Medicine or vaccine name is required.');
      return;
    }
    setIsQuickSaving(true);
    setQuickAddError('');

    const newMedId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const parsedStock = parseInt(quickMedStock, 10) || 10;
    const parsedPrice = parseFloat(quickMedPrice) || 0;

    const payload = {
      name: quickMedName.trim(),
      category: quickMedCategory,
      stockQuantity: parsedStock,
      unit: quickMedUnit.trim().toLowerCase(),
      price: parsedPrice,
      lowStockThreshold: 5,
      status: 'active' as const,
      businessId: targetBizId,
      shopId: targetShopId,
    };

    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<any>('/api/clinic/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const savedItem: ClinicMedicineItem = {
        id: (data as any)?.item?.id || newMedId,
        ...payload,
      };

      if (error || !data?.success) {
        await setDoc(doc(db, 'inventory', newMedId), {
          id: newMedId,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setMedicines((prev) => [...prev, savedItem]);
      if (isVaccineItem(savedItem.category, savedItem.name)) {
        handleSelectVaccine(savedItem);
      } else {
        setSelectedMedId(savedItem.id);
      }
      setIsQuickAddOpen(false);
      setQuickMedName('');
    } catch (err: any) {
      setQuickAddError(err.message || 'Failed to quickly add medicine.');
    } finally {
      setIsQuickSaving(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedVaccines.length === 0 && !selectedMedId) {
      setErrorMessage('Please select at least one vaccine or medicine to record.');
      return;
    }

    // Check stock for all selected vaccines
    for (const v of selectedVaccines) {
      if (v.stockQuantity < v.quantityUsed) {
        setErrorMessage(
          `Insufficient stock for "${v.name}". Available stock is ${v.stockQuantity} ${v.unit}, but ${v.quantityUsed} was requested.`
        );
        return;
      }
    }

    // Check non-vaccine stock
    if (selectedNonVacMed) {
      const req = parseFloat(medQuantity) || 1;
      if (selectedNonVacMed.stockQuantity < req) {
        setErrorMessage(
          `Insufficient stock for "${selectedNonVacMed.name}". Available stock is ${selectedNonVacMed.stockQuantity} ${selectedNonVacMed.unit}.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const idToken = user ? await user.getIdToken() : '';

      // Prepare payload
      const vaccinesPayload = selectedVaccines.map((v) => ({
        medicineId: v.medicineId,
        medicineName: v.name,
        medicineCategory: 'Vaccine',
        vaccineBrand: v.brand,
        doseNumber: v.doseNumber,
        totalDoses: v.totalDoses,
        dosesRemaining: v.dosesRemaining,
        scheduleStatus: v.scheduleStatus,
        quantityUsed: v.quantityUsed,
        unit: v.unit,
        batchNumber: v.batchNumber || '',
        dosage: v.dosage,
        administeredAt: v.administeredAt ? new Date(v.administeredAt).toISOString() : new Date().toISOString(),
        nextDueDate: v.nextDueDate ? v.nextDueDate.trim() : null, // Independent next due date!
        notes: v.notes,
        packageId: v.packageId || null,
        packageName: v.packageName || null,
        isPackageCovered: v.isPackageCovered || false,
      }));

      // Non-vaccine medicine if selected
      if (selectedNonVacMed) {
        vaccinesPayload.push({
          medicineId: selectedNonVacMed.id,
          medicineName: selectedNonVacMed.name,
          medicineCategory: selectedNonVacMed.category || 'Medicine',
          vaccineBrand: '',
          doseNumber: '',
          totalDoses: null,
          dosesRemaining: null,
          scheduleStatus: '',
          quantityUsed: parseFloat(medQuantity) || 1,
          unit: selectedNonVacMed.unit || 'unit',
          batchNumber: selectedNonVacMed.batchNumber || '',
          dosage: medDosage.trim() || `${medQuantity} ${selectedNonVacMed.unit || 'unit'}`,
          administeredAt: new Date().toISOString(),
          nextDueDate: null,
          notes: medNotes.trim(),
          packageId: null,
          packageName: null,
          isPackageCovered: false,
        });
      }

      const payload = {
        petId: pet.id,
        vaccines: vaccinesPayload,
        idempotencyKey,
        requesterUid: profile?.uid || user?.uid,
        administeredByName: profile?.fullName || user?.displayName || 'Doctor',
      };

      const { data, error } = await safeFetchJson<{
        success: boolean;
        error?: string;
        message?: string;
        treatments?: any[];
        treatment?: any;
        count?: number;
      }>('/api/clinic/treatments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (error || !data?.success) {
        setErrorMessage(error || data?.error || 'Failed to record treatments.');
      } else {
        setSuccessMessage(data.message || 'Treatments recorded and stock deducted successfully!');
        if (onSuccess) {
          onSuccess(data.treatments || [data.treatment]);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Record Clinical Treatment & Vaccinations"
        maxWidth="2xl"
      >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-[#25242A]">
        {/* Pet Summary Banner */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#F1EEFF] to-[#EAF8FE] border border-[#7567E8]/30 rounded-xl">
          <div>
            <h4 className="font-extrabold text-sm text-[#25242A]">{pet.name}</h4>
            <p className="text-[11px] text-[#737780] font-medium">
              {pet.species} • {pet.breed || 'Breed N/A'} • Owner: <strong>{pet.ownerName || 'Valued Client'}</strong>
            </p>
          </div>
          <span className="font-mono text-xs font-black text-[#7567E8] bg-white px-2.5 py-1 rounded-lg border border-[#7567E8]/30">
            {pet.registrationNumber || 'HPPC/P'}
          </span>
        </div>

        {/* FEATURE 1: MULTI-VACCINE SELECTION */}
        <div className="space-y-3 p-3.5 bg-[#FAF9FF] border border-[#ECE8FF] rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[#7567E8] font-bold">
              <Syringe className="w-4 h-4" />
              <span>Select Vaccines Administered (Multi-Select Supported)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickMedCategory('Vaccine');
                  setQuickMedUnit('vial');
                  setQuickMedStock('10');
                  setQuickMedPrice('500');
                  setIsQuickAddOpen(true);
                }}
                className="text-[11px] font-bold text-[#7567E8] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Quick Add to Catalog
              </button>
              <span className="text-[10px] text-[#6E6D79]">
                • {selectedVaccines.length} Selected
              </span>
            </div>
          </div>

          {/* Searchable Multi-Select Dropdown */}
          <div className="relative">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#737780] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search & add vaccine (e.g. 9 in 1, Anti-Rabies, Puppy DP, Corona...)"
                value={vaccineSearch}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setVaccineSearch(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full bg-white border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-8 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            {/* Dropdown Options List */}
            {isDropdownOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-[#E8ECF0] rounded-xl shadow-lg divide-y divide-gray-100">
                {isLoadingMedicines ? (
                  <div className="p-3 text-center text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-[#7567E8]" />
                    <span>Loading vaccines...</span>
                  </div>
                ) : filteredVaccineOptions.length === 0 ? (
                  <div className="p-3 text-center text-gray-400 text-xs">
                    {vaccineSearch ? 'No matching vaccines found' : 'All available vaccines already selected'}
                  </div>
                ) : (
                  filteredVaccineOptions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVaccine(v)}
                      className="w-full text-left px-3 py-2 hover:bg-[#FAF9FF] flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-bold text-[#25242A] block">{v.name}</span>
                        <span className="text-[10px] text-[#737780]">
                          {v.category} {v.batchNumber ? `• Batch: #${v.batchNumber}` : ''}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          v.stockQuantity > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          Stock: {v.stockQuantity} {v.unit}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Vaccine Chips / Removable Cards */}
          {selectedVaccines.length > 0 && (
            <div className="space-y-3 pt-2">
              {selectedVaccines.map((v, idx) => (
                <div
                  key={v.id}
                  className="bg-white border border-[#E4E0FF] rounded-xl p-3 shadow-2xs space-y-2.5 relative"
                >
                  {/* Top Bar of Vaccine Card */}
                  <div className="flex items-start justify-between gap-2 border-b border-[#F0EDFF] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#7567E8]/10 text-[#7567E8] font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h5 className="font-bold text-xs text-[#25242A]">{v.name}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-[#737780]">
                          <span>Stock: {v.stockQuantity} {v.unit}</span>
                          {v.batchNumber && <span>• Batch: #{v.batchNumber}</span>}
                          {v.isPackageCovered && (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Covered under {v.packageName} (₹0 Fee)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveVaccine(v.id)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove this vaccine"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Vaccine Configuration Grid: Brand, Dose Number, Administered At, Next Due Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-[#6E6D79] block mb-0.5">
                        Brand
                      </label>
                      <input
                        type="text"
                        list={`brand-options-${v.id}`}
                        value={v.brand}
                        onChange={(e) => handleVaccineChange(v.id, 'brand', e.target.value)}
                        placeholder="e.g. Nobivac"
                        className="w-full bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg px-2.5 py-1.5 text-xs text-[#25242A] focus:outline-none focus:border-[#7567E8]"
                      />
                      <datalist id={`brand-options-${v.id}`}>
                        {VACCINE_BRAND_OPTIONS.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#6E6D79] block mb-0.5">
                        Dose Number *
                      </label>
                      <select
                        value={v.doseNumber}
                        onChange={(e) => handleVaccineChange(v.id, 'doseNumber', e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg px-2 py-1.5 text-xs font-bold text-[#7567E8] focus:outline-none focus:border-[#7567E8]"
                      >
                        {DOSE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#6E6D79] block mb-0.5">
                        Administered Date *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={v.administeredAt}
                        onChange={(e) => handleVaccineChange(v.id, 'administeredAt', e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg px-2 py-1 text-xs text-[#25242A] focus:outline-none focus:border-[#7567E8]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#6E6D79] block mb-0.5">
                        Next Due Date (Independent) *
                      </label>
                      <input
                        type="date"
                        value={v.nextDueDate}
                        onChange={(e) => handleVaccineChange(v.id, 'nextDueDate', e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg px-2 py-1 text-xs font-bold text-[#25242A] focus:outline-none focus:border-[#7567E8]"
                      />
                    </div>
                  </div>

                  {/* Individual Vaccine Quick Due Interval Buttons & Notes */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F0EDFF] text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#6E6D79] font-medium">Quick interval:</span>
                      <button
                        type="button"
                        onClick={() => applyQuickNextDueDate(v.id, 21)}
                        className="px-2 py-0.5 rounded bg-gray-100 hover:bg-[#7567E8]/10 hover:text-[#7567E8] font-bold"
                      >
                        +21 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickNextDueDate(v.id, 28)}
                        className="px-2 py-0.5 rounded bg-gray-100 hover:bg-[#7567E8]/10 hover:text-[#7567E8] font-bold"
                      >
                        +28 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuickNextDueDate(v.id, 365)}
                        className="px-2 py-0.5 rounded bg-gray-100 hover:bg-[#7567E8]/10 hover:text-[#7567E8] font-bold"
                      >
                        +1 Year (Booster)
                      </button>
                    </div>

                    {v.dosesRemaining !== null && (
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {v.dosesRemaining === 0 ? 'Series Complete' : `${v.dosesRemaining} doses remaining`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OPTIONAL: Standard Non-Vaccine Medicine / Injection Section */}
        <div className="p-3 bg-white border border-[#E8ECF0] rounded-xl space-y-2">
          <label className="font-bold text-xs text-[#25242A] flex items-center justify-between">
            <span>Also Administer General Medicine / Injection (Optional)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setQuickMedCategory('Injection');
                  setQuickMedUnit('ampoule');
                  setQuickMedStock('10');
                  setQuickMedPrice('150');
                  setIsQuickAddOpen(true);
                }}
                className="text-[11px] font-bold text-[#7567E8] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Quick Add Medicine
              </button>
              <span className="text-[10px] text-[#737780] font-normal">Antibiotics, pain relief, saline, etc.</span>
            </div>
          </label>
          <select
            value={selectedMedId}
            onChange={(e) => {
              setSelectedMedId(e.target.value);
              const found = nonVaccineInventory.find((m) => m.id === e.target.value);
              if (found) {
                setMedDosage(`1 ${found.unit}`);
              }
            }}
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-medium text-[#25242A] focus:outline-none"
          >
            <option value="">-- No general medicine (Vaccines only) --</option>
            {nonVaccineInventory.map((med) => (
              <option key={med.id} value={med.id}>
                {med.name} ({med.category}) — Stock: {med.stockQuantity} {med.unit}
              </option>
            ))}
          </select>

          {selectedNonVacMed && (
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#6E6D79] block mb-0.5">Quantity ({selectedNonVacMed.unit})</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={selectedNonVacMed.stockQuantity}
                  value={medQuantity}
                  onChange={(e) => setMedQuantity(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#6E6D79] block mb-0.5">Dosage / Route</label>
                <input
                  type="text"
                  placeholder="e.g. 1 ml IM"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg px-2.5 py-1 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error / Success Messages */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 font-semibold text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E8ECF0]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || (selectedVaccines.length === 0 && !selectedMedId)}
            icon={
              isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Syringe className="w-3.5 h-3.5" />
              )
            }
          >
            {isSubmitting
              ? 'Saving & Deducting Stock...'
              : selectedVaccines.length > 1
              ? `Record ${selectedVaccines.length} Vaccines`
              : 'Record Treatment'}
          </Button>
        </div>
      </form>
    </Modal>

    {/* Quick Add Medicine / Vaccine Modal */}
    <Modal
      isOpen={isQuickAddOpen}
      onClose={() => {
        setIsQuickAddOpen(false);
        setQuickAddError('');
      }}
      title={`Quick Add ${quickMedCategory === 'Vaccine' ? 'Vaccine' : 'Medicine'} to Catalog`}
      subtitle="Adds directly to clinical inventory and automatically selects it for this treatment"
      maxWidth="md"
    >
      <form onSubmit={handleQuickAddMedicine} className="space-y-4 pt-2">
        {quickAddError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{quickAddError}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-[#25242A] block mb-1">
            {quickMedCategory === 'Vaccine' ? 'Vaccine Name' : 'Medicine Name'} *
          </label>
          <input
            type="text"
            required
            placeholder={
              quickMedCategory === 'Vaccine'
                ? 'e.g. Nobivac DHPPi, Rabies Defensor'
                : 'e.g. Amoxicillin, Meloxicam'
            }
            value={quickMedName}
            onChange={(e) => setQuickMedName(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-medium text-[#25242A] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#25242A] block mb-1">Category *</label>
            <select
              value={quickMedCategory}
              onChange={(e) => setQuickMedCategory(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-medium text-[#25242A] focus:outline-none"
            >
              <option value="Vaccine">Vaccine</option>
              <option value="Injection">Injection</option>
              <option value="Tablet">Tablet</option>
              <option value="Syrup">Syrup</option>
              <option value="Drops">Drops</option>
              <option value="Saline">Saline / IV Fluid</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#25242A] block mb-1">Unit of Measure *</label>
            <input
              type="text"
              required
              placeholder="e.g. vial, ampoule, tab"
              value={quickMedUnit}
              onChange={(e) => setQuickMedUnit(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-medium text-[#25242A] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[#25242A] block mb-1">Initial Stock Quantity</label>
            <input
              type="number"
              min="0"
              value={quickMedStock}
              onChange={(e) => setQuickMedStock(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-medium text-[#25242A] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#25242A] block mb-1">Selling Price (₹)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={quickMedPrice}
              onChange={(e) => setQuickMedPrice(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-medium text-[#25242A] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8ECF0]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsQuickAddOpen(false)}
            disabled={isQuickSaving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isQuickSaving || !quickMedName.trim()}
            icon={isQuickSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          >
            {isQuickSaving ? 'Saving...' : 'Add to Catalog & Use'}
          </Button>
        </div>
      </form>
    </Modal>
    </>
  );
};
