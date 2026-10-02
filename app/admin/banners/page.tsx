'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { Plus, Image as ImageIcon, Trash2 } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  status: 'Active' | 'Inactive';
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([
    { id: 'BNR-1', title: 'Special Vet Healthcare Package', subtitle: 'Get 20% off comprehensive pet wellness checkups', image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&auto=format&fit=crop', status: 'Active' },
    { id: 'BNR-2', title: 'Nutritional Dry Food Discount', subtitle: 'Free delivery on orders above $50 in Kanpur', image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=500&auto=format&fit=crop', status: 'Active' },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="App Hero Banners"
        subtitle="Manage promotional hero sliders displayed on the PetCare mobile application."
        action={<Button icon={<Plus className="w-4 h-4" />}>Add Hero Banner</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((b) => (
          <Card key={b.id} padding="p-0" className="overflow-hidden">
            <div className="h-44 relative bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3">
                <StatusBadge status={b.status} />
              </div>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#25242A]">{b.title}</h3>
                <p className="text-xs text-[#737780] font-medium mt-0.5">{b.subtitle}</p>
              </div>
              <Button size="sm" variant="danger" icon={<Trash2 className="w-4 h-4" />}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
