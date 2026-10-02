'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Plus, Tag, Copy, Check } from 'lucide-react';

interface Offer {
  id: string;
  code: string;
  discount: string;
  minSpend: number;
  validUntil: string;
  status: 'Active' | 'Expired';
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([
    { id: 'OFF-1', code: 'PETCARE20', discount: '20% OFF', minSpend: 40.0, validUntil: '2026-12-31', status: 'Active' },
    { id: 'OFF-2', code: 'WELCOME10', discount: '$10 OFF', minSpend: 30.0, validUntil: '2026-10-31', status: 'Active' },
    { id: 'OFF-3', code: 'VETCARE15', discount: '15% OFF', minSpend: 50.0, validUntil: '2026-08-31', status: 'Expired' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [formData, setFormData] = useState({ code: '', discount: '', minSpend: '', validUntil: '' });

  const handleCreateOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const newOffer: Offer = {
      id: `OFF-${offers.length + 1}`,
      code: formData.code.toUpperCase(),
      discount: formData.discount,
      minSpend: parseFloat(formData.minSpend) || 0,
      validUntil: formData.validUntil || '2026-12-31',
      status: 'Active',
    };
    setOffers([newOffer, ...offers]);
    setIsModalOpen(false);
  };

  const copyCode = (code: string) => {
    setCopiedCode(code);
    navigator.clipboard.writeText(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Offers & Coupon Codes"
        subtitle="Create discount codes and promotional campaigns for pet parents."
        action={
          <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Create Coupon Code
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {offers.map((off) => (
          <Card key={off.id} className="relative bg-gradient-to-br from-white to-[#F8FAFC]">
            <div className="flex items-center justify-between mb-4">
              <span className="p-2.5 bg-[#F1EEFF] text-[#7567E8] rounded-xl font-bold">
                <Tag className="w-5 h-5" />
              </span>
              <StatusBadge status={off.status} />
            </div>

            <h3 className="text-2xl font-extrabold text-[#7567E8] tracking-tight">{off.discount}</h3>
            <p className="text-xs text-[#737780] mt-1 font-medium">On orders over ${off.minSpend.toFixed(2)}</p>

            <div className="mt-4 p-3 bg-white border border-[#E8ECF0] rounded-xl flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-[#25242A]">{off.code}</span>
              <button
                onClick={() => copyCode(off.code)}
                className="p-1.5 text-[#737780] hover:text-[#7567E8]"
                title="Copy Code"
              >
                {copiedCode === off.code ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-4 text-[11px] text-[#737780] flex justify-between">
              <span>Valid until: {off.validUntil}</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Promotional Coupon"
        maxWidth="md"
      >
        <form onSubmit={handleCreateOffer} className="space-y-4">
          <Input
            label="Coupon Code"
            placeholder="e.g. MONSOON25"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
          <Input
            label="Discount Amount / Percentage"
            placeholder="e.g. 20% OFF or $15 OFF"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
            required
          />
          <Input
            label="Minimum Order Spend ($)"
            type="number"
            placeholder="50.00"
            value={formData.minSpend}
            onChange={(e) => setFormData({ ...formData, minSpend: e.target.value })}
            required
          />
          <Input
            label="Expiry Date"
            type="date"
            value={formData.validUntil}
            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8ECF0]">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Publish Coupon</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
