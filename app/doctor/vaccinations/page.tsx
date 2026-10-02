'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Syringe, Clock } from 'lucide-react';
import { INITIAL_VACCINATIONS } from '@/lib/mockData';

export default function DoctorVaccinationsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Vaccination Reference Guide"
        subtitle="Immunization protocol details, pet age guidelines, and core vaccine schedules."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {INITIAL_VACCINATIONS.map((v) => (
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
    </div>
  );
}
