'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  Users,
  KeyRound,
  FileText,
  ShieldAlert,
  BarChart3,
  Settings,
  LogOut,
  X,
  PawPrint,
  Crown,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';

interface SuperAdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavGroup {
  groupName?: string;
  items: Array<{
    name: string;
    href: string;
    icon: React.ReactNode;
  }>;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    router.replace('/super-admin-login');
  };

  const navGroups: NavGroup[] = [
    {
      items: [
        { name: 'Dashboard', href: '/super-admin', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      groupName: 'ACCESS MANAGEMENT',
      items: [
        { name: 'Businesses', href: '/super-admin/businesses', icon: <Building2 className="w-4 h-4" /> },
        { name: 'Admins', href: '/super-admin/admins', icon: <ShieldCheck className="w-4 h-4" /> },
        { name: 'Doctors', href: '/super-admin/doctors', icon: <Stethoscope className="w-4 h-4" /> },
        { name: 'All Users', href: '/super-admin/users', icon: <Users className="w-4 h-4" /> },
        { name: 'Permissions', href: '/super-admin/permissions', icon: <KeyRound className="w-4 h-4" /> },
      ],
    },
    {
      groupName: 'MONITORING',
      items: [
        { name: 'Activity Logs', href: '/super-admin/activity-logs', icon: <FileText className="w-4 h-4" /> },
        { name: 'Security', href: '/super-admin/security', icon: <ShieldAlert className="w-4 h-4" /> },
      ],
    },
    {
      groupName: 'REPORTS',
      items: [
        { name: 'Reports', href: '/super-admin/reports', icon: <BarChart3 className="w-4 h-4" /> },
      ],
    },
    {
      groupName: 'SYSTEM',
      items: [
        { name: 'Settings', href: '/super-admin/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  const displayName = profile?.fullName || 'Super Admin';
  const displayEmail = profile?.email || 'superadmin@healthypaws.in';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E8ECF0]">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-[#E8ECF0]">
        <Link href="/super-admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7567E8] to-[#8ED8F8] flex items-center justify-center text-white shadow-xs">
            <PawPrint className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-[#25242A] text-sm leading-none flex items-center gap-1.5">
              Healthy Paws <Crown className="w-3.5 h-3.5 text-[#7567E8]" />
            </h1>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7567E8] block mt-0.5">
              Super Admin Portal
            </span>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-[#777980] hover:text-[#25242A]">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {group.groupName && (
              <h2 className="px-3 mb-2 text-[10px] font-extrabold text-[#777980] tracking-wider uppercase">
                {group.groupName}
              </h2>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.href === '/super-admin'
                    ? pathname === '/super-admin'
                    : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#F1EEFF] text-[#7567E8]'
                        : 'text-[#777980] hover:bg-[#FAFCFD] hover:text-[#25242A]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#7567E8]" />
                    )}
                    <span className={isActive ? 'text-[#7567E8]' : 'text-[#777980]'}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer / Logout */}
      <div className="p-4 border-t border-[#E8ECF0] bg-[#FAFCFD]">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white border border-[#E8ECF0]">
          <div className="w-8 h-8 rounded-full bg-[#F1EEFF] text-[#7567E8] font-bold text-xs flex items-center justify-center border border-[#7567E8]/20">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-[#25242A] truncate">{displayName}</p>
            <p className="text-[10px] text-[#777980] truncate">{displayEmail}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#EF4444] bg-red-50/60 hover:bg-red-50 border border-red-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Super Admin</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={onClose} />
          <div className="relative w-64 max-w-xs z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
