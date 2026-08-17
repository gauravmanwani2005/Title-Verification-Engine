import { CheckCircle } from 'lucide-react';
import { TOTAL_REGISTERED_TITLES } from '@/data/mockTitles';

const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'User Submission',
    description:
      'Applicant submits proposed publication title via the web portal with language and periodicity details.',
  },
  {
    step: '02',
    title: 'Text Normalization',
    description:
      'Input is Unicode-normalized (NFC), lowercased, Devanagari/Indic script transliterated to Latin using ICU4J, punctuation stripped, and whitespace collapsed.',
  },
  {
    step: '03',
    title: 'Rule Engine',
    description:
      'Deterministic hard rules are checked first: disallowed words, restricted prefixes/suffixes, periodicity modifications, and title combination detection. Any hard rule violation auto-rejects — no AI involved.',
  },
  {
    step: '04',
    title: 'Phonetic Encoding',
    description:
      'DoubleMetaphone algorithm generates phonetic codes. All ' + TOTAL_REGISTERED_TITLES + ' registered titles with matching codes are retrieved in milliseconds via indexed lookup.',
  },
  {
    step: '05',
    title: 'Fuzzy Matching',
    description:
      'MySQL FULLTEXT n-gram search + Jaro-Winkler + Levenshtein distance score the lexical similarity of the proposed title against the candidate set.',
  },
  {
    step: '06',
    title: 'Semantic AI Embeddings',
    description:
      'Multilingual sentence-transformer model generates dense vector representations. Cosine similarity catches cross-language matches regardless of script or language.',
  },
  {
    step: '07',
    title: 'Weighted Score Aggregation',
    description:
      'Lexical (20%), Phonetic (15%), Semantic (20%), Multilingual (15%), Rule signals (30%) are combined using configurable weights stored in the database — not hardcoded.',
  },
  {
    step: '08',
    title: 'Verification Probability',
    description:
      'Verification Probability = 100% − Similarity Score. Threshold: ≥70% → Approved · 30–70% → Manual Review · <30% → Rejected. Admin-configurable.',
  },
  {
    step: '09',
    title: 'Explainable Result',
    description:
      'Structured result: verdict, probability, risk breakdown per dimension, closest matching titles with similarity %, and plain-language reasons. AI never decides alone — hard rules always take precedence.',
  },
];

const TECH_STACK = [
  {
    category: 'Backend',
    items: ['Spring Boot 4 (Java 21)', 'Hibernate ORM', 'MySQL 9 + FULLTEXT ngram index', 'Resilience4j Circuit Breaker'],
  },
  {
    category: 'Similarity Engine',
    items: ['Apache Commons DoubleMetaphone', 'Jaro-Winkler (Apache Commons Text)', 'Levenshtein Distance', 'ICU4J Transliteration'],
  },
  {
    category: 'AI / ML Service',
    items: ['Python FastAPI (planned)', 'Sentence Transformers (multilingual-mpnet)', 'pgvector / HNSW Index', 'Circuit Breaker fallback to 0.0'],
  },
  {
    category: 'Frontend',
    items: ['React 18 + TypeScript', 'Vite + Tailwind CSS', 'Recharts', 'React Router v6'],
  },
];

export function AboutSystem() {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-bold text-[#1F2933]">System Information</h1>
        <p className="text-sm text-[#667085] mt-0.5">
          AI-Assisted Title Verification Engine — Architecture and Pipeline
        </p>
      </div>

      {/* System overview — navy, no gradients */}
      <div className="bg-[#12304A] rounded p-6 text-white">
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
          SIH 2026 · PSS06
        </p>
        <h2 className="text-lg font-bold text-white">
          Automated Title Verification System for PRGI
        </h2>
        <p className="text-sm text-white/60 mt-2 leading-relaxed max-w-xl">
          An AI-assisted system that automatically verifies new publication title submissions
          against the PRGI database of {TOTAL_REGISTERED_TITLES} registered titles — detecting exact matches,
          phonetic similarity, semantic similarity across languages, and rule violations —
          with full explainability.
        </p>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Registered Titles',   value: TOTAL_REGISTERED_TITLES },
            { label: 'Languages Supported', value: '12+'       },
            { label: 'Avg. Response Time',  value: '< 2 sec'   },
            { label: 'Detection Methods',   value: '7 layers'  },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/8 border border-white/10 rounded p-3">
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline + Tech Stack — two column on wide screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Pipeline */}
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-6">
          <h2 className="text-sm font-semibold text-[#1F2933] mb-6">Verification Pipeline</h2>
          <div className="space-y-0">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.step} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#12304A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {stage.step}
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className="flex-1 w-px bg-[#D9DEE3] my-1" style={{ minHeight: 20 }} />
                  )}
                </div>
                <div className="pb-5 flex-1">
                  <p className="text-sm font-semibold text-[#1F2933]">{stage.title}</p>
                  <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">{stage.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Tech stack + guiding principle */}
        <div className="space-y-6">

          {/* Guiding principle */}
          <div className="bg-[#FFF5E5] border border-[#F5D99A] rounded p-5">
            <p className="text-[10px] font-semibold text-[#9A6700] mb-2 uppercase tracking-wide">
              Guiding Principle — Section 43
            </p>
            <p className="text-sm text-[#1F2933] italic leading-relaxed">
              "AI never decides alone. Every decision = Deterministic Rules (hard, non-negotiable) +
              Fast Search + Phonetic/Fuzzy Matching + Multilingual Semantic Similarity (AI-assisted) +
              Weighted Explainable Scoring + Human Review for borderline cases."
            </p>
          </div>

          {/* Tech stack */}
          <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <h2 className="text-sm font-semibold text-[#1F2933] mb-4">Technology Stack</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {TECH_STACK.map(({ category, items }) => (
                <div key={category}>
                  <p className="text-[10px] font-semibold text-[#9AA3AE] uppercase tracking-wide mb-2">
                    {category}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map(item => (
                      <li key={item} className="flex items-center gap-2 text-xs text-[#667085]">
                        <CheckCircle className="w-3 h-3 text-[#237A4B] flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
