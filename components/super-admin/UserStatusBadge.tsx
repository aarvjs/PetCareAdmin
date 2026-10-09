'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface UserStatusBadgeProps {
  status?: 'active' | 'inactive' | 'suspended' | string;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ status = 'active' }) => {
  const normalized = (status || 'active').toLowerCase();

  if (normalized === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E6F7F0] text-[#10B981] border border-[#10B981]/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Active</span>
      </span>
    );
  }

  if (normalized === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF7ED] text-[#F59E0B] border border-[#F59E0B]/20">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Inactive</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#EF4444] border border-[#EF4444]/20">
      <XCircle className="w-3.5 h-3.5" />
      <span>Suspended</span>
    </span>
  );
};
