'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Syringe,
  Calendar,
  Search,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Dog,
  Cat,
  AlertTriangle,
  History,
  Info,
  Plus,
  Loader2,
  AlertCircle,
  Tag,
  Edit2,
  Archive,
} from 'lucide-react';
import { collection, onSnapshot, query, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';
import {
  getVaccineDisplayStatus,
  getVaccineHistoryForPet,
  VaccinePackage,
} from '@/lib/vaccineSchedule';
import { RecordTreatmentModal } from '@/components/clinic/RecordTreatmentModal';
import { PetDetailsModal } from '@/components/clinic/PetDetailsModal';

interface PetPatient {
  id: string;
  name: string;
  registrationNumber: string;
  species: string;
  breed: string;
  ownerName: string;
  contactNumber?: string;
  lastVaccinationAt?: string;
  lastVaccineName?: string;
  lastVaccineDose?: string;
  nextVaccinationDue?: string;
  nextDueDate?: string;
  treatments?: any[];
  businessId?: string;
  shopId?: string;
}

export default function DoctorVaccinationsPage() {
  const { profile, business, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'due' | 'packages'>('due');
  const [pets, setPets] = useState<PetPatient[]>([]);
  const [packages, setPackages] = useState<VaccinePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('All');

  // Modals for Pet Treatment
  const [selectedPetForRecord, setSelectedPetForRecord] = useState<PetPatient | null>(null);
  const [selectedPetForDetails, setSelectedPetForDetails] = useState<PetPatient | null>(null);

  // Configure Vaccine Package Modal
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);
  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [packageError, setPackageError] = useState('');
  const [editingPackage, setEditingPackage] = useState<VaccinePackage | null>(null);

  const [packageForm, setPackageForm] = useState({
    name: '',
    vaccineName: '',
    species: 'Dog' as 'Dog' | 'Cat' | 'All',
    brand: '',
    description: '',
    totalDoses: '3',
    pricePerDose: '500',
    intervalDays: '21',
    classification: 'series' as 'series' | 'booster' | 'annual_booster',
    status: 'Active' as 'Active' | 'Inactive' | 'Archived',
  });

  const targetBizId = profile?.businessId || business?.id || '';
  const targetShopId = profile?.shopId || business?.shopId || '';

  // 1. Live Firestore listener for Pets with API fallback
  useEffect(() => {
    let isMounted = true;

    const fetchPetsFallback = async () => {
      try {
        const idToken = user ? await user.getIdToken() : '';
        const { ok, data } = await safeFetchJson<any>(
          `/api/pets?businessId=${encodeURIComponent(targetBizId)}&shopId=${encodeURIComponent(targetShopId)}`,
          {
            headers: {
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
          }
        );
        if (ok && data?.success && Array.isArray(data.pets) && isMounted) {
          setPets(data.pets);
        }
      } catch (_) {}
      if (isMounted) setIsLoading(false);
    };

    try {
      const q = query(collection(db, 'pets'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            let list: PetPatient[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }));

            // Filter for clinic staff business
            if (profile?.role !== 'super_admin' && (targetBizId || targetShopId)) {
              list = list.filter((p) => {
                const matchBiz = targetBizId && p.businessId === targetBizId;
                const matchShop = targetShopId && p.shopId && p.shopId.toUpperCase() === targetShopId.toUpperCase();
                return Boolean(matchBiz || matchShop || (!p.businessId && !p.shopId));
              });
            }

            if (isMounted) {
              setPets(list);
              setIsLoading(false);
            }
          } else {
            fetchPetsFallback();
          }
        },
        () => {
          fetchPetsFallback();
        }
      );

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (_) {
      fetchPetsFallback();
    }
  }, [profile, targetBizId, targetShopId, user]);

  // 2. Fetch Vaccine Packages Live with API Fallback
  const fetchPackages = useCallback(async () => {
    try {
      const idToken = user ? await user.getIdToken() : '';
      const { ok, data } = await safeFetchJson<any>('/api/clinic/vaccine-packages', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': profile?.uid || user?.uid || '',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
      });

      if (ok && data?.success && Array.isArray(data.packages)) {
        setPackages(data.packages);
      }
    } catch (_) {}
  }, [profile, user]);

  useEffect(() => {
    let isMounted = true;
    try {
      const colRef = collection(db, 'vaccine_packages');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty && isMounted) {
            const list: VaccinePackage[] = [];
            snapshot.docs.forEach((d) => {
              const pkg = { id: d.id, ...d.data() } as VaccinePackage;
              if (profile?.role === 'super_admin') {
                list.push(pkg);
              } else if (targetBizId && pkg.businessId === targetBizId) {
                list.push(pkg);
              } else if (targetShopId && pkg.shopId === targetShopId) {
                list.push(pkg);
              } else if (!pkg.businessId && !pkg.shopId) {
                list.push(pkg);
              }
            });
            setPackages(list);
          } else {
            fetchPackages();
          }
        },
        () => {
          fetchPackages();
        }
      );
      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (_) {
      fetchPackages();
    }
  }, [profile, targetBizId, targetShopId, fetchPackages]);

  // Open Create Package Modal
  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setPackageError('');
    setPackageForm({
      name: '',
      vaccineName: '',
      species: 'Dog',
      brand: '',
      description: '',
      totalDoses: '3',
      pricePerDose: '500',
      intervalDays: '21',
      classification: 'series',
      status: 'Active',
    });
    setIsAddPackageModalOpen(true);
  };

  // Open Edit Package Modal
  const handleOpenEditPackage = (pkg: VaccinePackage) => {
    setEditingPackage(pkg);
    setPackageError('');
    setPackageForm({
      name: pkg.name || '',
      vaccineName: pkg.vaccineName || pkg.name || '',
      species: pkg.species || 'Dog',
      brand: pkg.brand || '',
      description: pkg.description || '',
      totalDoses: String(pkg.totalDoses || 1),
      pricePerDose: String(pkg.pricePerDose || 0),
      intervalDays: String(pkg.intervalDays || 21),
      classification: pkg.classification || 'series',
      status: pkg.status || 'Active',
    });
    setIsAddPackageModalOpen(true);
  };

  // Save Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.name.trim() || !packageForm.vaccineName.trim()) {
      setPackageError('Package Name and Vaccine Name are required.');
      return;
    }

    const doses = parseInt(packageForm.totalDoses, 10);
    if (isNaN(doses) || doses < 1) {
      setPackageError('Total doses in package must be at least 1.');
      return;
    }

    const perDose = parseFloat(packageForm.pricePerDose);
    if (isNaN(perDose) || perDose < 0) {
      setPackageError('Price per dose must be a valid non-negative number.');
      return;
    }

    const interval = parseInt(packageForm.intervalDays, 10);
    const validInterval = !isNaN(interval) && interval > 0 ? interval : 21;

    setIsSavingPackage(true);
    setPackageError('');

    const payload = {
      name: packageForm.name.trim(),
      vaccineName: packageForm.vaccineName.trim(),
      species: packageForm.species,
      brand: packageForm.brand.trim(),
      description: packageForm.description.trim(),
      totalDoses: doses,
      pricePerDose: perDose,
      packagePrice: doses * perDose,
      intervalDays: validInterval,
      classification: packageForm.classification,
      status: packageForm.status,
      businessId: targetBizId,
      shopId: targetShopId,
    };

    try {
      const idToken = user ? await user.getIdToken() : '';
      const url = editingPackage
        ? `/api/clinic/vaccine-packages/${editingPackage.id}`
        : '/api/clinic/vaccine-packages';
      const method = editingPackage ? 'PATCH' : 'POST';

      const { data, error } = await safeFetchJson<any>(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (error || !data?.success) {
        // Direct Firestore fallback
        const docId = editingPackage
          ? editingPackage.id
          : `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const firestoreDoc = {
          id: docId,
          ...payload,
          updatedAt: new Date().toISOString(),
          ...(editingPackage ? {} : { createdAt: new Date().toISOString() }),
        };

        if (editingPackage) {
          await updateDoc(doc(db, 'vaccine_packages', docId), firestoreDoc);
        } else {
          await setDoc(doc(db, 'vaccine_packages', docId), firestoreDoc);
        }
      }

      setIsAddPackageModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      setPackageError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSavingPackage(false);
    }
  };

  // Archive / Deactivate package
  const handleToggleArchive = async (pkg: VaccinePackage) => {
    const nextStatus = pkg.status === 'Archived' ? 'Active' : 'Archived';
    if (!window.confirm(`${nextStatus === 'Archived' ? 'Archive' : 'Activate'} package "${pkg.name}"?`)) return;

    try {
      const idToken = user ? await user.getIdToken() : '';
      const { data, error } = await safeFetchJson<any>(`/api/clinic/vaccine-packages/${pkg.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (error || !data?.success) {
        await updateDoc(doc(db, 'vaccine_packages', pkg.id), {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        });
      }
      fetchPackages();
    } catch (e: any) {
      alert(`Could not update status: ${e.message}`);
    }
  };

  // Filter Pets
  const filteredPets = pets.filter((pet) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (pet.name || '').toLowerCase().includes(q) ||
      (pet.registrationNumber || '').toLowerCase().includes(q) ||
      (pet.ownerName || '').toLowerCase().includes(q) ||
      (pet.contactNumber || '').includes(q);

    const matchesSpecies =
      filterSpecies === 'All' || (pet.species || '').toLowerCase() === filterSpecies.toLowerCase();

    return matchesSearch && matchesSpecies;
  });

  const calculatedPackagePrice =
    (parseInt(packageForm.totalDoses, 10) || 0) * (parseFloat(packageForm.pricePerDose) || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Vaccination Management & Dose Tracking"
          subtitle="Monitor pet immunization schedules, configure multi-dose vaccine packages, and administer clinical doses."
        />

        <div className="flex items-center gap-2 bg-[#F1F3F6] p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'due'
                ? 'bg-white text-[#7567E8] shadow-xs'
                : 'text-[#6E6D79] hover:text-[#25242A]'
            }`}
          >
            Patient Vaccination Due List ({pets.length})
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'packages'
                ? 'bg-white text-[#7567E8] shadow-xs'
                : 'text-[#6E6D79] hover:text-[#25242A]'
            }`}
          >
            Vaccine Packages & Catalog ({packages.length})
          </button>
        </div>
      </div>

      {/* TAB 1: PATIENT VACCINATION DUE TRACKING */}
      {activeTab === 'due' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#737780] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient pet by name, registration code, or parent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8ECF0] rounded-xl text-xs focus:outline-none focus:border-[#7567E8]"
              />
            </div>

            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="bg-white border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs font-bold text-[#25242A] focus:outline-none"
            >
              <option value="All">All Species</option>
              <option value="Dog">Dogs</option>
              <option value="Cat">Cats</option>
            </select>
          </div>

          {/* Patient Due Table */}
          {isLoading ? (
            <Card padding="p-8" className="text-center text-xs text-[#737780]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#7567E8]" />
              Loading patient vaccination records...
            </Card>
          ) : filteredPets.length === 0 ? (
            <Card padding="p-8" className="text-center text-xs text-[#737780]">
              No pet patient records found matching your filters.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPets.map((pet) => {
                const history = getVaccineHistoryForPet(pet.treatments);
                const lastVac = history && history.length > 0 ? history[history.length - 1] : null;
                const nextDue = pet.nextVaccinationDue || pet.nextDueDate || lastVac?.nextDueDate;
                const statusInfo = getVaccineDisplayStatus({ nextDueDate: nextDue });

                return (
                  <Card key={pet.id} className="relative flex flex-col justify-between p-4 space-y-3">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-sm text-[#25242A]">{pet.name}</h4>
                            <span className="text-[10px] font-mono font-bold bg-[#F1EEFF] text-[#7567E8] px-1.5 py-0.5 rounded">
                              {pet.registrationNumber || 'HPPC'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#737780] mt-0.5">
                            {pet.breed} • Parent: <strong className="text-slate-800">{pet.ownerName}</strong>
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${statusInfo.bgClass} ${statusInfo.textClass} ${statusInfo.borderClass}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 space-y-1 text-xs">
                        {pet.lastVaccineName && (
                          <div className="flex justify-between text-slate-700">
                            <span className="text-slate-500">Last Vaccine:</span>
                            <span className="font-bold">{pet.lastVaccineName}</span>
                          </div>
                        )}
                        {nextDue && (
                          <div className="flex justify-between items-center text-slate-700">
                            <span className="text-slate-500">Next Due:</span>
                            <span className={`font-extrabold ${statusInfo.color === 'red' ? 'text-red-600' : 'text-[#7567E8]'}`}>
                              {nextDue}
                            </span>
                          </div>
                        )}
                        {history && history.length > 0 && (
                          <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                            <span>Total Doses Received:</span>
                            <span className="font-bold text-slate-800">{history.length} doses</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 justify-center text-xs"
                        onClick={() => setSelectedPetForDetails(pet)}
                        icon={<History className="w-3.5 h-3.5" />}
                      >
                        History
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 justify-center text-xs"
                        onClick={() => setSelectedPetForRecord(pet)}
                        icon={<Syringe className="w-3.5 h-3.5" />}
                      >
                        Record Dose
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DYNAMIC VACCINE PACKAGES & CATALOG */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#737780]">
              Multi-dose vaccine packages with configurable per-dose pricing, schedule intervals, and automated dose decrements.
            </p>
            <Button size="sm" onClick={handleOpenAddPackage} icon={<Plus className="w-4 h-4" />}>
              Configure Vaccine Package
            </Button>
          </div>

          {packages.length === 0 ? (
            <Card padding="p-12" className="text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto mb-4 border border-[#7567E8]/20">
                <Syringe className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#25242A]">No Vaccine Packages Configured</h3>
              <p className="text-xs text-[#737780] max-w-sm mx-auto mt-1 leading-relaxed">
                Add your clinic&apos;s custom vaccine packages with configurable dose counts, intervals, and per-dose pricing.
              </p>
              <div className="mt-4">
                <Button size="sm" onClick={handleOpenAddPackage} icon={<Plus className="w-4 h-4" />}>
                  Configure First Package
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const isArchived = pkg.status === 'Archived' || pkg.status === 'Inactive';

                return (
                  <Card
                    key={pkg.id}
                    className={`relative flex flex-col justify-between transition-all ${
                      isArchived ? 'opacity-70 bg-slate-50/50' : 'hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#35B779] bg-[#DFF7EE] px-2.5 py-1 rounded-md flex items-center gap-1">
                          {pkg.species === 'Dog' ? <Dog className="w-3 h-3" /> : pkg.species === 'Cat' ? <Cat className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                          {pkg.species} Package
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#7567E8]/10 text-[#7567E8]">
                            {pkg.totalDoses} {pkg.totalDoses === 1 ? 'Dose' : 'Doses'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              pkg.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {pkg.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-extrabold text-[#25242A] mb-1">{pkg.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-[#7567E8] font-bold mb-2">
                        <Syringe className="w-3.5 h-3.5" />
                        <span>{pkg.vaccineName}</span>
                        {pkg.brand && <span className="text-[#737780] font-normal">({pkg.brand})</span>}
                      </div>

                      {pkg.description && (
                        <p className="text-xs text-[#737780] leading-relaxed mb-4 line-clamp-3">{pkg.description}</p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#E8ECF0] space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#737780]">Dose Interval:</span>
                        <span className="font-bold text-[#25242A]">Every {pkg.intervalDays} Days</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#737780]">Price Per Dose:</span>
                        <span className="font-bold text-slate-800">₹{pkg.pricePerDose.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-xs font-bold text-[#25242A]">Total Package Price:</span>
                        <span className="text-lg font-black text-[#7567E8]">₹{pkg.packagePrice.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8ECF0]">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditPackage(pkg)}
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleArchive(pkg)}
                          icon={<Archive className="w-3.5 h-3.5 text-red-500" />}
                        >
                          {isArchived ? 'Activate' : 'Archive'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Record Treatment Modal */}
      {selectedPetForRecord && (
        <RecordTreatmentModal
          isOpen={Boolean(selectedPetForRecord)}
          onClose={() => setSelectedPetForRecord(null)}
          pet={{
            id: selectedPetForRecord.id,
            name: selectedPetForRecord.name,
            registrationNumber: selectedPetForRecord.registrationNumber,
            breed: selectedPetForRecord.breed,
            species: selectedPetForRecord.species,
            ownerName: selectedPetForRecord.ownerName,
            businessId: selectedPetForRecord.businessId,
            shopId: selectedPetForRecord.shopId,
          }}
          onSuccess={() => {
            setSelectedPetForRecord(null);
          }}
        />
      )}

      {/* Pet Details / History Modal */}
      {selectedPetForDetails && (
        <PetDetailsModal
          pet={{
            id: selectedPetForDetails.id,
            name: selectedPetForDetails.name,
            registrationNumber: selectedPetForDetails.registrationNumber,
            breed: selectedPetForDetails.breed,
            species: selectedPetForDetails.species,
            gender: 'Male',
            coatColour: '',
            dob: '',
            businessId: (selectedPetForDetails as any).businessId || '',
            shopId: (selectedPetForDetails as any).shopId || '',
            ownerId: (selectedPetForDetails as any).ownerId || '',
            ownerName: selectedPetForDetails.ownerName,
            contactNumber: selectedPetForDetails.contactNumber || '',
            ownerAddress: (selectedPetForDetails as any).ownerAddress || 'Kanpur',
            lastVisit: selectedPetForDetails.lastVaccinationAt || 'Recent',
            status: 'Active',
            treatments: selectedPetForDetails.treatments || [],
          }}
          onClose={() => setSelectedPetForDetails(null)}
          onOpenEditReg={() => {}}
          isDoctor={true}
        />
      )}

      {/* Add / Edit Vaccine Package Modal */}
      <Modal
        isOpen={isAddPackageModalOpen}
        onClose={() => setIsAddPackageModalOpen(false)}
        title={editingPackage ? `Edit Vaccine Package: ${editingPackage.name}` : 'Configure New Vaccine Package'}
        maxWidth="md"
      >
        <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">Package Display Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Vaccination (9 in 1) Complete Package"
              value={packageForm.name}
              onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3.5 py-2 text-xs text-[#25242A] font-semibold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Vaccine Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Vaccination (9 in 1), Anti-Rabies"
                value={packageForm.vaccineName}
                onChange={(e) => setPackageForm({ ...packageForm, vaccineName: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Manufacturer / Brand</label>
              <input
                type="text"
                placeholder="e.g. Nobivac, Megavac, Zoetis"
                value={packageForm.brand}
                onChange={(e) => setPackageForm({ ...packageForm, brand: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Applicable Species</label>
              <select
                value={packageForm.species}
                onChange={(e) => setPackageForm({ ...packageForm, species: e.target.value as any })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none font-semibold"
              >
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="All">All Pets</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Classification</label>
              <select
                value={packageForm.classification}
                onChange={(e) => setPackageForm({ ...packageForm, classification: e.target.value as any })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              >
                <option value="series">Initial Puppy / Kitten Series</option>
                <option value="booster">Booster Dose Series</option>
                <option value="annual_booster">Annual Booster</option>
              </select>
            </div>
          </div>

          {/* Dose Count, Per-Dose Price & Auto Package Price */}
          <div className="p-3.5 bg-[#F1EEFF]/60 border border-[#7567E8]/20 rounded-xl space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-[11px] text-[#25242A] block mb-1">Total Doses in Package *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={packageForm.totalDoses}
                  onChange={(e) => setPackageForm({ ...packageForm, totalDoses: e.target.value })}
                  className="w-full bg-white border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-bold text-[#25242A] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[11px] text-[#25242A] block mb-1">Price Per Dose (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={packageForm.pricePerDose}
                  onChange={(e) => setPackageForm({ ...packageForm, pricePerDose: e.target.value })}
                  className="w-full bg-white border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs font-bold text-[#25242A] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[11px] text-[#7567E8] block mb-1">Auto Package Price (₹)</label>
                <div className="w-full bg-white border border-[#7567E8]/40 rounded-xl px-3 py-2 text-xs font-extrabold text-[#7567E8] flex items-center justify-between">
                  <span>₹{calculatedPackagePrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#737780] italic">
              Formula: Package Price = Total Doses ({packageForm.totalDoses}) × Price Per Dose (₹{packageForm.pricePerDose || 0}) = ₹{calculatedPackagePrice.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Recommended Interval (Days)</label>
              <input
                type="number"
                min="1"
                placeholder="21"
                value={packageForm.intervalDays}
                onChange={(e) => setPackageForm({ ...packageForm, intervalDays: e.target.value })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-xs text-[#25242A] block mb-1">Status</label>
              <select
                value={packageForm.status}
                onChange={(e) => setPackageForm({ ...packageForm, status: e.target.value as any })}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl px-3 py-2 text-xs text-[#25242A] focus:outline-none"
              >
                <option value="Active">Active (Available for purchase)</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-xs text-[#25242A] block mb-1">Package Description & Clinical Scope</label>
            <textarea
              rows={2}
              placeholder="e.g. Comprehensive immunization series covering initial puppy doses and annual booster."
              value={packageForm.description}
              onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl p-3 text-xs text-[#25242A] focus:outline-none"
            />
          </div>

          {packageError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 font-semibold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{packageError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8ECF0]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddPackageModalOpen(false)}
              disabled={isSavingPackage}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSavingPackage}>
              {isSavingPackage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : editingPackage ? (
                'Update Package'
              ) : (
                'Save Vaccine Package'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
