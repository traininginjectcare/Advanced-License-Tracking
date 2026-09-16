import React from 'react';
import { ObligationStatus, LicenceStatus } from '../types/index.ts';

interface StatusBadgeProps {
  status: ObligationStatus | LicenceStatus | 'low' | 'medium' | 'high' | 'critical' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let dot = 'bg-slate-400';

  switch (status) {
    case 'Active':
      bg = 'bg-amber-100 text-amber-700 border-amber-200';
      dot = 'bg-amber-500';
      break;
    case 'Completed':
    case 'Fulfilled':
    case 'low':
      bg = 'bg-emerald-100 text-emerald-700 border-emerald-200';
      dot = 'bg-emerald-500';
      break;
    case 'Partially Fulfilled':
    case 'medium':
      bg = 'bg-blue-100 text-blue-700 border-blue-200';
      dot = 'bg-blue-500';
      break;
    case 'Pending':
    case 'Expiring Soon':
    case 'high':
      bg = 'bg-amber-100 text-amber-700 border-amber-200';
      dot = 'bg-amber-500';
      break;
    case 'Overdue':
    case 'Expired':
    case 'critical':
      bg = 'bg-rose-100 text-rose-700 border-rose-200';
      dot = 'bg-rose-500';
      break;
    default:
      break;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px] font-bold' : 'px-2.5 py-1 text-xs font-bold';

  return (
    <span className={`inline-flex items-center gap-1 rounded uppercase tracking-wider border ${bg} ${padding} whitespace-nowrap shadow-xs`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      <span>{status}</span>
    </span>
  );
};
