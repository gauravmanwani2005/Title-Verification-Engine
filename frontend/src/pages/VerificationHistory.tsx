import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, History } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SimilarityBar } from '@/components/shared/SimilarityBar';
import { getVerificationHistory } from '@/services/verificationService';
import type { VerificationHistoryItem, VerificationStatus } from '@/types';

type FilterType = 'ALL' | VerificationStatus;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'ALL',      label: 'All'           },
  { key: 'APPROVED', label: 'Approved'      },
  { key: 'REJECTED', label: 'Rejected'      },
  { key: 'REVIEW',   label: 'Manual Review' },
];

export function VerificationHistory() {
  const navigate = useNavigate();
  const [items,   setItems]  = useState<VerificationHistoryItem[]>([]);
  const [filter,  setFilter] = useState<FilterType>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerificationHistory().then(data => { setItems(data); setLoading(false); });
  }, []);

  const filtered = filter === 'ALL' ? items : items.filter(i => i.status === filter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#1F2933]">Verification History</h1>
        <p className="text-sm text-[#667085] mt-0.5">All title verification submissions and their results</p>
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-3 flex items-center gap-1 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium transition-colors',
              filter === f.key
                ? 'bg-[#12304A] text-white'
                : 'text-[#667085] hover:bg-[#F7F8F6]',
            )}
          >
            {f.label}
            <span className="ml-1.5 text-[10px] opacity-60">
              {f.key === 'ALL' ? items.length : items.filter(i => i.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded border border-[#D9DEE3] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F8F6] border-b border-[#D9DEE3] text-left">
                {[
                  { label: 'Submission ID',  cls: '' },
                  { label: 'Proposed Title', cls: '' },
                  { label: 'Date',           cls: 'hidden sm:table-cell' },
                  { label: 'Similarity',     cls: 'hidden md:table-cell' },
                  { label: 'Probability',    cls: 'hidden md:table-cell' },
                  { label: 'Result',         cls: '' },
                  { label: 'Reviewer',       cls: 'hidden lg:table-cell' },
                  { label: 'Action',         cls: '' },
                ].map(({ label, cls }) => (
                  <th key={label} className={cn('px-4 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wide', cls)}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn('divide-y divide-[#F7F8F6]', loading && 'opacity-50')}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <History className="w-8 h-8 text-[#D9DEE3] mx-auto mb-2" />
                    <p className="text-sm text-[#9AA3AE]">No verification records found.</p>
                  </td>
                </tr>
              ) : filtered.map(item => (
                <tr
                  key={item.id}
                  className="hover:bg-[#F7F8F6] transition-colors cursor-pointer"
                  onClick={() => navigate('/verify')}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] text-[#9AA3AE]">{item.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1F2933] text-xs">{item.proposedTitle}</p>
                    <p className="text-[10px] text-[#9AA3AE]">{item.language}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#667085] hidden sm:table-cell">
                    {formatDateTime(item.timestamp)}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell w-32">
                    <SimilarityBar score={item.similarityScore} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={cn(
                      'text-xs font-bold tabular-nums',
                      item.verificationProbability >= 70 ? 'text-[#237A4B]'
                      : item.verificationProbability >= 40 ? 'text-[#9A6700]'
                      : 'text-[#B42318]',
                    )}>
                      {item.verificationProbability}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-[#667085]">
                    {item.reviewer ?? <span className="text-[#B0BAC4]">Automated</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); navigate('/verify'); }}
                      className="flex items-center gap-1 text-[11px] text-[#1F5A8A] hover:text-[#12304A] font-medium transition-colors"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
