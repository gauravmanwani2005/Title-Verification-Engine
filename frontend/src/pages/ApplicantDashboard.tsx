import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubmissionStore } from '@/context/SubmissionStore';
import { SEED_APPLICANT_APPLICATIONS, TOTAL_REGISTERED_TITLES } from '@/data/mockTitles';

const LANGUAGES    = ['Hindi','English','Marathi','Gujarati','Bengali','Tamil','Telugu','Other'];
const PERIODICITIES = ['Daily','Weekly','Fortnightly','Monthly','Other'];

const selectClass = cn(
  'appearance-none px-3 py-2.5 border border-[#D9DEE3] rounded bg-[#F7F8F6]',
  'text-sm text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#1F5A8A] focus:bg-white transition-colors',
);

const statusIcon = {
  APPROVED: <CheckCircle className="w-4 h-4 text-[#237A4B]" />,
  REJECTED: <XCircle    className="w-4 h-4 text-[#B42318]" />,
  REVIEW:   <AlertCircle className="w-4 h-4 text-[#9A6700]" />,
};

const resultLabel = {
  APPROVED: 'Likely Eligible',
  REJECTED: 'Similarity Found',
  REVIEW:   'Under Review',
};

export function ApplicantDashboard() {
  const navigate = useNavigate();
  const { submissions } = useSubmissionStore();
  const [title,       setTitle]       = useState('');
  const [language,    setLanguage]    = useState('Hindi');
  const [periodicity, setPeriodicity] = useState('Daily');

  // Live applications from submission store (newest first)
  const liveApps = submissions.map(s => ({
    id:          s.result.submissionId,
    title:       s.result.proposedTitle,
    submittedOn: new Date(s.submittedAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    probability: s.result.verificationProbability,
    status:      s.result.status,
  }));

  // Merge live + seed (live submissions appear first)
  const MY_APPLICATIONS = [...liveApps, ...SEED_APPLICANT_APPLICATIONS];

  const summary = {
    checked:  MY_APPLICATIONS.length,
    eligible: MY_APPLICATIONS.filter(a => a.status === 'APPROVED').length,
    modify:   MY_APPLICATIONS.filter(a => a.status !== 'APPROVED').length,
  };

  function handleCheck() {
    if (!title.trim()) return;
    navigate('/verify', { state: { prefill: title, language, periodicity } });
  }

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-[#1F2933]">Title Verification</h1>
        <p className="text-sm text-[#667085] mt-0.5">
          Check your proposed publication title against registered titles and applicable verification rules.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left: verification form ────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Verify form */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-6">
            <h2 className="text-sm font-semibold text-[#1F2933] mb-1">Verify a New Title</h2>
            <p className="text-xs text-[#667085] mb-5">
              Enter your proposed publication title below to check its eligibility.
            </p>

            {/* Title input — large */}
            <div className="mb-4">
              <label htmlFor="ap-title" className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
                Proposed Publication Title <span className="text-[#B42318]">*</span>
              </label>
              <input
                id="ap-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCheck(); }}
                placeholder="Enter publication title..."
                className={cn(
                  'w-full text-base font-medium px-4 py-3 rounded border border-[#D9DEE3] bg-[#F7F8F6]',
                  'text-[#1F2933] placeholder:text-[#B0BAC4] placeholder:font-normal',
                  'focus:outline-none focus:ring-2 focus:ring-[#1F5A8A] focus:bg-white focus:border-[#1F5A8A] transition-colors',
                )}
              />
            </div>

            {/* Language + Periodicity */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label htmlFor="ap-lang" className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
                  Language
                </label>
                <div className="relative">
                  <select id="ap-lang" value={language} onChange={e => setLanguage(e.target.value)} className={selectClass + ' w-full'}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA3AE] pointer-events-none" />
                </div>
              </div>
              <div>
                <label htmlFor="ap-period" className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
                  Periodicity
                </label>
                <div className="relative">
                  <select id="ap-period" value={periodicity} onChange={e => setPeriodicity(e.target.value)} className={selectClass + ' w-full'}>
                    {PERIODICITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA3AE] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleCheck}
              className="flex items-center justify-center gap-2 bg-[#12304A] hover:bg-[#1F5A8A] text-white font-semibold px-6 py-2.5 rounded text-sm transition-colors w-full sm:w-auto"
            >
              <Search className="w-4 h-4" />
              Check Title
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-[#9AA3AE] mt-2">
              Checked against {TOTAL_REGISTERED_TITLES} registered PRGI titles · Results in under 2 seconds
            </p>
          </div>

          {/* My Applications */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card">
            <div className="px-5 py-4 border-b border-[#D9DEE3] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1F2933]">Recent Applications</h3>
                <p className="text-xs text-[#667085] mt-0.5">Your recent title verification submissions</p>
              </div>
              <button
                onClick={() => navigate('/my-applications')}
                className="text-xs text-[#1F5A8A] hover:text-[#12304A] font-medium flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F7F8F6] border-b border-[#D9DEE3] text-left">
                    {['Proposed Title','Submitted On','Probability','Result','Action'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-semibold text-[#667085] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7F8F6]">
                  {MY_APPLICATIONS.map(app => (
                    <tr key={app.id} className="hover:bg-[#F7F8F6] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#1F2933] text-xs">{app.title}</p>
                        <p className="text-[10px] text-[#9AA3AE] font-mono">{app.id}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#667085]">{app.submittedOn}</td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#D9DEE3] rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', app.probability >= 70 ? 'bg-[#237A4B]' : app.probability >= 40 ? 'bg-[#9A6700]' : 'bg-[#B42318]')}
                              style={{ width: `${app.probability}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold tabular-nums text-[#1F2933] w-8 text-right">
                            {app.probability}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcon[app.status]}
                          <span className={cn(
                            'text-xs font-medium',
                            app.status === 'APPROVED' ? 'text-[#237A4B]' : app.status === 'REJECTED' ? 'text-[#B42318]' : 'text-[#9A6700]',
                          )}>
                            {resultLabel[app.status]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate('/verify')}
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

        {/* ── Right: summary + guidance ──────────────────────────────────── */}
        <div className="space-y-5">

          {/* Summary */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <h3 className="text-sm font-semibold text-[#1F2933] mb-4">My Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Titles Checked',    value: summary.checked,  color: 'text-[#1F2933]' },
                { label: 'Likely Eligible',   value: summary.eligible, color: 'text-[#237A4B]' },
                { label: 'Needs Modification',value: summary.modify,   color: 'text-[#9A6700]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#F7F8F6] last:border-0">
                  <span className="text-xs text-[#667085]">{label}</span>
                  <span className={cn('text-lg font-bold tabular-nums', color)}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-[#E8EEF4] border border-[#C2D8EC] rounded p-4">
            <p className="text-[11px] font-semibold text-[#12304A] uppercase tracking-wide mb-3">
              Verification Process
            </p>
            <ol className="space-y-2">
              {[
                'Enter your proposed publication title',
                'System checks ' + TOTAL_REGISTERED_TITLES + ' registered titles',
                'Phonetic & semantic similarity analysis',
                'PRGI rule compliance check',
                'Receive instant verification result',
                'If eligible, proceed with formal submission',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#1F5A8A]">
                  <span className="w-4 h-4 rounded-full bg-[#12304A] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Help notice */}
          <div className="bg-white rounded border border-[#D9DEE3] p-4">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
              Important Note
            </p>
            <p className="text-xs text-[#667085] leading-relaxed">
              This system provides an automated preliminary check. Final registration is subject to
              formal review by a PRGI officer. A positive result here does not guarantee registration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
