import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, ChevronRight,
  RefreshCw, PenSquare, Info, Calendar, MapPin, Newspaper,
} from 'lucide-react';
import { cn, formatDate, getSimilarityBarColor, getSimilarityTextColor } from '@/lib/utils';
import { SimilarityBar } from '@/components/shared/SimilarityBar';
import { useSubmissionStore } from '@/context/SubmissionStore';
import { registerApprovedTitle } from '@/services/verificationService';
import type { VerificationResult as VResult, RuleCheck } from '@/types';

// ── Score gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ probability }: { probability: number }) {
  const r    = 52;
  const circ = 2 * Math.PI * r;
  const dash = (probability / 100) * circ;
  const color = probability >= 70 ? '#237A4B' : probability >= 40 ? '#9A6700' : '#B42318';

  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#D9DEE3" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-[#1F2933]">{probability}%</span>
        <span className="text-[10px] text-[#667085] font-medium">Verification</span>
        <span className="text-[10px] text-[#667085] font-medium">Probability</span>
      </div>
    </div>
  );
}

// ── Risk score row ────────────────────────────────────────────────────────────
function RiskRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#667085] w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#D9DEE3] rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', getSimilarityBarColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn('text-xs font-semibold tabular-nums w-8 text-right', getSimilarityTextColor(value))}>
        {value}%
      </span>
    </div>
  );
}

// ── Rule check row ────────────────────────────────────────────────────────────
function RuleCheckRow({ check }: { check: RuleCheck }) {
  const cfg = {
    PASSED:  { icon: CheckCircle, bg: 'bg-[#EAF5EE] border-[#B7DECA]', text: 'text-[#237A4B]', badge: 'bg-[#B7DECA] text-[#237A4B]',  label: 'Passed'  },
    WARNING: { icon: AlertCircle, bg: 'bg-[#FFF5E5] border-[#F5D99A]', text: 'text-[#9A6700]', badge: 'bg-[#F5D99A] text-[#9A6700]',  label: 'Warning' },
    FAILED:  { icon: XCircle,     bg: 'bg-[#FCEEEE] border-[#F5C2BE]', text: 'text-[#B42318]', badge: 'bg-[#F5C2BE] text-[#B42318]',  label: 'Failed'  },
  }[check.status];
  const Icon = cfg.icon;

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded border', cfg.bg)}>
      <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', cfg.text)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[#1F2933]">{check.name}</span>
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', cfg.badge)}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">{check.description}</p>
        {check.detail && (
          <p className="text-[11px] text-[#9AA3AE] mt-1 italic">{check.detail}</p>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function VerificationResult() {
  const location = useLocation();
  const navigate  = useNavigate();
  const result    = location.state as VResult | null;
  const { addSubmission } = useSubmissionStore();

  // Push to shared store so officer dashboard reflects this submission
  useEffect(() => {
    if (result) {
      addSubmission(result);
      // If approved, add to the live registry so future submissions detect it as a conflict
      if (result.status === 'APPROVED') {
        registerApprovedTitle(result);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.submissionId]);

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-12 h-12 text-[#B0BAC4] mb-4" />
        <h2 className="text-lg font-semibold text-[#667085]">No Verification Result</h2>
        <p className="text-sm text-[#9AA3AE] mt-1">Please run a verification first.</p>
        <button
          onClick={() => navigate('/verify')}
          className="mt-4 flex items-center gap-2 bg-[#12304A] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#1F5A8A] transition-colors"
        >
          <PenSquare className="w-4 h-4" /> Verify a Title
        </button>
      </div>
    );
  }

  const { status, proposedTitle, verificationProbability, similarityScore,
          riskBreakdown, ruleChecks, matches, explanation, reasons } = result;

  const statusCfg = {
    APPROVED: {
      icon: CheckCircle,
      label: 'LIKELY TO BE VERIFIED',
      wrapBg: 'bg-[#EAF5EE] border-[#B7DECA]',
      iconColor: 'text-[#237A4B]',
      textColor: 'text-[#237A4B]',
    },
    REJECTED: {
      icon: XCircle,
      label: 'VERIFICATION NOT RECOMMENDED',
      wrapBg: 'bg-[#FCEEEE] border-[#F5C2BE]',
      iconColor: 'text-[#B42318]',
      textColor: 'text-[#B42318]',
    },
    REVIEW: {
      icon: AlertCircle,
      label: 'MANUAL REVIEW REQUIRED',
      wrapBg: 'bg-[#FFF5E5] border-[#F5D99A]',
      iconColor: 'text-[#9A6700]',
      textColor: 'text-[#9A6700]',
    },
  }[status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2933]">Verification Result</h1>
          <p className="text-sm text-[#667085] mt-0.5">
            Submission ID:{' '}
            <span className="font-mono text-[#1F2933]">{result.submissionId}</span>
            {result.processingTimeMs > 0 && (
              <span className="ml-3 text-[#9AA3AE]">· Processed in {result.processingTimeMs}ms</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/verify')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D9DEE3] rounded text-xs font-medium text-[#1F2933] hover:bg-[#F7F8F6] transition-colors"
          >
            <PenSquare className="w-3.5 h-3.5" /> Modify Title
          </button>
          <button
            onClick={() => navigate('/verify')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12304A] rounded text-xs font-medium text-white hover:bg-[#1F5A8A] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Verify Another
          </button>
        </div>
      </div>

      {/* Hero result card */}
      <div className={cn('rounded border p-6', statusCfg.wrapBg)}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-widest mb-1">
              Proposed Title
            </p>
            <h2 className="text-2xl font-bold text-[#1F2933]">"{proposedTitle}"</h2>

            <div className={cn('inline-flex items-center gap-2 mt-3 py-1.5 px-3 rounded border', statusCfg.wrapBg)}>
              <StatusIcon className={cn('w-[17px] h-[17px]', statusCfg.iconColor)} />
              <span className={cn('text-sm font-bold tracking-wide', statusCfg.textColor)}>
                {statusCfg.label}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#667085]">
              <span className="flex items-center gap-1">
                <Newspaper className="w-3 h-3" /> {result.language}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {result.periodicity}
              </span>
              {result.aiCallInvoked && (
                <span className="flex items-center gap-1 text-[#1F5A8A] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F5A8A]" />
                  AI Semantic Analysis Performed
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <ScoreGauge probability={verificationProbability} />
            <p className="text-xs text-[#667085] text-center">
              {100 - verificationProbability}% rejection risk
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Similarity intelligence */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <h3 className="text-sm font-semibold text-[#1F2933] mb-4">Similarity Intelligence</h3>
            <div className="space-y-3">
              <RiskRow label="Lexical Similarity"  value={riskBreakdown.lexical} />
              <RiskRow label="Phonetic Similarity" value={riskBreakdown.phonetic} />
              <RiskRow label="Semantic Similarity" value={riskBreakdown.semantic} />
              <RiskRow label="Rule Violations"     value={riskBreakdown.ruleViolation} />
              <div className="border-t border-[#D9DEE3] pt-3">
                <RiskRow label="Overall Risk Score" value={similarityScore} />
              </div>
            </div>
          </div>

          {/* Rule checks */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <h3 className="text-sm font-semibold text-[#1F2933] mb-4">Verification Analysis</h3>
            <div className="space-y-2">
              {ruleChecks.map(check => <RuleCheckRow key={check.id} check={check} />)}
            </div>
          </div>

          {/* Matched titles */}
          {matches.length > 0 && (
            <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
              <h3 className="text-sm font-semibold text-[#1F2933] mb-4">Closest Existing Titles</h3>
              <div className="space-y-3">
                {matches.map((match, i) => (
                  <div
                    key={match.id + i}
                    className="rounded border border-[#D9DEE3] p-4 hover:border-[#B0BAC4] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-[#1F2933]">{match.title}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-[#667085]">
                          <span className="font-mono bg-[#F7F8F6] px-1.5 py-0.5 rounded text-[#1F2933] border border-[#D9DEE3]">
                            {match.registrationNumber}
                          </span>
                          <span>{match.language}</span>
                          <span>{match.periodicity}</span>
                          {match.state && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />{match.state}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {match.matchTypes.map(mt => (
                            <span
                              key={mt}
                              className="text-[10px] px-2 py-0.5 bg-[#E8EEF4] text-[#12304A] rounded border border-[#C2D8EC] font-medium"
                            >
                              {mt}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={cn(
                          'text-lg font-bold tabular-nums',
                          getSimilarityTextColor(match.similarityScore),
                        )}>
                          {match.similarityScore}%
                        </span>
                        <p className="text-[10px] text-[#9AA3AE]">similarity</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <SimilarityBar score={match.similarityScore} showLabel={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Explainability */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#1F5A8A]" />
              <h3 className="text-sm font-semibold text-[#1F2933]">Why this result?</h3>
            </div>
            <p className="text-xs text-[#667085] leading-relaxed">{explanation}</p>
            {reasons.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[#667085]">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-[#B0BAC4] flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommended action */}
          <div className={cn('rounded border p-5', statusCfg.wrapBg)}>
            <h3 className="text-sm font-semibold text-[#1F2933] mb-2">Recommended Action</h3>
            {status === 'APPROVED' && (
              <p className="text-xs text-[#237A4B] leading-relaxed">
                <strong>Title appears sufficiently unique.</strong> Proceed with formal submission to PRGI for registration.
              </p>
            )}
            {status === 'REJECTED' && (
              <p className="text-xs text-[#B42318] leading-relaxed">
                <strong>Title is too similar to an existing registered title.</strong> Consider modifying the proposed title before formal submission.
              </p>
            )}
            {status === 'REVIEW' && (
              <p className="text-xs text-[#9A6700] leading-relaxed">
                <strong>Case referred to PRGI Officer for manual review.</strong> You will be notified of the decision.
              </p>
            )}
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => navigate('/verify')}
                className="w-full py-2 rounded text-xs font-semibold bg-[#12304A] hover:bg-[#1F5A8A] text-white transition-colors"
              >
                {status === 'APPROVED' ? 'Verify Another Title' : 'Modify & Retry'}
              </button>
              <button
                onClick={() => navigate('/history')}
                className="w-full py-2 rounded text-xs font-medium border border-[#D9DEE3] text-[#667085] hover:bg-[#F7F8F6] transition-colors"
              >
                View History
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="bg-[#F7F8F6] rounded border border-[#D9DEE3] p-4">
            <p className="text-[10px] text-[#9AA3AE] font-semibold uppercase tracking-wide mb-2">
              Submission Details
            </p>
            <div className="space-y-1.5 text-[11px] text-[#667085]">
              {[
                ['ID',          result.submissionId],
                ['Language',    result.language],
                ['Periodicity', result.periodicity],
                ['AI Analysis', result.aiCallInvoked ? 'Yes' : 'No'],
                ['Timestamp',   formatDate(result.timestamp)],
              ].map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span>{key}</span>
                  <span className="font-medium text-[#1F2933] font-mono">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
