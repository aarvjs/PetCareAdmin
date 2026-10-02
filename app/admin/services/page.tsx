'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Plus, Sparkles, Clock, Edit, Trash2 } from 'lucide-react';
import { INITIAL_SERVICES, ClinicService } from '@/lib/mockData';

export default function AdminServicesPage() {
  const [services, setServices] = useState<ClinicService[]>(INITIAL_SERVICES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ClinicService | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Preventive Care',
    description: '',
    price: '',
    duration: '30 mins',
  });

  const handleOpenAdd = (ser?: ClinicService) => {
    if (ser) {
      setSelectedService(ser);
      setFormData({
        name: ser.name,
        category: ser.category,
        description: ser.description,
        price: ser.price.toString(),
        duration: ser.duration,
      });
    } else {
      setSelectedService(null);
      setFormData({
        name: '',
        category: 'Preventive Care',
        description: '',
        price: '',
        duration: '30 mins',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedService) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === selectedService.id
            ? {
                ...s,
                name: formData.name,
                category: formData.category,
                description: formData.description,
                price: parseFloat(formData.price) || 0,
                duration: formData.duration,
              }
            : s
        )
      );
    } else {
      const newSer: ClinicService = {
        id: `SER-0${services.length + 1}`,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        duration: formData.duration,
        image: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=200&auto=format&fit=crop',
        status: 'Active',
      };
      setServices((prev) => [...prev, newSer]);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Clinic Healthcare Services"
        subtitle="Manage available veterinary treatments, wellness programs, and checkup pricing."
        action={
          <Button onClick={() => handleOpenAdd()} icon={<Plus className="w-4 h-4" />}>
            Add Clinic Service
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((ser) => (
          <Card key={ser.id} className="relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7567E8] bg-[#F1EEFF] px-2.5 py-1 rounded-md">
                  {ser.category}
                </span>
                <StatusBadge status={ser.status} />
              </div>

              <h3 className="text-base font-bold text-[#25242A] mb-1">{ser.name}</h3>
              <p className="text-xs text-[#737780] leading-relaxed mb-4">{ser.description}</p>
            </div>

            <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-between">
              <div>
                <span className="text-xl font-extrabold text-[#7567E8]">${ser.price.toFixed(2)}</span>
                <span className="text-xs text-[#737780] font-medium ml-2 flex items-center gap-1 inline-flex">
                  <Clock className="w-3.5 h-3.5" /> {ser.duration}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAdd(ser)}
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
        title={selectedService ? 'Edit Clinic Service' : 'Add Clinic Service'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <Input
            label="Service Title"
            placeholder="e.g. Skin & Coat Treatment"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
              >
                <option value="Preventive Care">Preventive Care</option>
                <option value="Consultation">Consultation</option>
                <option value="Grooming">Grooming</option>
                <option value="Surgery">Surgery</option>
                <option value="Wellness">Wellness</option>
              </select>
            </div>

            <Input
              label="Price ($)"
              type="number"
              placeholder="35.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>

          <Input
            label="Duration"
            placeholder="30 mins"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Service Description
            </label>
            <textarea
              rows={3}
              placeholder="Detailed description of what is included in this healthcare service..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8ECF0]">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Service</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
