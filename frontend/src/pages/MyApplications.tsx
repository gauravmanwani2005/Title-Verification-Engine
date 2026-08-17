import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, ArrowRight, PenSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubmissionStore } from '@/context/SubmissionStore';
import { SEED_APPLICANT_APPLICATIONS } from '@/data/mockTitles';

const statusConfig = {
  APPROVED: { icon: CheckCircle, color: 'text-[#237A4B]', bg: 'bg-[#EAF5EE] border-[#B7DECA]', label: 'Likely Eligible' },
  REJECTED: { icon: XCircle,     color: 'text-[#B42318]', bg: 'bg-[#FCEEEE] border-[#F5C2BE]', label: 'Not Eligible'    },
  REVIEW:   { icon: AlertCircle, color: 'text-[#9A6700]', bg: 'bg-[#FFF5E5] border-[#F5D99A]', label: 'Under Review'    },
};

export function MyApplications() {
  const navigate = useNavigate();
  const { submissions } = useSubmissionStore();

  // Build live apps from store
  const liveApps = submissions.map(s => ({
    id:          s.result.submissionId,
    title:       s.result.proposedTitle,
    language:    s.result.language,
    periodicity: s.result.periodicity,
    submittedOn: new Date(s.submittedAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
    probability: s.result.verificationProbability,
    status:      s.result.status,
    note:        s.result.reasons[0] ?? '',
  }));

  const MY_APPLICATIONS = [...liveApps, ...SEED_APPLICANT_APPLICATIONS];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2933]">My Applications</h1>
          <p className="text-sm text-[#667085] mt-0.5">Your title verification submission history</p>
        </div>
        <button
          onClick={() => navigate('/verify')}
          className="flex items-center gap-2 bg-[#12304A] hover:bg-[#1F5A8A] text-white font-semibold px-4 py-2 rounded text-sm transition-colors"
        >
          <PenSquare className="w-4 h-4" /> Verify New Title
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Submitted', value: MY_APPLICATIONS.length,                                        color: 'text-[#1F2933]' },
          { label: 'Likely Eligible', value: MY_APPLICATIONS.filter(a => a.status === 'APPROVED').length,   color: 'text-[#237A4B]' },
          { label: 'Needs Attention', value: MY_APPLICATIONS.filter(a => a.status !== 'APPROVED').length,   color: 'text-[#9A6700]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded border border-[#D9DEE3] shadow-card p-4 text-center">
            <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
            <p className="text-xs text-[#667085] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Applications list */}
      <div className="space-y-3">
        {MY_APPLICATIONS.map(app => {
          const cfg = statusConfig[app.status];
          const Icon = cfg.icon;
          return (
            <div key={app.id} className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#1F2933]">{app.title}</h3>
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border', cfg.bg, cfg.color)}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-[#9AA3AE]">
                    <span className="font-mono">{app.id}</span>
                    <span>{app.language}</span>
                    <span>{app.periodicity}</span>
                    <span>Submitted: {app.submittedOn}</span>
                  </div>
                  <p className="text-xs text-[#667085] mt-2 italic">{app.note}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className={cn('text-xl font-bold tabular-nums', app.probability >= 70 ? 'text-[#237A4B]' : app.probability >= 40 ? 'text-[#9A6700]' : 'text-[#B42318]')}>
                      {app.probability}%
                    </p>
                    <p className="text-[10px] text-[#9AA3AE]">probability</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => navigate('/verify')}
                      className="text-[11px] text-[#1F5A8A] hover:text-[#12304A] font-medium flex items-center gap-1 transition-colors"
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </button>
                    {app.status !== 'APPROVED' && (
                      <button
                        onClick={() => navigate('/verify')}
                        className="text-[11px] text-[#9A6700] hover:text-[#6B4800] font-medium transition-colors"
                      >
                        Modify
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
