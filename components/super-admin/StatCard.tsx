'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  isPositive?: boolean;
  accentColor?: 'purple' | 'sky' | 'amber' | 'emerald';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  isPositive = true,
  accentColor = 'purple',
}) => {
  const getColors = () => {
    switch (accentColor) {
      case 'sky':
        return { bg: 'bg-[#EAF8FE]', text: 'text-[#0284C7]', border: 'border-[#8ED8F8]/40' };
      case 'amber':
        return { bg: 'bg-[#FFF7ED]', text: 'text-[#D97706]', border: 'border-[#F59E0B]/20' };
      case 'emerald':
        return { bg: 'bg-[#E6F7F0]', text: 'text-[#10B981]', border: 'border-[#10B981]/20' };
      case 'purple':
      default:
        return { bg: 'bg-[#F1EEFF]', text: 'text-[#7567E8]', border: 'border-[#7567E8]/20' };
    }
  };

  const colors = getColors();

  return (
    <div className="bg-white border border-[#E8ECF0] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-[#777980] uppercase tracking-wider block mb-1">
            {title}
          </span>
          <h3 className="text-2xl font-extrabold text-[#25242A] tracking-tight">{value}</h3>
        </div>
        <div className={`w-11 h-11 rounded-2xl ${colors.bg} ${colors.text} border ${colors.border} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs font-semibold">
          {subtitle && <span className="text-[#777980] font-medium">{subtitle}</span>}
          {trend && (
            <span className={`inline-flex items-center gap-1 font-bold ${isPositive ? 'text-[#10B981]' : 'text-red-500'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
