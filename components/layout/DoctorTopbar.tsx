'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

interface DoctorTopbarProps {
  onMenuToggle?: () => void;
  title?: string;
}

export const DoctorTopbar: React.FC<DoctorTopbarProps> = ({ onMenuToggle, title = 'Overview' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    router.replace('/doctor-login');
  };

  const displayName = profile?.fullName || user?.email || 'Doctor';
  const displaySub = profile?.specialization || profile?.qualification || 'Veterinary Specialist';

  const getInitials = (name: string) => {
    if (!name) return 'D';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 bg-white border-b border-[#E8ECF0] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-[#737780] hover:text-[#25242A] hover:bg-[#F8FAFC] rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <span className="text-xs text-[#737780] font-medium">Doctor Portal / </span>
          <span className="text-xs text-[#72CFF2] font-bold">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
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
              <div className="w-8 h-8 rounded-full bg-[#72CFF2] text-[#25242A] flex items-center justify-center font-bold text-xs border border-[#72CFF2]">
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
            <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E8ECF0] rounded-2xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
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
