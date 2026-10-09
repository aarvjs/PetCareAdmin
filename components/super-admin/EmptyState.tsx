'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white border border-[#E8ECF0] rounded-2xl">
      <div className="w-14 h-14 rounded-2xl bg-[#F1EEFF] text-[#7567E8] flex items-center justify-center mb-4 border border-[#7567E8]/10 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-extrabold text-[#25242A] mb-1">{title}</h3>
      <p className="text-xs text-[#777980] max-w-sm leading-relaxed mb-6 font-medium">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-4 py-2.5 bg-[#7567E8] hover:bg-[#6354D6] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
