'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Search, Bell, Menu, User, Settings, LogOut, ChevronDown } from 'lucide-react';

interface AdminTopbarProps {
  onMenuToggle?: () => void;
  title?: string;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({ onMenuToggle, title = 'Overview' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notificationsCount] = useState(3);
  const [copiedShopId, setCopiedShopId] = useState(false);
  const { profile, business, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    router.replace('/admin-login');
  };

  const handleCopyShopId = () => {
    const sId = business?.shopId || profile?.shopId;
    if (sId) {
      navigator.clipboard.writeText(sId);
      setCopiedShopId(true);
      setTimeout(() => setCopiedShopId(false), 2000);
    }
  };

  const isSuper = profile?.role === 'super_admin';
  const mods = profile?.modules || [];
  const perms = profile?.permissions || [];

  const hasEcommerce =
    isSuper ||
    mods.includes('ecommerce') ||
    perms.includes('products') ||
    perms.includes('p_products') ||
    perms.includes('ALL_ACCESS');

  const hasClinic =
    isSuper ||
    mods.includes('clinic') ||
    perms.includes('doctors') ||
    perms.includes('p_doctors') ||
    perms.includes('ALL_ACCESS');

  const currentShopId = business?.shopId || profile?.shopId;
  const currentBusinessName = business?.name || 'PetCare Clinic';

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'AD';

  return (
    <header className="h-16 bg-white border-b border-[#E8ECF0] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Left Title, Business Name & Shop ID */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-[#737780] hover:text-[#25242A] hover:bg-[#F8FAFC] rounded-xl shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <div className="hidden sm:block min-w-0">
            <span className="text-xs text-[#737780] font-medium truncate max-w-[150px] inline-block align-bottom" title={currentBusinessName}>
              {currentBusinessName}
            </span>
            <span className="text-xs text-[#737780]"> / </span>
            <span className="text-xs text-[#7567E8] font-bold">{title}</span>
          </div>

          {currentShopId && (
            <button
              type="button"
              onClick={handleCopyShopId}
              title="Click to copy Shop ID"
              className="inline-flex items-center gap-1 font-mono text-[10px] font-extrabold text-[#7567E8] bg-[#F1EEFF] px-2 py-0.5 rounded-lg border border-[#7567E8]/20 hover:bg-[#7567E8] hover:text-white transition-all cursor-pointer"
            >
              <span>{currentShopId}</span>
              <span className="text-[9px] opacity-70">
                {copiedShopId ? '✓' : '⧉'}
              </span>
            </button>
          )}

          {/* Module Badges */}
          <div className="hidden md:flex items-center gap-1.5">
            {hasEcommerce && (
              <span className="text-[9px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                E-commerce
              </span>
            )}
            {hasClinic && (
              <span className="text-[9px] font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                Clinic / Doctor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center Search */}
      <div className="flex-1 max-w-xs lg:max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
          <input
            type="text"
            placeholder="Search products, orders, doctors, appointments..."
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none focus:ring-2 focus:ring-[#7567E8]/20 transition-all placeholder:text-[#94A3B8]"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Icon */}
        <button className="relative p-2 text-[#737780] hover:text-[#25242A] hover:bg-[#F8FAFC] rounded-xl transition-colors">
          <Bell className="w-4 h-4" />
          {notificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E46A6A] ring-2 ring-white" />
          )}
        </button>

        <div className="h-6 w-[1px] bg-[#E8ECF0]" />

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-[#F8FAFC] rounded-xl transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7567E8] to-[#72CFF2] flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#25242A] leading-tight truncate max-w-[130px]">
                {profile?.fullName || 'Administrator'}
              </p>
              <p className="text-[10px] text-[#737780] font-medium truncate max-w-[130px]">
                {currentBusinessName}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#737780]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E8ECF0] rounded-2xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-[#E8ECF0]">
                <p className="text-xs font-extrabold text-[#25242A] truncate">
                  {profile?.fullName || 'Administrator'}
                </p>
                <p className="text-[10px] text-[#737780] truncate mt-0.5">
                  {profile?.email}
                </p>
                <div className="mt-2 pt-2 border-t border-[#E8ECF0]/60 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#737780]">Clinic:</span>
                    <span className="font-bold text-[#25242A] truncate max-w-[130px]">{currentBusinessName}</span>
                  </div>
                  {currentShopId && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#737780]">Shop ID:</span>
                      <span className="font-mono font-bold text-[#7567E8]">{currentShopId}</span>
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/admin/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#25242A] hover:bg-[#F8FAFC] font-medium"
              >
                <User className="w-4 h-4 text-[#737780]" /> My Profile & Clinic Settings
              </Link>
              <div className="my-1 border-t border-[#E8ECF0]" />
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs text-[#E46A6A] hover:bg-red-50 font-medium"
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
