import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ChevronDown, CheckCircle, Loader2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { verifyTitle } from '@/services/verificationService';
import { TOTAL_REGISTERED_TITLES } from '@/data/mockTitles';
import type { TitleVerificationRequest, AnalysisStep } from '@/types';

const LANGUAGES    = ['Hindi','English','Marathi','Gujarati','Bengali','Tamil','Telugu','Kannada','Malayalam','Punjabi','Urdu','Other'];
const PERIODICITIES = ['Daily','Weekly','Fortnightly','Monthly','Quarterly','Annual','Other'];
const STATES       = ['Andhra Pradesh','Bihar','Delhi','Gujarat','Haryana','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal','Other'];

const ANALYSIS_STEPS: Omit<AnalysisStep, 'status'>[] = [
  { id: 'normalize', label: 'Normalizing title text' },
  { id: 'exact',     label: 'Checking exact matches' },
  { id: 'phonetic',  label: 'Checking phonetic similarity' },
  { id: 'semantic',  label: 'Checking semantic similarity' },
  { id: 'rules',     label: 'Checking PRGI rules' },
  { id: 'score',     label: 'Generating verification probability' },
];

const DEMO_SCENARIOS = [
  { title: 'Bharat Chronicle',       label: 'Safe title — likely approved',      variant: 'approved' },
  { title: 'Hindustan Time',         label: 'Spelling variant — rejected',        variant: 'rejected' },
  { title: 'Police Samachar',        label: 'Restricted word — auto-rejected',    variant: 'rejected' },
  { title: 'Amar Ujala Monthly',     label: 'Periodicity modification',           variant: 'rejected' },
  { title: 'Sandhya Pratideen',      label: 'Cross-language semantic',            variant: 'review'   },
  { title: 'Bharat Samachar',        label: 'Near-exact match in database',       variant: 'rejected' },
] as const;

const scenarioClasses: Record<string, string> = {
  approved: 'bg-[#EAF5EE] border-[#B7DECA] text-[#237A4B] hover:border-[#237A4B]',
  rejected: 'bg-[#FCEEEE] border-[#F5C2BE] text-[#B42318] hover:border-[#B42318]',
  review:   'bg-[#FFF5E5] border-[#F5D99A] text-[#9A6700] hover:border-[#9A6700]',
};

const selectClass = cn(
  'w-full appearance-none px-3 py-2.5 border border-[#D9DEE3] rounded bg-[#F7F8F6]',
  'text-sm text-[#1F2933] focus:outline-none focus:ring-2 focus:ring-[#1F5A8A] focus:bg-white transition-colors',
);

export function VerifyTitle() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read prefill data passed from ApplicantDashboard
  const prefillState = location.state as {
    prefill?: string;
    language?: string;
    periodicity?: string;
  } | null;

  const [form, setForm] = useState<TitleVerificationRequest>({
    title:       prefillState?.prefill      ?? '',
    language:    prefillState?.language     ?? 'Hindi',
    periodicity: prefillState?.periodicity  ?? 'Daily',
    state: '', district: '',
  });
  const [errors,      setErrors]      = useState<{ title?: string }>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps,       setSteps]       = useState<AnalysisStep[]>([]);

  // Auto-trigger analysis when arriving with a prefill from the dashboard
  useEffect(() => {
    if (prefillState?.prefill && prefillState.prefill.trim().length >= 2) {
      // Small delay so the form visibly populates before analysis starts
      const timer = setTimeout(() => { runAnalysis(); }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.title.trim())              errs.title = 'Please enter a proposed publication title.';
    else if (form.title.trim().length < 2) errs.title = 'Title must be at least 2 characters.';
    else if (form.title.trim().length > 200) errs.title = 'Title must not exceed 200 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function runAnalysis() {
    if (!validate()) return;
    setIsAnalyzing(true);
    const initial: AnalysisStep[] = ANALYSIS_STEPS.map(s => ({ ...s, status: 'pending' }));
    setSteps(initial);

    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 190));
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
      await new Promise(r => setTimeout(r, 240));
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'done' }    : s));
    }

    try {
      const result = await verifyTitle(form);
      navigate('/result', { state: result });
    } catch {
      setIsAnalyzing(false);
      setSteps([]);
      setErrors({ title: 'Verification service unavailable. Please try again.' });
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-bold text-[#1F2933]">Verify New Publication Title</h1>
        <p className="text-sm text-[#667085] mt-0.5">
          Enter a proposed publication title to check its uniqueness and compliance with PRGI guidelines.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: form + analysis progress */}
        <div className="xl:col-span-2 space-y-6">

      {/* Info banner — mobile only, desktop gets it in right column */}
      <div className="xl:hidden bg-[#EAF1F8] border border-[#C2D8EC] rounded px-4 py-3 flex gap-3">
        <Info className="w-4 h-4 text-[#1F5A8A] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#1F5A8A] leading-relaxed">
          The verification engine checks the proposed title against{' '}
          <strong>{TOTAL_REGISTERED_TITLES} registered PRGI titles</strong> using exact matching, phonetic similarity,
          semantic AI analysis, and PRGI rule compliance. Results are generated in under 2 seconds.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-6">
        <h2 className="text-sm font-semibold text-[#1F2933] mb-5">Title Information</h2>

        {/* Title input */}
        <div className="mb-5">
          <label htmlFor="title" className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
            Proposed Title <span className="text-[#B42318]">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors({}); }}
            onKeyDown={e => { if (e.key === 'Enter' && !isAnalyzing) runAnalysis(); }}
            placeholder="e.g. Bharat Samachar"
            disabled={isAnalyzing}
            aria-invalid={!!errors.title}
            className={cn(
              'w-full text-base font-medium px-4 py-3 rounded border bg-[#F7F8F6] transition-colors',
              'placeholder:text-[#B0BAC4] placeholder:font-normal text-[#1F2933]',
              'focus:outline-none focus:ring-2 focus:ring-[#1F5A8A] focus:bg-white focus:border-[#1F5A8A]',
              errors.title ? 'border-[#B42318] bg-[#FCEEEE]' : 'border-[#D9DEE3]',
              isAnalyzing && 'opacity-50 cursor-not-allowed',
            )}
            maxLength={200}
          />
          {errors.title && (
            <p className="flex items-center gap-1.5 text-xs text-[#B42318] mt-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.title}
            </p>
          )}
          <p className="text-[11px] text-[#9AA3AE] mt-1">{form.title.length}/200 characters</p>
        </div>

        {/* Language + Periodicity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label htmlFor="language" className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
              Language <span className="text-[#B42318]">*</span>
            </label>
            <div className="relative">
              <select id="language" value={form.language} disabled={isAnalyzing}
                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className={cn(selectClass, isAnalyzing && 'opacity-50 cursor-not-allowed')}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA3AE] pointer-events-none" />
            </div>
          </div>
          <div>
            <label htmlFor="periodicity" className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
              Periodicity <span className="text-[#B42318]">*</span>
            </label>
            <div className="relative">
              <select id="periodicity" value={form.periodicity} disabled={isAnalyzing}
                onChange={e => setForm(f => ({ ...f, periodicity: e.target.value }))}
                className={cn(selectClass, isAnalyzing && 'opacity-50 cursor-not-allowed')}>
                {PERIODICITIES.map(p => <option key={p}>{p}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA3AE] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Optional fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="state" className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
              Publication State <span className="text-[#9AA3AE] font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <select id="state" value={form.state} disabled={isAnalyzing}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className={cn(selectClass, isAnalyzing && 'opacity-50 cursor-not-allowed')}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA3AE] pointer-events-none" />
            </div>
          </div>
          <div>
            <label htmlFor="district" className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-1.5">
              Publication District <span className="text-[#9AA3AE] font-normal">(Optional)</span>
            </label>
            <input id="district" type="text" value={form.district} disabled={isAnalyzing}
              placeholder="e.g. New Delhi"
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
              className={cn(
                'w-full px-3 py-2.5 border border-[#D9DEE3] rounded bg-[#F7F8F6] text-sm text-[#1F2933]',
                'placeholder:text-[#B0BAC4]',
                'focus:outline-none focus:ring-2 focus:ring-[#1F5A8A] focus:bg-white transition-colors',
                isAnalyzing && 'opacity-50 cursor-not-allowed',
              )}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 py-3 rounded font-semibold text-sm transition-all',
            isAnalyzing
              ? 'bg-[#12304A] text-white/60 cursor-not-allowed'
              : 'bg-[#12304A] hover:bg-[#1F5A8A] text-white shadow-sm',
          )}
        >
          {isAnalyzing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
            : <><Search className="w-4 h-4" /> Analyze Title</>
          }
        </button>
        <p className="text-center text-[11px] text-[#9AA3AE] mt-2">
          Checks {TOTAL_REGISTERED_TITLES} registered titles · Phonetic · Semantic AI · PRGI rules
        </p>
      </div>

      {/* Analysis progress */}
      {isAnalyzing && steps.length > 0 && (
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-6">
          <h3 className="text-sm font-semibold text-[#1F2933] mb-4">Analysis in Progress</h3>
          <div className="space-y-3">
            {steps.map(step => (
              <div key={step.id} className="flex items-center gap-3">
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  {step.status === 'done'    && <CheckCircle className="w-[18px] h-[18px] text-[#237A4B]" />}
                  {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-[#1F5A8A]" />}
                  {step.status === 'pending' && <div className="w-3 h-3 rounded-full border-2 border-[#D9DEE3]" />}
                </div>
                <span className={cn(
                  'text-sm transition-colors',
                  step.status === 'done'    && 'text-[#1F2933] font-medium',
                  step.status === 'running' && 'text-[#1F5A8A] font-semibold',
                  step.status === 'pending' && 'text-[#B0BAC4]',
                )}>
                  {step.label}
                </span>
                {step.status === 'running' && (
                  <span className="text-[10px] text-[#667085] ml-auto">Processing…</span>
                )}
                {step.status === 'done' && (
                  <span className="text-[10px] text-[#237A4B] ml-auto">Done</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#D9DEE3]">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-[#D9DEE3] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#12304A] rounded-full transition-all duration-300"
                  style={{ width: `${(steps.filter(s => s.status === 'done').length / steps.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[#667085] tabular-nums">
                {steps.filter(s => s.status === 'done').length}/{steps.length}
              </span>
            </div>
          </div>
        </div>
      )}
        </div>{/* end left col */}

        {/* Right column: info + demo scenarios — always visible */}
        <div className="space-y-5">

          {/* Info panel */}
          <div className="bg-[#E8EEF4] border border-[#C2D8EC] rounded p-4">
            <div className="flex gap-2.5">
              <Info className="w-4 h-4 text-[#1F5A8A] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#12304A] mb-1">How verification works</p>
                <p className="text-xs text-[#1F5A8A] leading-relaxed">
                  Checks against <strong>{TOTAL_REGISTERED_TITLES}</strong> registered PRGI titles using exact matching,
                  phonetic similarity, semantic AI analysis, and PRGI rule compliance.
                  Results in under 2 seconds.
                </p>
              </div>
            </div>
          </div>

          {/* What gets checked */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-4">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-3">
              Checks performed
            </p>
            <ul className="space-y-2">
              {[
                'Exact & near-exact matches',
                'Spelling variations',
                'Phonetic similarity (DoubleMetaphone)',
                'Semantic AI similarity',
                'Cross-language meaning',
                'Periodicity modifications',
                'Title combination detection',
                'Restricted words & prefixes',
              ].map(item => (
                <li key={item} className="flex items-center gap-2 text-xs text-[#667085]">
                  <div className="w-1 h-1 rounded-full bg-[#12304A] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Demo scenarios */}
          {!isAnalyzing && (
            <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-4">
              <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wide mb-3">
                Demo Scenarios
              </p>
              <div className="space-y-2">
                {DEMO_SCENARIOS.map(s => (
                  <button
                    key={s.title}
                    onClick={() => { setForm(f => ({ ...f, title: s.title })); setErrors({}); }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded border text-xs font-medium transition-all',
                      scenarioClasses[s.variant],
                    )}
                  >
                    <span className="font-semibold block">{s.title}</span>
                    <span className="font-normal opacity-70">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>{/* end right col */}

      </div>{/* end grid */}
    </div>
  );
}
