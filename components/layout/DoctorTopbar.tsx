'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, User, Settings, LogOut, ChevronDown, Building2, Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

interface DoctorTopbarProps {
  onMenuToggle?: () => void;
  title?: string;
}

export const DoctorTopbar: React.FC<DoctorTopbarProps> = ({ onMenuToggle, title = 'Overview' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copiedShopId, setCopiedShopId] = useState(false);
  const { user, profile, business, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    router.replace('/doctor-login');
  };

  const rawDoctorName = profile?.fullName?.trim() || user?.email?.split('@')[0] || 'Doctor';
  const displayName = rawDoctorName.toLowerCase().startsWith('dr') ? rawDoctorName : `Dr. ${rawDoctorName}`;
  const displaySub = profile?.specialization || profile?.qualification || 'Veterinary Specialist';
  const clinicName = business?.name || profile?.assignedBusinessName || 'Healthy Paws Clinic';
  const currentShopId = business?.shopId || profile?.shopId || '';

  const handleCopyShopId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentShopId) {
      navigator.clipboard.writeText(currentShopId);
      setCopiedShopId(true);
      setTimeout(() => setCopiedShopId(false), 2000);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'D';
    return name
      .replace(/^dr\.?\s*/i, '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-white border-b border-[#E8ECF0] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-[#737780] hover:text-[#25242A] hover:bg-[#F8FAFC] rounded-xl shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <div className="min-w-0">
            <span className="text-xs text-[#737780] font-medium">Doctor Portal / </span>
            <span className="text-xs text-[#0284C7] font-bold">{title}</span>
          </div>

          {/* Clinic Brand & Shop ID Pill */}
          {(clinicName || currentShopId) && (
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                <span className="font-bold text-[#25242A] text-xs max-w-[160px] truncate">
                  {clinicName}
                </span>
              </div>
              {currentShopId && (
                <button
                  type="button"
                  onClick={handleCopyShopId}
                  title="Click to copy Shop ID"
                  className="inline-flex items-center gap-1 font-mono text-[10px] font-black bg-[#F1EEFF] text-[#7567E8] px-1.5 py-0.5 rounded border border-[#7567E8]/20 hover:bg-[#e4dfff] transition-colors"
                >
                  <span>{currentShopId}</span>
                  {copiedShopId ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3 text-[#7567E8]" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button className="relative p-2.5 text-[#737780] hover:text-[#25242A] hover:bg-[#F8FAFC] rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#72CFF2] ring-2 ring-white" />
        </button>

        <div className="h-6 w-[1px] bg-[#E8ECF0]" />

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-[#F8FAFC] rounded-xl transition-colors text-left"
          >
            {profile?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoURL}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover border border-[#72CFF2]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#72CFF2] to-[#7567E8] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {getInitials(displayName)}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#25242A] leading-tight">{displayName}</p>
              <p className="text-[10px] text-[#737780] font-medium">{displaySub}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#737780]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E8ECF0] rounded-2xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-[#E8ECF0]">
                <p className="text-xs font-bold text-[#25242A] truncate">{displayName}</p>
                <p className="text-[11px] text-[#737780] font-medium truncate">{displaySub}</p>
                <div className="mt-2 pt-2 border-t border-dashed border-[#E8ECF0]">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#737780]">
                    Clinic Workspace
                  </p>
                  <p className="text-xs font-bold text-[#0284C7] truncate mt-0.5">{clinicName}</p>
                  {currentShopId && (
                    <p className="text-[11px] font-mono font-bold text-[#7567E8] mt-0.5">
                      Shop ID: {currentShopId}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href="/doctor/profile"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#25242A] hover:bg-[#F8FAFC] font-medium"
              >
                <User className="w-4 h-4 text-[#737780]" /> My Profile
              </Link>
              <Link
                href="/doctor/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#25242A] hover:bg-[#F8FAFC] font-medium"
              >
                <Settings className="w-4 h-4 text-[#737780]" /> Settings
              </Link>
              <div className="my-1 border-t border-[#E8ECF0]" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#E46A6A] hover:bg-red-50 font-medium text-left"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
