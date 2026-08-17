import { useNavigate } from 'react-router-dom';
import { Database, CheckCircle, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SimilarityBar } from '@/components/shared/SimilarityBar';
import {
  MOCK_VERIFICATION_HISTORY,
  TOTAL_REGISTERED_TITLES,
  BASE_TODAY_COUNT,
  HIGH_RISK_COUNT,
} from '@/data/mockTitles';
import { formatDateTime } from '@/lib/utils';
import { useSubmissionStore } from '@/context/SubmissionStore';

export function Dashboard() {
  const navigate = useNavigate();
  const { submissions } = useSubmissionStore();
  const todayCount = BASE_TODAY_COUNT + submissions.length;
  const highRisk   = HIGH_RISK_COUNT + submissions.filter(s => s.result.similarityScore >= 70).length;

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-[#1F2933]">Dashboard</h1>
        <p className="text-sm text-[#667085] mt-0.5">
          Overview of PRGI title verification activity
        </p>
      </div>

      {/* Hero — navy, no gradients */}
      <div className="bg-[#12304A] rounded p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
            Primary Action
          </p>
          <h2 className="text-lg font-bold text-white">
            Verify a New Publication Title
          </h2>
          <p className="text-sm text-white/60 mt-1.5 max-w-lg leading-relaxed">
            Check title uniqueness, phonetic resemblance, semantic similarity and PRGI guideline
            compliance before formal submission to the Registrar.
          </p>
        </div>
        <button
          onClick={() => navigate('/verify')}
          className="flex items-center gap-2 bg-white text-[#12304A] font-semibold px-5 py-2.5 rounded text-sm transition-colors hover:bg-[#F7F8F6] flex-shrink-0 whitespace-nowrap"
        >
          Verify New Title
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Registered Titles"    value={TOTAL_REGISTERED_TITLES} icon={Database}      trend="PRGI national database" />
        <StatCard label="Titles Verified Today" value={todayCount}              icon={CheckCircle}   trend="Live count" trendUp={true} />
        <StatCard label="High-Risk Matches"    value={highRisk}                icon={AlertTriangle} trend="Pending officer review" />
        <StatCard label="Avg. Verification Time" value="< 2 sec"              icon={Clock}         trend="Real-time processing" />
      </div>

      {/* Engine status + Recent verifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Engine status */}
        <div className="bg-white rounded border border-[#D9DEE3] p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1F2933]">Verification Engine</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#237A4B]" />
              <span className="text-xs font-semibold text-[#237A4B]">Online</span>
            </div>
          </div>

          <div className="space-y-0 divide-y divide-[#F7F8F6]">
            {[
              { label: 'Rule Engine',       note: 'Active' },
              { label: 'Phonetic Matcher',  note: 'Active' },
              { label: 'Fuzzy Similarity',  note: 'Active' },
              { label: 'Semantic AI (ML)',  note: 'Active' },
              { label: 'Vector Search',     note: 'Active' },
            ].map(({ label, note }) => (
              <div key={label} className="flex items-center justify-between py-2">
                <span className="text-xs text-[#667085]">{label}</span>
                <span className="text-[10px] font-medium text-[#237A4B] bg-[#EAF5EE] px-2 py-0.5 rounded-full border border-[#B7DECA]">
                  {note}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9DEE3]">
            <p className="text-[10px] text-[#9AA3AE] leading-relaxed">
              Processing against {TOTAL_REGISTERED_TITLES} registered titles · Indexed for ANN search
            </p>
          </div>
        </div>

        {/* Recent verifications table */}
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card lg:col-span-2">
          <div className="px-5 py-4 border-b border-[#D9DEE3] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1F2933]">Recent Verifications</h3>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-[#1F5A8A] hover:text-[#12304A] font-medium flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F7F8F6] border-b border-[#D9DEE3] text-left">
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                    Proposed Title
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                    Result
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide hidden md:table-cell">
                    Similarity
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide hidden lg:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F8F6]">
                {MOCK_VERIFICATION_HISTORY.slice(0, 6).map(item => (
                  <tr key={item.id} className="hover:bg-[#F7F8F6] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1F2933] text-xs truncate max-w-[150px]">
                        {item.proposedTitle}
                      </p>
                      <p className="text-[10px] text-[#9AA3AE]">{item.language}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell w-32">
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
    </div>
  );
}
