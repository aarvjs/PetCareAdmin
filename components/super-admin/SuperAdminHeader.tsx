'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Bell, User, Settings, LogOut, ChevronDown, Search, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

interface SuperAdminHeaderProps {
  onMenuToggle?: () => void;
  title?: string;
}

export const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({ onMenuToggle, title = 'Dashboard' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { profile, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    router.replace('/super-admin-login');
  };

  const displayName = profile?.fullName || 'Super Admin';
  const displayEmail = profile?.email || 'superadmin@healthypaws.in';

  return (
    <header className="h-16 bg-white border-b border-[#E8ECF0] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-[#777980] hover:text-[#25242A] hover:bg-[#FAFCFD] rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <span className="text-xs text-[#777980] font-semibold">Super Admin / </span>
          <span className="text-xs text-[#7567E8] font-bold">{title}</span>
        </div>
      </div>

      {/* Center Search (desktop) */}
      <div className="hidden md:flex items-center gap-2 bg-[#FAFCFD] border border-[#E8ECF0] px-3 py-1.5 rounded-xl w-64 lg:w-80">
        <Search className="w-4 h-4 text-[#777980]" />
        <input
          type="text"
          placeholder="Search admins, doctors, logs..."
          className="bg-transparent text-xs text-[#25242A] outline-hidden placeholder:text-[#777980] w-full"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* System Health Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#E6F7F0] border border-[#10B981]/20 rounded-full text-[11px] font-bold text-[#10B981]">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>System Normal</span>
        </div>

        <button className="relative p-2 text-[#777980] hover:text-[#25242A] hover:bg-[#FAFCFD] rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#7567E8] ring-2 ring-white" />
        </button>

        <div className="h-6 w-[1px] bg-[#E8ECF0]" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-[#FAFCFD] rounded-xl transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#7567E8] text-white flex items-center justify-center font-bold text-xs border border-[#7567E8]/20 shadow-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-extrabold text-[#25242A] leading-tight flex items-center gap-1">
                {displayName} <ShieldCheck className="w-3 h-3 text-[#7567E8]" />
              </p>
              <p className="text-[10px] text-[#777980] font-medium">Super Admin</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#777980]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E8ECF0] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-[#E8ECF0]">
                <p className="text-xs font-bold text-[#25242A] truncate">{displayName}</p>
                <p className="text-[10px] text-[#777980] truncate">{displayEmail}</p>
              </div>
              <Link
                href="/super-admin/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#25242A] hover:bg-[#FAFCFD] font-semibold"
              >
                <User className="w-4 h-4 text-[#777980]" /> Super Admin Settings
              </Link>
              <Link
                href="/super-admin/security"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#25242A] hover:bg-[#FAFCFD] font-semibold"
              >
                <Settings className="w-4 h-4 text-[#777980]" /> Security & Audit
              </Link>
              <div className="my-1 border-t border-[#E8ECF0]" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#EF4444] hover:bg-red-50 font-semibold text-left"
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
