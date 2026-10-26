'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  CalendarX,
  Sparkles,
  Loader2,
  Coffee,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { DEFAULT_WEEKLY_SCHEDULE, DaySchedule, BreakPeriod } from '@/lib/clinicSchedule';

export default function DoctorSchedulePage() {
  const { profile, user, business } = useAuth();
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(DEFAULT_WEEKLY_SCHEDULE);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [slotDuration, setSlotDuration] = useState('30');

  // Loading & Saving state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Live preview
  const [previewDate, setPreviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [previewSlots, setPreviewSlots] = useState<string[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const docUid = profile?.uid || user?.uid || '';
  const currentShopId = business?.shopId || profile?.shopId || 'SHOP-D9E8';

  // 1. Load existing schedule from API
  useEffect(() => {
    if (!docUid) return;

    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const idToken = user ? await user.getIdToken() : '';
        const res = await fetch(`/api/clinic/schedule?doctorId=${docUid}&shopId=${currentShopId}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-uid': docUid,
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.weeklySchedule)) {
            const savedMap = new Map(data.weeklySchedule.map((d: any) => [d.dayOfWeek, d]));
            const merged = DEFAULT_WEEKLY_SCHEDULE.map((defDay) => {
              const saved = savedMap.get(defDay.dayOfWeek);
              return saved ? { ...defDay, ...saved } : defDay;
            });
            setWeeklySchedule(merged);
          }
          if (Array.isArray(data.blockedDates)) {
            setBlockedDates(data.blockedDates);
          }
        }
      } catch (err: any) {
        console.warn('[Doctor Schedule Load Notice]', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [docUid, currentShopId, user]);

  // 2. Load live preview slots whenever previewDate or schedule changes
  useEffect(() => {
    if (!previewDate || !docUid) return;

    const fetchPreviewSlots = async () => {
      setIsLoadingPreview(true);
      try {
        const res = await fetch(
          `/api/clinic/schedule?doctorId=${docUid}&shopId=${currentShopId}&date=${previewDate}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.availableSlots)) {
          setPreviewSlots(data.availableSlots);
        } else {
          setPreviewSlots([]);
        }
      } catch (_) {
        setPreviewSlots([]);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreviewSlots, 300);
    return () => clearTimeout(timer);
  }, [previewDate, docUid, currentShopId, isSaving]);

  // Toggle Day Enable/Disable
  const toggleDay = (index: number) => {
    setWeeklySchedule((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isEnabled: !copy[index].isEnabled };
      return copy;
    });
  };

  // Update Day Working Hours
  const updateDayTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setWeeklySchedule((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Add Break Period
  const addBreak = (dayIndex: number) => {
    setWeeklySchedule((prev) => {
      const copy = [...prev];
      const breaks = copy[dayIndex].breaks || [];
      copy[dayIndex] = {
        ...copy[dayIndex],
        breaks: [
          ...breaks,
          { name: 'Tea / Sanitization Break', startTime: '16:00', endTime: '16:30' },
        ],
      };
      return copy;
    });
  };

  // Remove Break Period
  const removeBreak = (dayIndex: number, breakIndex: number) => {
    setWeeklySchedule((prev) => {
      const copy = [...prev];
      const breaks = [...(copy[dayIndex].breaks || [])];
      breaks.splice(breakIndex, 1);
      copy[dayIndex] = { ...copy[dayIndex], breaks };
      return copy;
    });
  };

  // Update Break
  const updateBreak = (
    dayIndex: number,
    breakIndex: number,
    field: keyof BreakPeriod,
    value: string
  ) => {
    setWeeklySchedule((prev) => {
      const copy = [...prev];
      const breaks = [...(copy[dayIndex].breaks || [])];
      breaks[breakIndex] = { ...breaks[breakIndex], [field]: value };
      copy[dayIndex] = { ...copy[dayIndex], breaks };
      return copy;
    });
  };

  // Add Blocked Date
  const handleAddBlockedDate = () => {
    if (!newBlockedDate) return;
    if (blockedDates.includes(newBlockedDate)) return;
    setBlockedDates([...blockedDates, newBlockedDate].sort());
    setNewBlockedDate('');
  };

  const handleRemoveBlockedDate = (d: string) => {
    setBlockedDates(blockedDates.filter((item) => item !== d));
  };

  // Save Schedule
  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const idToken = user ? await user.getIdToken() : '';
      const res = await fetch('/api/clinic/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': docUid,
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          doctorId: docUid,
          callerProfile: profile,
          weeklySchedule,
          blockedDates,
          slotDurationMinutes: parseInt(slotDuration, 10),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save schedule.');
      }

      setSuccessMessage('Weekly availability & consultation hours successfully saved!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-[#737780]">
        <Loader2 className="w-8 h-8 animate-spin text-[#72CFF2] mb-2" />
        <p className="text-xs font-semibold">Loading doctor availability schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl">
      <PageHeader
        title="Consultation Schedule & Availability"
        subtitle="Configure your weekly patient visiting hours, appointment slot durations, and break intervals."
        action={
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#72CFF2] hover:bg-[#5bbfe2] text-[#25242A] font-bold"
            icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          >
            {isSaving ? 'Saving Schedule...' : 'Save Availability'}
          </Button>
        }
      />

      {successMessage && (
        <div className="p-4 bg-[#DFF7EE] border border-[#b5f0d8] rounded-xl text-[#35B779] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Weekly Schedule Days */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#25242A]">Weekly Consultation Hours</h3>
                <p className="text-xs text-[#737780] mt-0.5">
                  Enable days when you are on clinic duty and specify your consultation timings.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#737780]">Slot Interval:</span>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg px-2.5 py-1 text-xs font-bold text-[#25242A]"
                >
                  <option value="15">15 mins</option>
                  <option value="20">20 mins</option>
                  <option value="30">30 mins</option>
                  <option value="45">45 mins</option>
                  <option value="60">60 mins</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {weeklySchedule.map((day, idx) => (
                <div
                  key={day.dayOfWeek}
                  className={`border rounded-xl p-3.5 transition-all ${
                    day.isEnabled
                      ? 'bg-white border-[#E8ECF0] shadow-2xs'
                      : 'bg-[#F8FAFC] border-dashed border-[#CBD5E1] opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={day.isEnabled}
                        onChange={() => toggleDay(idx)}
                        className="w-4 h-4 rounded text-[#0284C7] focus:ring-[#72CFF2] cursor-pointer"
                        id={`check-${day.dayOfWeek}`}
                      />
                      <label
                        htmlFor={`check-${day.dayOfWeek}`}
                        className={`text-xs font-extrabold cursor-pointer select-none ${
                          day.isEnabled ? 'text-[#25242A]' : 'text-[#737780]'
                        }`}
                      >
                        {day.dayOfWeek}
                      </label>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          day.isEnabled
                            ? 'bg-[#E0F2FE] text-[#0284C7]'
                            : 'bg-[#E2E8F0] text-[#64748B]'
                        }`}
                      >
                        {day.isEnabled ? 'Active' : 'Off Duty'}
                      </span>
                    </div>

                    {day.isEnabled && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-lg px-2 py-1">
                          <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(e) => updateDayTime(idx, 'startTime', e.target.value)}
                            className="bg-transparent text-xs font-bold text-[#25242A] focus:outline-none"
                          />
                          <span className="text-xs text-[#737780] font-bold">to</span>
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(e) => updateDayTime(idx, 'endTime', e.target.value)}
                            className="bg-transparent text-xs font-bold text-[#25242A] focus:outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => addBreak(idx)}
                          className="text-[11px] font-bold text-[#0284C7] hover:text-[#0369A1] bg-[#E0F2FE] hover:bg-[#BAE6FD] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                          title="Add lunch or tea break"
                        >
                          <Coffee className="w-3 h-3" />
                          <span>+ Break</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Breaks List */}
                  {day.isEnabled && day.breaks && day.breaks.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#F1F5F9] space-y-1.5 pl-7">
                      {day.breaks.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2 text-xs">
                          <span className="text-[11px] text-[#64748B] font-semibold w-24 truncate">
                            {b.name || 'Break'}:
                          </span>
                          <input
                            type="time"
                            value={b.startTime}
                            onChange={(e) => updateBreak(idx, bIdx, 'startTime', e.target.value)}
                            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-0.5 text-[11px] font-semibold text-[#25242A]"
                          />
                          <span className="text-[10px] text-[#94A3B8] font-bold">to</span>
                          <input
                            type="time"
                            value={b.endTime}
                            onChange={(e) => updateBreak(idx, bIdx, 'endTime', e.target.value)}
                            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2 py-0.5 text-[11px] font-semibold text-[#25242A]"
                          />
                          <button
                            type="button"
                            onClick={() => removeBreak(idx, bIdx)}
                            className="p-1 text-[#94A3B8] hover:text-red-500 rounded transition-colors"
                            title="Remove break"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Blocked Specific Dates */}
          <Card padding="p-5">
            <h3 className="text-sm font-extrabold text-[#25242A] flex items-center gap-2">
              <CalendarX className="w-4 h-4 text-red-500" />
              Temporary Leave & Blocked Dates
            </h3>
            <p className="text-xs text-[#737780] mt-0.5 mb-3.5">
              Select specific dates when you are away on emergency duty or leave so customers cannot book slots.
            </p>

            <div className="flex items-center gap-2 max-w-sm mb-3">
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={newBlockedDate}
                onChange={(e) => setNewBlockedDate(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-1.5 text-xs font-bold text-[#25242A] focus:outline-none"
              />
              <Button size="sm" variant="secondary" onClick={handleAddBlockedDate}>
                Block Date
              </Button>
            </div>

            {blockedDates.length === 0 ? (
              <p className="text-[11px] text-[#94A3B8] italic">No dates blocked currently.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {blockedDates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold font-mono"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => handleRemoveBlockedDate(d)}
                      className="hover:text-red-900"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Live Slot Preview */}
        <div className="space-y-4">
          <Card padding="p-5" className="sticky top-6">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#0284C7] mb-1">
              <Sparkles className="w-4 h-4" />
              Live Slot Simulator
            </div>
            <h4 className="text-sm font-extrabold text-[#25242A] mb-1">
              What Pet Parents See
            </h4>
            <p className="text-xs text-[#737780] mb-4">
              Select any date to preview the genuinely bookable slots generated by your active schedule:
            </p>

            <div className="mb-4">
              <label className="text-[11px] font-bold text-[#737780] block mb-1">Preview Date:</label>
              <input
                type="date"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl px-3 py-2 text-xs font-bold text-[#25242A] focus:outline-none"
              />
            </div>

            {isLoadingPreview ? (
              <div className="flex items-center justify-center p-8 text-[#737780]">
                <Loader2 className="w-5 h-5 animate-spin text-[#72CFF2] mr-2" />
                <span className="text-xs">Calculating slots...</span>
              </div>
            ) : previewSlots.length === 0 ? (
              <div className="p-6 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl text-center text-[#737780]">
                <CalendarX className="w-8 h-8 mx-auto text-[#94A3B8] mb-1.5" />
                <p className="text-xs font-bold text-[#25242A]">No Slots Available</p>
                <p className="text-[11px] mt-0.5">
                  You are marked off-duty or all slots are occupied for this date.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#25242A]">{previewSlots.length} Bookable Slots</span>
                  <span className="text-[11px] text-[#0284C7] font-semibold">Available</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[360px] overflow-y-auto pr-1">
                  {previewSlots.map((slot) => (
                    <div
                      key={slot}
                      className="px-2.5 py-1.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded-lg text-center text-xs font-bold font-mono shadow-2xs"
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
