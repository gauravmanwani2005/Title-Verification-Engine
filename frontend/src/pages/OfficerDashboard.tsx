import { useNavigate } from 'react-router-dom';
import { Database, AlertTriangle, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SimilarityBar } from '@/components/shared/SimilarityBar';
import { MOCK_VERIFICATION_HISTORY, TOTAL_REGISTERED_TITLES, BASE_TODAY_COUNT, REJECTION_INSIGHTS } from '@/data/mockTitles';
import { formatDateTime, cn } from '@/lib/utils';
import { useSubmissionStore } from '@/context/SubmissionStore';

// Verification queue with richer data for officer view
const VERIFICATION_QUEUE = [
  {
    id: 'VRF-0901', title: 'Bharat Samachar',          similarity: 92, probability: 8,
    risk: 'High',     ruleStatus: 'Similarity Match',              status: 'REVIEW'    as const,
  },
  {
    id: 'VRF-0900', title: 'New India Chronicle',       similarity: 24, probability: 76,
    risk: 'Low',      ruleStatus: 'All Checks Passed',              status: 'APPROVED'  as const,
  },
  {
    id: 'VRF-0899', title: 'Police Samachar',           similarity: 100, probability: 0,
    risk: 'Critical', ruleStatus: 'Restricted Word',               status: 'REJECTED'  as const,
  },
  {
    id: 'VRF-0898', title: 'Namaskar Bharat Daily',     similarity: 95, probability: 5,
    risk: 'High',     ruleStatus: 'Existing Title + Periodicity',  status: 'REJECTED'  as const,
  },
  {
    id: 'VRF-0897', title: 'Gujarat Pratideen',         similarity: 48, probability: 52,
    risk: 'Medium',   ruleStatus: 'Borderline Similarity',         status: 'REVIEW'    as const,
  },
];

// REJECTION_INSIGHTS and TOTAL_REGISTERED_TITLES imported from mockTitles.ts

const RISK_COLORS: Record<string, string> = {
  Critical: 'bg-[#FCEEEE] text-[#B42318] border-[#F5C2BE]',
  High:     'bg-[#FFF5E5] text-[#9A6700] border-[#F5D99A]',
  Medium:   'bg-[#E8EEF4] text-[#1F5A8A] border-[#C2D8EC]',
  Low:      'bg-[#EAF5EE] text-[#237A4B] border-[#B7DECA]',
};

export function OfficerDashboard() {
  const navigate = useNavigate();
  const { submissions } = useSubmissionStore();

  // Merge live submissions into the queue (prepend to static mock data)
  const liveQueueItems = submissions.map(s => ({
    id:         s.result.submissionId,
    title:      s.result.proposedTitle,
    similarity: s.result.similarityScore,
    probability:s.result.verificationProbability,
    risk:       s.result.similarityScore >= 70 ? 'High'
                : s.result.similarityScore >= 40 ? 'Medium' : 'Low',
    ruleStatus: s.result.ruleChecks.find(r => r.status === 'FAILED')?.name ?? 'All Checks Passed',
    status:     s.result.status,
    isLive:     true,
  }));

  const allQueueItems = [
    ...liveQueueItems,
    ...VERIFICATION_QUEUE,
  ].slice(0, 8); // show max 8

  // Live count overrides
  const pendingCount  = allQueueItems.filter(i => i.status === 'REVIEW').length;
  const highRiskCount = allQueueItems.filter(i => i.risk === 'High' || i.risk === 'Critical').length;

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-[#1F2933]">Verification Overview</h1>
        <p className="text-sm text-[#667085] mt-0.5">
          Monitor title verification activity, similarity risks and applications requiring attention.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Registered Titles"    value={TOTAL_REGISTERED_TITLES}               icon={Database}      />
        <StatCard label="Applications Today"   value={BASE_TODAY_COUNT + submissions.length}  icon={CheckCircle} trend="Live count" trendUp={true} />
        <StatCard label="High-Risk Titles"     value={highRiskCount}                          icon={AlertTriangle} />
        <StatCard label="Pending Review"       value={pendingCount}                           icon={Clock}         trend="Requires officer action" />
      </div>

      {/* Main content — 2 column */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left — Verification queue (takes 2/3) */}
        <div className="xl:col-span-2 space-y-6">

          {/* Queue */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card">
            <div className="px-5 py-4 border-b border-[#D9DEE3] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1F2933]">Verification Queue</h3>
                <p className="text-xs text-[#667085] mt-0.5">Applications requiring automated or officer attention</p>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-[#1F5A8A] hover:text-[#12304A] font-medium flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F7F8F6] border-b border-[#D9DEE3] text-left">
                    {['Proposed Title','Similarity','Probability','Risk','Rule Status','Status','Action'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7F8F6]">
                  {allQueueItems.map(item => (
                    <tr key={item.id} className={cn('hover:bg-[#F7F8F6] transition-colors', 'isLive' in item && item.isLive && 'bg-[#EAF5EE]/40')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-[#1F2933] text-xs">{item.title}</p>
                            <p className="text-[10px] text-[#9AA3AE] font-mono">{item.id}</p>
                          </div>
                          {'isLive' in item && item.isLive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EAF5EE] text-[#237A4B] border border-[#B7DECA] flex-shrink-0">
                              NEW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-28">
                        <SimilarityBar score={item.similarity} />
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold tabular-nums text-[#667085]">
                        {item.probability}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border', RISK_COLORS[item.risk])}>
                          {item.risk}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#667085] max-w-[140px]">
                        {item.ruleStatus}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate('/verify')}
                          className={cn(
                            'text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors',
                            item.status === 'REVIEW'
                              ? 'bg-[#12304A] text-white border-[#12304A] hover:bg-[#1F5A8A]'
                              : 'text-[#1F5A8A] border-[#D9DEE3] hover:bg-[#F7F8F6]',
                          )}
                        >
                          {item.status === 'REVIEW' ? 'Review' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card">
            <div className="px-5 py-4 border-b border-[#D9DEE3] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1F2933]">Recent Verification Activity</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-xs text-[#1F5A8A] hover:text-[#12304A] font-medium flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F7F8F6] border-b border-[#D9DEE3] text-left">
                    {['Title','Result','Similarity','Date','Action'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7F8F6]">
                  {[
                    // Live submissions first
                    ...submissions.slice(0, 3).map(s => ({
                      id: s.result.submissionId,
                      proposedTitle: s.result.proposedTitle,
                      language: s.result.language,
                      status: s.result.status,
                      similarityScore: s.result.similarityScore,
                      timestamp: s.submittedAt,
                      isLive: true,
                    })),
                    // Then static mock history
                    ...MOCK_VERIFICATION_HISTORY.slice(0, 5).map(h => ({ ...h, isLive: false })),
                  ].slice(0, 6).map(item => (
                    <tr key={item.id} className={cn('hover:bg-[#F7F8F6] transition-colors', item.isLive && 'bg-[#EAF5EE]/30')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-[#1F2933] text-xs">{item.proposedTitle}</p>
                            <p className="text-[10px] text-[#9AA3AE]">{item.language}</p>
                          </div>
                          {item.isLive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#EAF5EE] text-[#237A4B] border border-[#B7DECA] flex-shrink-0">NEW</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} size="sm" /></td>
                      <td className="px-4 py-3 w-28 hidden md:table-cell">
                        <SimilarityBar score={item.similarityScore} />
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#667085] hidden lg:table-cell">
                        {formatDateTime(item.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate('/history')}
                          className="text-[11px] text-[#1F5A8A] hover:text-[#12304A] font-medium transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column — insights + engine status */}
        <div className="space-y-5">

          {/* Rejection insights */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <h3 className="text-sm font-semibold text-[#1F2933] mb-1">Common Verification Issues</h3>
            <p className="text-xs text-[#667085] mb-4">Primary rejection reasons this month</p>
            <div className="space-y-3">
              {REJECTION_INSIGHTS.map(({ label, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#667085]">{label}</span>
                    <span className="text-xs font-semibold tabular-nums text-[#1F2933]">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#D9DEE3] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#12304A] rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="mt-4 text-xs text-[#1F5A8A] hover:text-[#12304A] font-medium flex items-center gap-1 transition-colors"
            >
              Full Analytics <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Verification engine */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#1F2933]">Verification Engine</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#237A4B]" />
                <span className="text-[10px] font-semibold text-[#237A4B]">All Systems Active</span>
              </div>
            </div>
            <div className="space-y-0 divide-y divide-[#F7F8F6]">
              {[
                { label: 'Title Database',      note: 'Connected' },
                { label: 'Rule Engine',         note: 'Active'    },
                { label: 'Phonetic Matching',   note: 'Active'    },
                { label: 'Semantic Similarity', note: 'Active'    },
                { label: 'Vector Search',       note: 'Active'    },
              ].map(({ label, note }) => (
                <div key={label} className="flex items-center justify-between py-2">
                  <span className="text-xs text-[#667085]">{label}</span>
                  <span className="text-[10px] font-medium text-[#237A4B] bg-[#EAF5EE] border border-[#B7DECA] px-2 py-0.5 rounded-full">
                    {note}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <h3 className="text-sm font-semibold text-[#1F2933] mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Verify a Title',         path: '/verify'    },
                { label: 'Search Title Database',  path: '/database'  },
                { label: 'View Analytics',         path: '/analytics' },
                { label: 'Rules & Guidelines',     path: '/rules'     },
              ].map(({ label, path }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded border border-[#D9DEE3] text-xs font-medium text-[#667085] hover:text-[#1F2933] hover:border-[#B0BAC4] hover:bg-[#F7F8F6] transition-colors"
                >
                  {label}
                  <ArrowRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
