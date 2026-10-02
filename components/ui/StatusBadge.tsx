import React from 'react';

export type StatusType =
  | 'In Stock'
  | 'Low Stock'
  | 'Out of Stock'
  | 'Active'
  | 'Inactive'
  | 'On Leave'
  | 'Paid'
  | 'Pending'
  | 'Failed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Confirmed'
  | 'Completed';

interface StatusBadgeProps {
  status: StatusType | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = (st: string) => {
    switch (st) {
      case 'In Stock':
      case 'Active':
      case 'Paid':
      case 'Delivered':
      case 'Completed':
      case 'Confirmed':
        return 'bg-[#DFF7EE] text-[#35B779] border-[#b5f0d8]';
      case 'Low Stock':
      case 'Pending':
      case 'Processing':
      case 'On Leave':
        return 'bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]';
      case 'Out of Stock':
      case 'Inactive':
      case 'Failed':
      case 'Cancelled':
        return 'bg-[#FEE2E2] text-[#E46A6A] border-[#FCA5A5]';
      case 'Shipped':
        return 'bg-[#EAF8FE] text-[#0284C7] border-[#BAE6FD]';
      default:
        return 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${getStyles(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};
