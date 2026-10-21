'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Search,
  Dog,
  User,
  Phone,
  Calendar,
  Loader2,
  Edit3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Syringe,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PetDetailsModal, PetDetailsModalPet } from '@/components/clinic/PetDetailsModal';
import { EditRegistrationModal } from '@/components/clinic/EditRegistrationModal';

const SPECIES_OPTIONS = ['All', 'Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];

export default function DoctorPatientsPage() {
  const { profile, business } = useAuth();
  const [pets, setPets] = useState<PetDetailsModalPet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');

  // Selected Pet for Details Modal
  const [selectedPet, setSelectedPet] = useState<PetDetailsModalPet | null>(null);

  // Edit Registration Number Modal
  const [editingPet, setEditingPet] = useState<PetDetailsModalPet | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const targetBizId = profile?.businessId || business?.id || '';
  const targetShopId = profile?.shopId || business?.shopId || '';

  // 1. Live Firestore Sync for Business-scoped Registered Pet Patients
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
        let list: PetDetailsModalPet[] = snapshot.docs.map((d) => {
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
          };
        });

        // Strict multi-tenant business isolation
        if (profile?.role !== 'super_admin') {
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

        // Keep selectedPet in sync with live updates
        setSelectedPet((prev) => {
          if (!prev) return null;
          const updated = list.find((item) => item.id === prev.id);
          return updated || prev;
        });
      },
      (err) => {
        console.warn('[Doctor Patients Snapshot Error]', err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetBizId, targetShopId, profile?.role]);

  // 2. Multi-pet & Search Logic (searches name, breed, regNo, ownerName, owner phone, ownerId)
  const filtered = pets.filter((p) => {
    const s = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      p.breed.toLowerCase().includes(s) ||
      p.ownerName.toLowerCase().includes(s) ||
      p.registrationNumber.toLowerCase().includes(s) ||
      p.contactNumber.toLowerCase().includes(s) ||
      p.ownerId.toLowerCase().includes(s);

    const matchesSpecies = speciesFilter === 'All' || p.species.toLowerCase() === speciesFilter.toLowerCase();
    return matchesSearch && matchesSpecies;
  });

  // Reset to first page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, speciesFilter]);

  // Pagination Slicing
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedPets = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Pet Patients Registry"
        subtitle={`Live veterinary registry of pet patients for ${business?.name || 'Healthy Paws Pet Clinic'} (${targetShopId || 'SHOP-D9E8'}).`}
      />

      {/* Search & Species Filter Bar */}
      <Card padding="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
            <input
              type="text"
              placeholder="Search by Pet Name, Reg No (HPPC/P/..), Owner Name, or Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#25242A] focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {SPECIES_OPTIONS.map((type) => {
              const active = speciesFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setSpeciesFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    active
                      ? 'bg-[#7567E8] text-white shadow-2xs'
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

      {/* Patient List (Desktop Compact Table + Mobile Cards) */}
      {isLoading ? (
        <Card padding="p-12" className="flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-[#7567E8] animate-spin mb-3" />
          <p className="text-xs text-[#737780] font-semibold">Loading registered pet patients...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="p-12" className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mx-auto mb-4 border border-[#7567E8]/20">
            <Dog className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#25242A]">No Pet Patients Found</h3>
          <p className="text-xs text-[#737780] max-w-sm mx-auto mt-1 leading-relaxed">
            {searchTerm || speciesFilter !== 'All'
              ? 'No registered pets match your current search or species filter.'
              : 'Registered pet patients submitted through the customer app will appear here automatically.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block">
            <Card padding="p-0" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E8ECF0] text-[11px] font-extrabold uppercase tracking-wider text-[#737780]">
                      <th className="py-3 px-4">Patient Profile</th>
                      <th className="py-3 px-4">Registration No</th>
                      <th className="py-3 px-4">Breed & Gender</th>
                      <th className="py-3 px-4">Owner & Contact</th>
                      <th className="py-3 px-4">DOB / Age</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8ECF0] text-xs">
                    {paginatedPets.map((pet) => (
                      <tr key={pet.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {pet.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={pet.photoUrl}
                                alt={pet.name}
                                className="w-10 h-10 rounded-xl object-cover border border-[#E8ECF0] bg-white shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center shrink-0 border border-[#7567E8]/20">
                                <Dog className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-[#25242A] text-xs">{pet.name}</div>
                              <div className="text-[11px] text-[#737780] font-medium">{pet.species}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-black text-[#7567E8] bg-[#F1EEFF] px-2.5 py-1 rounded-lg border border-[#7567E8]/30">
                            {pet.registrationNumber || 'UNASSIGNED'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-[#25242A]">{pet.breed}</div>
                          <div className="text-[11px] text-[#737780]">{pet.gender} • {pet.coatColour || 'N/A'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-[#25242A] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#7567E8]" />
                            {pet.ownerName}
                          </div>
                          {pet.contactNumber && (
                            <div className="text-[11px] text-[#737780] flex items-center gap-1.5 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {pet.contactNumber}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-[#25242A]">{pet.dob || 'Not specified'}</div>
                          <div className="text-[10px] text-[#737780] mt-0.5">
                            {pet.lastVisit ? `Last Visit: ${pet.lastVisit}` : 'Active'}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPet(pet)}
                              icon={<Edit3 className="w-3.5 h-3.5 text-[#7567E8]" />}
                            >
                              Edit Reg
                            </Button>

                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setSelectedPet(pet)}
                              icon={<FileText className="w-3.5 h-3.5 text-white" />}
                            >
                              Profile & History
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Card View (No Horizontal Overflow) */}
          <div className="md:hidden space-y-3">
            {paginatedPets.map((pet) => (
              <Card key={pet.id} padding="p-4" className="space-y-3">
                <div className="flex items-start gap-3">
                  {pet.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pet.photoUrl}
                      alt={pet.name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#E8ECF0] bg-white shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center shrink-0 border border-[#7567E8]/20">
                      <Dog className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-extrabold text-[#25242A] text-sm truncate">{pet.name}</h4>
                      <span className="font-mono text-[10px] font-black text-[#7567E8] bg-[#F1EEFF] px-2 py-0.5 rounded-md border border-[#7567E8]/30 shrink-0">
                        {pet.registrationNumber || 'UNASSIGNED'}
                      </span>
                    </div>

                    <p className="text-xs text-[#737780] font-medium mt-0.5">
                      {pet.species} • {pet.breed} • {pet.gender}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#E8ECF0]">
                  <div>
                    <span className="text-[10px] text-[#737780] block">Owner</span>
                    <strong className="text-[#25242A] font-bold truncate block">{pet.ownerName}</strong>
                    {pet.contactNumber && (
                      <span className="text-[11px] text-[#737780] block">{pet.contactNumber}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-[#737780] block">Date of Birth</span>
                    <strong className="text-[#25242A] font-bold block">{pet.dob || 'Not specified'}</strong>
                    <span className="text-[10px] text-emerald-700 font-semibold block">{pet.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#E8ECF0]">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 justify-center"
                    onClick={() => setEditingPet(pet)}
                    icon={<Edit3 className="w-3.5 h-3.5 text-[#7567E8]" />}
                  >
                    Edit Reg No
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1 justify-center"
                    onClick={() => setSelectedPet(pet)}
                    icon={<FileText className="w-3.5 h-3.5 text-white" />}
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-[#737780]">
              <span>
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} pets
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Prev
                </Button>

                <span className="px-2 font-bold text-[#25242A]">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  icon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pet Details & Vaccination History Modal */}
      <PetDetailsModal
        pet={selectedPet}
        onClose={() => setSelectedPet(null)}
        onOpenEditReg={(pet) => setEditingPet(pet)}
        isDoctor={true}
      />

      {/* Edit Registration Number Modal */}
      <EditRegistrationModal
        pet={editingPet}
        onClose={() => setEditingPet(null)}
        onSuccess={(updated) => {
          if (selectedPet && selectedPet.id === updated.id) {
            setSelectedPet(updated);
          }
        }}
      />
    </div>
  );
}
