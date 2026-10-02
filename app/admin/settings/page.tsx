'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [storeName, setStoreName] = useState('PetCare Swaroop Nagar');
  const [currency, setCurrency] = useState('INR (₹)');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl">
      <PageHeader
        title="Admin Settings"
        subtitle="Manage platform configuration, currency format, and clinic store profile."
      />

      <Card>
        {isSaved && (
          <div className="mb-4 p-3 bg-[#DFF7EE] border border-[#b5f0d8] rounded-xl text-[#35B779] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Store / Clinic Title"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
              Default Currency Symbol
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
            >
              <option value="INR (₹)">INR (₹) - Indian Rupee</option>
              <option value="USD ($)">USD ($) - US Dollar</option>
            </select>
          </div>

          <Button type="submit">Save Settings</Button>
        </form>
      </Card>
    </div>
  );
}
