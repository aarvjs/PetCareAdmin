'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FileText, Plus, CheckCircle2 } from 'lucide-react';
import { INITIAL_PETS } from '@/lib/mockData';

export default function DoctorMedicalRecordsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [records, setRecords] = useState([
    { id: 'REC-01', petName: 'Max', petType: 'Dog (Golden Retriever)', date: '2026-08-14', diagnosis: 'Routine Checkup & DHPP booster vaccination given.', prescription: 'Tab Multivitamin 1 OD x 30 days.' },
    { id: 'REC-02', petName: 'Luna', petType: 'Cat (Persian)', date: '2026-09-01', diagnosis: 'Mild skin irritation behind ears due to flea bites.', prescription: 'Spot-on anti-parasitic treatment & soothing oat bath.' },
  ]);

  const [formData, setFormData] = useState({
    petName: 'Max',
    diagnosis: '',
    prescription: '',
  });

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const newRec = {
      id: `REC-0${records.length + 1}`,
      petName: formData.petName,
      petType: 'Dog',
      date: new Date().toISOString().slice(0, 10),
      diagnosis: formData.diagnosis,
      prescription: formData.prescription,
    };
    setRecords([newRec, ...records]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Clinical Medical Records"
        subtitle="Log patient clinical diagnoses, prescriptions, and physical examination notes."
        action={
          <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
            New Medical Record
          </Button>
        }
      />

      <div className="space-y-4">
        {records.map((rec) => (
          <Card key={rec.id} padding="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8ECF0] pb-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-[#25242A]">{rec.petName} ({rec.petType})</h3>
                <p className="text-xs text-[#737780]">Consultation Date: {rec.date}</p>
              </div>
              <span className="text-[10px] font-extrabold uppercase text-[#7567E8] bg-[#F1EEFF] px-2.5 py-1 rounded-md w-fit">
                {rec.id}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-[#737780] uppercase text-[10px]">Diagnosis & Notes</p>
                <p className="text-[#25242A] font-medium mt-0.5">{rec.diagnosis}</p>
              </div>
              <div>
                <p className="font-bold text-[#35B779] uppercase text-[10px]">Prescription & Treatment Plan</p>
                <p className="text-[#25242A] font-semibold mt-0.5">{rec.prescription}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log New Medical Record"
        maxWidth="md"
      >
        <form onSubmit={handleAddRecord} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Select Patient Pet
            </label>
            <select
              value={formData.petName}
              onChange={(e) => setFormData({ ...formData, petName: e.target.value })}
              className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
            >
              {INITIAL_PETS.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.type} - Owner: {p.ownerName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Clinical Diagnosis
            </label>
            <textarea
              rows={3}
              placeholder="Clinical findings, temperature, coat condition..."
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Prescription / Medications
            </label>
            <textarea
              rows={3}
              placeholder="Prescribed medicine, dosage & follow-up date..."
              value={formData.prescription}
              onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
              className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8ECF0]">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Medical Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
