import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/shared/StatCard';
import { CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import {
  MOCK_DAILY_STATS,
  MOCK_LANGUAGE_DISTRIBUTION,
  MOCK_REJECTION_REASONS,
  TOTAL_CHECKS,
  APPROVAL_RATE,
  AVG_SIMILARITY,
  SIMILARITY_DISTRIBUTION,
} from '@/data/mockTitles';
import { useSubmissionStore } from '@/context/SubmissionStore';

// Restrained palette — two navy tones + semantic status only
const CHART_NAVY   = '#12304A';
const APPROVED_CLR = '#237A4B';
const REJECTED_CLR = '#B42318';
const REVIEW_CLR   = '#9A6700';

// Pie uses a monochromatic navy ramp — no rainbow
const PIE_COLORS = [
  '#12304A', '#1F5A8A', '#2E7AB0', '#4A9ACE',
  '#6AAEDD', '#8ABFEA', '#B3D4F0', '#D5E9F7',
];

// SIMILARITY_DISTRIBUTION is now imported — computed from actual history data

const tooltipStyle = {
  fontSize: 12,
  border: '1px solid #D9DEE3',
  borderRadius: 4,
  backgroundColor: '#fff',
  color: '#1F2933',
};

export function Analytics() {
  const { submissions } = useSubmissionStore();

  // Live high-risk count adds to the base
  const liveHighRisk = submissions.filter(s => s.result.similarityScore >= 70).length;
  const totalHighRisk = (MOCK_REJECTION_REASONS.reduce((s, r) => s + r.count, 0) * 0.12 | 0) + liveHighRisk;

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-bold text-[#1F2933]">Analytics</h1>
        <p className="text-sm text-[#667085] mt-0.5">
          Verification activity, outcomes and system performance
        </p>
      </div>

      {/* KPI cards — all values computed from data */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Checks"    value={(TOTAL_CHECKS + submissions.length).toLocaleString('en-IN')} icon={BarChart3}    trend="This month" />
        <StatCard label="Approval Rate"   value={APPROVAL_RATE}  icon={CheckCircle}   trend="Based on last 7 days" trendUp={true} />
        <StatCard label="Avg. Similarity" value={AVG_SIMILARITY} icon={AlertTriangle} trend="Across all checks" />
        <StatCard label="High-Risk Flags" value={totalHighRisk.toLocaleString('en-IN')} icon={XCircle} trend="Similarity > 70%" />
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Outcomes over time */}
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
          <h3 className="text-sm font-semibold text-[#1F2933] mb-1">
            Verification Outcomes — Last 7 Days
          </h3>
          <p className="text-xs text-[#667085] mb-4">Daily breakdown by verdict</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={MOCK_DAILY_STATS} barSize={10} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#667085' }} />
              <Bar dataKey="approved" name="Approved" fill={APPROVED_CLR} radius={[2, 2, 0, 0]} />
              <Bar dataKey="rejected" name="Rejected" fill={REJECTED_CLR} radius={[2, 2, 0, 0]} />
              <Bar dataKey="review"   name="Review"   fill={REVIEW_CLR}   radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Language distribution */}
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
          <h3 className="text-sm font-semibold text-[#1F2933] mb-1">Language-wise Distribution</h3>
          <p className="text-xs text-[#667085] mb-4">Share of registered titles by language</p>
          <div className="flex gap-4 items-center">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={MOCK_LANGUAGE_DISTRIBUTION}
                  dataKey="count"
                  nameKey="language"
                  cx="50%" cy="50%"
                  outerRadius={80} innerRadius={44}
                >
                  {MOCK_LANGUAGE_DISTRIBUTION.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [Number(value).toLocaleString('en-IN'), 'Titles']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {MOCK_LANGUAGE_DISTRIBUTION.map((item, i) => (
                <div key={item.language} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-[#667085]">{item.language}</span>
                  </div>
                  <span className="text-[#1F2933] font-medium tabular-nums">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Similarity distribution */}
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
          <h3 className="text-sm font-semibold text-[#1F2933] mb-1">Similarity Score Distribution</h3>
          <p className="text-xs text-[#667085] mb-4">
            Number of verifications per similarity range
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SIMILARITY_DISTRIBUTION} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F0" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 9, fill: '#667085' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Verifications" radius={[2, 2, 0, 0]}>
                {SIMILARITY_DISTRIBUTION.map((entry, i) => {
                  const mid = parseInt(entry.range.split('–')[0]);
                  const fill = mid >= 70 ? REJECTED_CLR : mid >= 40 ? REVIEW_CLR : CHART_NAVY;
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rejection reasons */}
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
          <h3 className="text-sm font-semibold text-[#1F2933] mb-1">Most Common Rejection Reasons</h3>
          <p className="text-xs text-[#667085] mb-4">Frequency by rule category</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_REJECTION_REASONS} layout="vertical" barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="reason" type="category" width={168}
                tick={{ fontSize: 10, fill: '#667085' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Count" fill={CHART_NAVY} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume trend */}
      <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
        <h3 className="text-sm font-semibold text-[#1F2933] mb-1">Verification Volume Trend</h3>
        <p className="text-xs text-[#667085] mb-4">Daily submission count over the past week</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={MOCK_DAILY_STATS}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#667085' }} />
            <Line type="monotone" dataKey="approved" name="Approved" stroke={APPROVED_CLR} strokeWidth={2} dot={{ r: 3, fill: APPROVED_CLR }} />
            <Line type="monotone" dataKey="rejected" name="Rejected" stroke={REJECTED_CLR} strokeWidth={2} dot={{ r: 3, fill: REJECTED_CLR }} />
            <Line type="monotone" dataKey="review"   name="Review"   stroke={REVIEW_CLR}   strokeWidth={2} dot={{ r: 3, fill: REVIEW_CLR }} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
