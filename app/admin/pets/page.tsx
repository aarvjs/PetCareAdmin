'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Search, Dog, Heart, Calendar, FileText, User } from 'lucide-react';
import { INITIAL_PETS, PetPatient } from '@/lib/mockData';

export default function AdminPetsPage() {
  const [pets, setPets] = useState<PetPatient[]>(INITIAL_PETS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPet, setSelectedPet] = useState<PetPatient | null>(null);

  const filtered = pets.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.breed.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Pet Patients Registry"
        subtitle="View registered pet patient profiles, breeds, owner records, and medical notes."
      />

      <Card padding="p-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
          <input
            type="text"
            placeholder="Search pet name, breed, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((pet) => (
          <Card key={pet.id} className="relative flex flex-col justify-between">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pet.photo}
                alt={pet.name}
                className="w-16 h-16 rounded-2xl object-cover border border-[#E8ECF0] bg-white"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#25242A]">{pet.name}</h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7567E8] bg-[#F1EEFF] px-2.5 py-0.5 rounded-full">
                    {pet.type}
                  </span>
                </div>
                <p className="text-xs text-[#737780] font-medium">{pet.breed} • {pet.age}</p>
                <p className="text-xs text-[#25242A] font-semibold mt-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#737780]" /> Owner: {pet.ownerName} ({pet.ownerPhone})
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#E8ECF0] flex items-center justify-between text-xs">
              <span className="text-[#737780]">Last Visit: {pet.lastVisit}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedPet(pet)}
                icon={<FileText className="w-3.5 h-3.5 text-[#7567E8]" />}
              >
                Medical History
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={!!selectedPet}
        onClose={() => setSelectedPet(null)}
        title={`Medical Record: ${selectedPet?.name}`}
        maxWidth="md"
      >
        {selectedPet && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] border border-[#E8ECF0] rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPet.photo}
                alt={selectedPet.name}
                className="w-14 h-14 rounded-2xl object-cover"
              />
              <div>
                <h3 className="text-base font-bold text-[#25242A]">{selectedPet.name}</h3>
                <p className="text-[#737780]">{selectedPet.breed} ({selectedPet.type}) • {selectedPet.age}</p>
                <p className="text-[#7567E8] font-semibold">Owner: {selectedPet.ownerName}</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-[#25242A] mb-2">Veterinary Medical Notes</p>
              <div className="p-4 bg-[#F1EEFF] text-[#25242A] rounded-2xl font-medium leading-relaxed border border-[#e0d9fc]">
                {selectedPet.medicalNotes}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
