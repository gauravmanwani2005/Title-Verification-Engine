import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn, getStatusBadgeClasses } from '@/lib/utils';
import type { VerificationStatus } from '@/types';

interface Props {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
}

const labels: Record<VerificationStatus, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REVIEW:   'Manual Review',
};

const icons: Record<VerificationStatus, typeof CheckCircle> = {
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  REVIEW:   AlertCircle,
};

export function StatusBadge({ status, size = 'md' }: Props) {
  const Icon = icons[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded',
      getStatusBadgeClasses(status),
      size === 'sm' && 'text-xs px-2 py-0.5',
      size === 'md' && 'text-sm px-2.5 py-1',
      size === 'lg' && 'text-base px-3 py-1.5',
    )}>
      <Icon className={cn(
        size === 'sm'  ? 'w-3 h-3' :
        size === 'md'  ? 'w-3.5 h-3.5' :
                         'w-4 h-4',
      )} />
      {labels[status]}
    </span>
  );
}
