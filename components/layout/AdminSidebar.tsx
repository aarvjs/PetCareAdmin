'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  ShoppingCart,
  Users,
  Boxes,
  Tag,
  Stethoscope,
  Sparkles,
  Syringe,
  Calendar,
  Dog,
  Image as ImageIcon,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  X,
  PawPrint,
} from 'lucide-react';

interface AdminSidebarProps {
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

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, business, logout } = useAuth();

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    router.replace('/admin-login');
  };

  const mods = profile?.modules || [];
  const perms = profile?.permissions || [];

  const hasEcommerce =
    mods.includes('ecommerce') ||
    perms.includes('products') ||
    perms.includes('p_products') ||
    perms.includes('ALL_ACCESS');

  const hasClinic =
    mods.includes('clinic') ||
    perms.includes('doctors') ||
    perms.includes('p_doctors') ||
    perms.includes('ALL_ACCESS');

  const navGroups: NavGroup[] = [
    {
      items: [
        { name: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      ],
    },
    ...(hasEcommerce
      ? [
          {
            groupName: 'SHOP MANAGEMENT',
            items: [
              { name: 'Products', href: '/admin/products', icon: <ShoppingBag className="w-5 h-5" /> },
              { name: 'Categories', href: '/admin/categories', icon: <FolderTree className="w-5 h-5" /> },
              { name: 'Orders', href: '/admin/orders', icon: <ShoppingCart className="w-5 h-5" /> },
              { name: 'Customers', href: '/admin/customers', icon: <Users className="w-5 h-5" /> },
              { name: 'Inventory', href: '/admin/inventory', icon: <Boxes className="w-5 h-5" /> },
              { name: 'Offers / Coupons', href: '/admin/offers', icon: <Tag className="w-5 h-5" /> },
            ],
          },
        ]
      : []),
    ...(hasClinic
      ? [
          {
            groupName: 'CLINIC MANAGEMENT',
            items: [
              { name: 'Doctors', href: '/admin/doctors', icon: <Stethoscope className="w-5 h-5" /> },
              { name: 'Clinic Services', href: '/admin/services', icon: <Sparkles className="w-5 h-5" /> },
              { name: 'Vaccinations', href: '/admin/vaccinations', icon: <Syringe className="w-5 h-5" /> },
              { name: 'Appointments', href: '/admin/appointments', icon: <Calendar className="w-5 h-5" /> },
              { name: 'Pets / Patients', href: '/admin/pets', icon: <Dog className="w-5 h-5" /> },
            ],
          },
        ]
      : []),
    {
      groupName: 'CONTENT',
      items: [
        { name: 'Banners', href: '/admin/banners', icon: <ImageIcon className="w-5 h-5" /> },
        { name: 'Notifications', href: '/admin/notifications', icon: <Bell className="w-5 h-5" /> },
      ],
    },
    {
      groupName: 'SYSTEM',
      items: [
        { name: 'Reports', href: '/admin/reports', icon: <BarChart3 className="w-5 h-5" /> },
        { name: 'Settings', href: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E8ECF0]">
      {/* Brand Header with Registered Business Identity */}
      <div className="p-4 border-b border-[#E8ECF0]">
        <div className="flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3 min-w-0">
            {business?.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name || 'Clinic'}
                className="w-10 h-10 rounded-xl object-cover border border-[#E8ECF0] shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7567E8] to-[#72CFF2] flex items-center justify-center text-white shadow-xs shrink-0">
                <PawPrint className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-[#25242A] text-sm leading-tight truncate" title={business?.name || 'PetCare'}>
                {business?.name || 'PetCare'}
              </h1>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {(business?.shopId || profile?.shopId) && (
                  <span className="font-mono text-[9px] font-extrabold text-[#7567E8] bg-[#F1EEFF] px-1.5 py-0.5 rounded border border-[#7567E8]/20 tracking-wider">
                    {business?.shopId || profile?.shopId}
                  </span>
                )}
                {hasEcommerce && (
                  <span className="text-[8px] font-extrabold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 uppercase">
                    E-com
                  </span>
                )}
                {hasClinic && (
                  <span className="text-[8px] font-extrabold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200 uppercase">
                    Clinic
                  </span>
                )}
              </div>
            </div>
          </Link>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 text-[#737780] hover:text-[#25242A]">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            {group.groupName && (
              <h2 className="px-3 mb-2 text-[10px] font-bold text-[#737780] tracking-wider uppercase">
                {group.groupName}
              </h2>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#F1EEFF] text-[#7567E8]'
                        : 'text-[#737780] hover:bg-[#F8FAFC] hover:text-[#25242A]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#7567E8]" />
                    )}
                    <span className={isActive ? 'text-[#7567E8]' : 'text-[#737780]'}>
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

      {/* Footer / Admin Card & Logout */}
      <div className="p-4 border-t border-[#E8ECF0] space-y-3">
        {profile && (
          <div className="p-2.5 bg-[#F8FAFC] border border-[#E8ECF0] rounded-xl flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#7567E8] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              {profile.fullName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold text-[#25242A] truncate leading-tight">
                {profile.fullName}
              </p>
              <p className="text-[9px] text-[#737780] truncate mt-0.5">
                {profile.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#E46A6A] hover:bg-red-50 transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
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
