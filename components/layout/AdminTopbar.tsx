'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Bell, Menu, User, Settings, LogOut, ChevronDown } from 'lucide-react';

interface AdminTopbarProps {
  onMenuToggle?: () => void;
  title?: string;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({ onMenuToggle, title = 'Overview' }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(3);

  return (
    <header className="h-16 bg-white border-b border-[#E8ECF0] sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Left Title & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-[#737780] hover:text-[#25242A] hover:bg-[#F8FAFC] rounded-xl"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <span className="text-xs text-[#737780] font-medium">PetCare Admin / </span>
          <span className="text-xs text-[#7567E8] font-bold">{title}</span>
        </div>
      </div>

      {/* Center Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737780]" />
          <input
            type="text"
            placeholder="Search products, orders, doctors, pets..."
            className="w-full bg-[#F8FAFC] border border-[#E8ECF0] focus:border-[#7567E8] rounded-xl pl-10 pr-4 py-2 text-xs text-[#25242A] focus:outline-none focus:ring-2 focus:ring-[#7567E8]/20 transition-all placeholder:text-[#94A3B8]"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Icon */}
        <button className="relative p-2.5 text-[#737780] hover:text-[#25242A] hover:bg-[#F8FAFC] rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          {notificationsCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E46A6A] ring-2 ring-white" />
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
              AD
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#25242A] leading-tight">Admin User</p>
              <p className="text-[10px] text-[#737780] font-medium">Administrator</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#737780]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E8ECF0] rounded-2xl shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <Link
                href="/admin/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#25242A] hover:bg-[#F8FAFC] font-medium"
              >
                <User className="w-4 h-4 text-[#737780]" /> My Profile
              </Link>
              <Link
                href="/admin/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#25242A] hover:bg-[#F8FAFC] font-medium"
              >
                <Settings className="w-4 h-4 text-[#737780]" /> Settings
              </Link>
              <div className="my-1 border-t border-[#E8ECF0]" />
              <Link
                href="/admin-login"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#E46A6A] hover:bg-red-50 font-medium"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
