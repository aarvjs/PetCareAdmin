'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export default function DoctorSettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl">
      <PageHeader
        title="Doctor Settings"
        subtitle="Manage consultation notifications, emergency alerts, and account preferences."
      />

      <Card>
        {isSaved && (
          <div className="mb-4 p-3 bg-[#DFF7EE] border border-[#b5f0d8] rounded-xl text-[#35B779] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Preferences saved!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl cursor-pointer">
              <div>
                <p className="font-bold text-[#25242A]">Appointment Email Alerts</p>
                <p className="text-[#737780]">Receive email notification when a new appointment is booked.</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-[#72CFF2]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl cursor-pointer">
              <div>
                <p className="font-bold text-[#25242A]">SMS Emergency Reminders</p>
                <p className="text-[#737780]">Receive SMS reminders 30 mins before scheduled consultations.</p>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-[#72CFF2]"
              />
            </label>
          </div>

          <Button type="submit" className="bg-[#72CFF2] text-[#25242A] hover:bg-[#5bbfe2]">
            Save Settings
          </Button>
        </form>
      </Card>
    </div>
  );
}
