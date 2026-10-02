'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Plus, Syringe, Shield, Clock } from 'lucide-react';
import { INITIAL_VACCINATIONS, Vaccination } from '@/lib/mockData';

export default function AdminVaccinationsPage() {
  const [vaccines, setVaccines] = useState<Vaccination[]>(INITIAL_VACCINATIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    petType: 'Dog',
    description: '',
    price: '',
    duration: '15 mins',
    ageRecommendation: '6 Weeks & above',
  });

  const handleSaveVaccine = (e: React.FormEvent) => {
    e.preventDefault();
    const newVac: Vaccination = {
      id: `VAC-0${vaccines.length + 1}`,
      name: formData.name,
      petType: formData.petType,
      description: formData.description,
      price: parseFloat(formData.price) || 0,
      duration: formData.duration,
      ageRecommendation: formData.ageRecommendation,
      status: 'Active',
    };
    setVaccines([...vaccines, newVac]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Pet Vaccination Catalog"
        subtitle="Manage canine and feline vaccine doses, age recommendations, and immunization plans."
        action={
          <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Add Vaccine Plan
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {vaccines.map((v) => (
          <Card key={v.id} className="relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#35B779] bg-[#DFF7EE] px-2.5 py-1 rounded-md flex items-center gap-1">
                  <Syringe className="w-3 h-3" /> {v.petType} Vaccine
                </span>
                <StatusBadge status={v.status} />
              </div>

              <h3 className="text-base font-bold text-[#25242A] mb-1">{v.name}</h3>
              <p className="text-xs text-[#737780] leading-relaxed mb-4">{v.description}</p>
            </div>

            <div className="pt-4 border-t border-[#E8ECF0] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#737780]">Recommended Age:</span>
                <span className="font-bold text-[#25242A]">{v.ageRecommendation}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-lg font-extrabold text-[#7567E8]">${v.price.toFixed(2)}</span>
                <span className="text-[#737780] font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {v.duration}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Vaccine Plan"
        maxWidth="md"
      >
        <form onSubmit={handleSaveVaccine} className="space-y-4">
          <Input
            label="Vaccine Name"
            placeholder="e.g. Anti-Rabies Vaccine"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                Pet Type
              </label>
              <select
                value={formData.petType}
                onChange={(e) => setFormData({ ...formData, petType: e.target.value })}
                className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
              >
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Dog & Cat">Dog & Cat</option>
              </select>
            </div>

            <Input
              label="Price ($)"
              type="number"
              placeholder="25.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>

          <Input
            label="Age Recommendation"
            placeholder="e.g. 6 Weeks & above"
            value={formData.ageRecommendation}
            onChange={(e) => setFormData({ ...formData, ageRecommendation: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Description & Protection Scope
            </label>
            <textarea
              rows={3}
              placeholder="Protects against Rabies, Parvovirus, Hepatitis..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8ECF0]">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Vaccine</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
