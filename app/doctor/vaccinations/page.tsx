'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
} from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/authContext';
import { safeFetchJson } from '@/lib/safeFetch';
import {
  KNOWN_VACCINE_PROTOCOLS,
  getVaccineDisplayStatus,
  getVaccineHistoryForPet,
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
  const [activeTab, setActiveTab] = useState<'due' | 'protocols'>('due');
  const [pets, setPets] = useState<PetPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('All');

  // Modals
  const [selectedPetForRecord, setSelectedPetForRecord] = useState<PetPatient | null>(null);
  const [selectedPetForDetails, setSelectedPetForDetails] = useState<PetPatient | null>(null);

  const targetBizId = profile?.businessId || business?.id || '';
  const targetShopId = profile?.shopId || business?.shopId || '';

  // 1. Live Firestore listener with API fallback
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
  }, [targetBizId, targetShopId, profile?.role, user]);

  // Filtered patients
  const filteredPets = pets.filter((pet) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      (pet.name || '').toLowerCase().includes(s) ||
      (pet.registrationNumber || '').toLowerCase().includes(s) ||
      (pet.ownerName || '').toLowerCase().includes(s) ||
      (pet.breed || '').toLowerCase().includes(s);

    const matchesSpecies =
      filterSpecies === 'All' ||
      (pet.species || '').toLowerCase() === filterSpecies.toLowerCase();

    return matchesSearch && matchesSpecies;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Vaccination Management & Dose Tracking"
          subtitle="Monitor pet immunization schedules, calculate series intervals, and record clinical doses."
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
            onClick={() => setActiveTab('protocols')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'protocols'
                ? 'bg-white text-[#7567E8] shadow-xs'
                : 'text-[#6E6D79] hover:text-[#25242A]'
            }`}
          >
            Clinical Protocols & Reference ({KNOWN_VACCINE_PROTOCOLS.length})
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

          {/* Patient Cards / Table */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#737780]">
              Loading registered pet vaccination schedules...
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-[#E8ECF0] rounded-2xl bg-white p-6">
              <Syringe className="w-8 h-8 text-[#7567E8] mx-auto mb-2 opacity-50" />
              <h4 className="font-bold text-sm text-[#25242A]">No Matching Pet Records</h4>
              <p className="text-xs text-[#737780] mt-1">
                No pets matched your filter. Register walk-in patients or record treatments to see active schedules.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPets.map((pet) => {
                const dueDate = pet.nextVaccinationDue || pet.nextDueDate || null;
                const status = getVaccineDisplayStatus({ nextDueDate: dueDate });
                const vacHistory = getVaccineHistoryForPet(pet.treatments || []);

                return (
                  <Card key={pet.id} className="flex flex-col justify-between hover:border-[#7567E8]/50 transition-all">
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-[#25242A]">{pet.name}</h3>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">
                              {pet.registrationNumber || 'HPPC/P'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#737780]">
                            {pet.species} • {pet.breed || 'Breed N/A'} • Owner: {pet.ownerName || 'Client'}
                          </p>
                        </div>

                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Schedule Summary */}
                      <div className="bg-[#FAF9FF] border border-[#ECE8FF] rounded-xl p-2.5 my-3 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[#6E6D79] text-[11px]">Last Vaccine:</span>
                          <span className="font-bold text-[#25242A] text-[11px]">
                            {pet.lastVaccineName || (vacHistory.length > 0 ? (vacHistory[vacHistory.length - 1].medicineName || 'Vaccine') : 'None recorded')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-[#6E6D79] text-[11px]">Dose Series:</span>
                          <span className="font-semibold text-[#7567E8] text-[11px]">
                            {pet.lastVaccineDose || (vacHistory.length > 0 ? (vacHistory[vacHistory.length - 1].doseNumber || 'Administered') : 'Not started')}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-[#ECE8FF]">
                          <span className="text-[#6E6D79] text-[11px] font-bold">Next Due Date:</span>
                          <span className="font-extrabold text-[11px] text-[#25242A]">
                            {dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : 'Not configured'}
                          </span>
                        </div>
                      </div>

                      {/* Doses History count */}
                      <div className="text-[11px] text-[#737780] flex items-center justify-between">
                        <span>Total doses recorded:</span>
                        <span className="font-bold text-[#25242A]">{vacHistory.length}</span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-3 mt-2 border-t border-[#E8ECF0]">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => setSelectedPetForDetails(pet)}
                      >
                        History
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
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

      {/* TAB 2: CLINICAL PROTOCOLS REFERENCE */}
      {activeTab === 'protocols' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {KNOWN_VACCINE_PROTOCOLS.map((protocol) => (
            <Card key={protocol.name} className="relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#35B779] bg-[#DFF7EE] px-2.5 py-1 rounded-md flex items-center gap-1">
                    {protocol.species === 'Dog' ? <Dog className="w-3 h-3" /> : protocol.species === 'Cat' ? <Cat className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                    {protocol.species} Protocol
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#7567E8]/10 text-[#7567E8]">
                    {protocol.totalDosesSeries === 1 ? 'Single Dose' : `${protocol.totalDosesSeries} Doses Series`}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#25242A] mb-1">{protocol.name}</h3>
                <p className="text-xs text-[#737780] leading-relaxed mb-4">{protocol.description}</p>
              </div>

              <div className="pt-4 border-t border-[#E8ECF0] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#737780]">Default Brand:</span>
                  <span className="font-bold text-[#25242A]">{protocol.defaultBrand}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737780]">Series Interval:</span>
                  <span className="font-bold text-[#25242A]">Every {protocol.seriesIntervalDays} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737780]">Annual Booster Interval:</span>
                  <span className="font-bold text-[#25242A]">Every {protocol.boosterIntervalDays} Days (1 Year)</span>
                </div>
              </div>
            </Card>
          ))}
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
            species: selectedPetForDetails.species,
            breed: selectedPetForDetails.breed,
            ownerName: selectedPetForDetails.ownerName,
            contactNumber: selectedPetForDetails.contactNumber,
            treatments: selectedPetForDetails.treatments || [],
            businessId: selectedPetForDetails.businessId,
            shopId: selectedPetForDetails.shopId,
          } as any}
          onClose={() => setSelectedPetForDetails(null)}
          onOpenEditReg={() => {}}
          isDoctor={true}
        />
      )}
    </div>
  );
}
