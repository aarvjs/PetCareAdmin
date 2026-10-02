'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Sparkles, Clock } from 'lucide-react';
import { INITIAL_SERVICES } from '@/lib/mockData';

export default function DoctorServicesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Clinic Services Catalog"
        subtitle="Reference guide for active clinic healthcare packages and consultation durations."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INITIAL_SERVICES.map((ser) => (
          <Card key={ser.id} className="relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0284C7] bg-[#EAF8FE] px-2.5 py-1 rounded-md">
                  {ser.category}
                </span>
                <StatusBadge status={ser.status} />
              </div>

              <h3 className="text-base font-bold text-[#25242A] mb-1">{ser.name}</h3>
              <p className="text-xs text-[#737780] leading-relaxed mb-4">{ser.description}</p>
            </div>

            <div className="pt-4 border-t border-[#E8ECF0] flex items-center justify-between">
              <span className="text-xl font-extrabold text-[#7567E8]">${ser.price.toFixed(2)}</span>
              <span className="text-xs text-[#737780] font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Duration: {ser.duration}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
