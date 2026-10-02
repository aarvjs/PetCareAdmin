'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Bell, Send, CheckCircle2 } from 'lucide-react';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('All Users');
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setTitle('');
      setMessage('');
    }, 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl">
      <PageHeader
        title="Broadcast Notifications"
        subtitle="Push marketing announcements, vaccine reminders, and order updates to mobile users."
      />

      <Card>
        {sentSuccess ? (
          <div className="p-6 bg-[#DFF7EE] border border-[#b5f0d8] rounded-2xl flex items-center gap-3 text-[#35B779] text-sm font-bold">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span>Broadcast notification successfully dispatched to {targetAudience}!</span>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
              >
                <option value="All Users">All Registered Pet Parents</option>
                <option value="Dog Owners">Dog Owners Only</option>
                <option value="Cat Owners">Cat Owners Only</option>
              </select>
            </div>

            <Input
              label="Notification Title"
              placeholder="e.g. Free Rabies Vaccination Camp This Sunday!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-[#25242A] uppercase tracking-wider mb-1.5">
                Notification Body Text
              </label>
              <textarea
                rows={4}
                placeholder="Write message content..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-white border border-[#E8ECF0] rounded-xl px-4 py-2.5 text-sm text-[#25242A]"
                required
              />
            </div>

            <Button type="submit" icon={<Send className="w-4 h-4" />}>
              Send Broadcast Push Notification
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
