import { Shield, BookOpen, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    title: 'Restricted Words',
    severity: 'HARD',
    description:
      'Titles containing these terms are automatically rejected. These words are reserved for government agencies, security forces, and protected institutions.',
    items: ['Police', 'CBI', 'CID', 'Army', 'Navy', 'Airforce', 'NIA', 'RAW', 'Crime', 'Corruption', 'President', 'Parliament', 'Supreme Court'],
  },
  {
    title: 'Disallowed Prefixes',
    severity: 'HARD',
    description:
      'Titles beginning with these prefixes are flagged for review or rejection under PRGI guidelines.',
    items: ['National', 'Rashtriya', 'All India', 'Government', 'Official', 'The'],
  },
  {
    title: 'Disallowed Suffixes',
    severity: 'SOFT',
    description:
      'Titles ending with these terms may be restricted depending on context and existing registrations.',
    items: ['Media', 'Digital', 'Online', 'Network', 'Channel'],
  },
  {
    title: 'Periodicity Rules',
    severity: 'HARD',
    description:
      'Adding a periodicity modifier to an existing registered title does not constitute a new or original title. Such submissions are automatically rejected.',
    items: ['Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'Annual', 'Saptahik', 'Masik', 'Saaptahik'],
  },
  {
    title: 'Combination Rules',
    severity: 'HARD',
    description:
      'A title formed by combining two or more existing registered titles is treated as non-original and rejected.',
    items: [
      'If "Bharat" and "Samachar" are both registered separately, "Bharat Samachar" may be flagged as a combination title',
    ],
  },
  {
    title: 'Phonetic Similarity',
    severity: 'SOFT',
    description:
      'Titles that sound similar to existing registrations are flagged using DoubleMetaphone encoding. Phonetic similarity is a supporting signal weighted at ~15–20% of the final score.',
    items: [
      'Algorithm: DoubleMetaphone',
      'Language-aware transliteration applied before encoding',
      'Both primary and secondary codes compared against the index',
    ],
  },
  {
    title: 'Cross-Language Semantic Similarity',
    severity: 'SOFT',
    description:
      'The AI engine detects titles that carry the same meaning in different languages. Standard string matching cannot catch this — only multilingual semantic embeddings can.',
    items: [
      'Model: Multilingual Sentence Transformer (paraphrase-multilingual-mpnet)',
      'Supports Hindi, English, Marathi, Bengali, Gujarati, Tamil, Telugu and more',
      'Triggered when lexical/phonetic similarity exceeds 40% threshold',
    ],
  },
];

export function RulesGuidelines() {
  return (
    <div className="space-y-5">

      <div>
        <h1 className="text-xl font-bold text-[#1F2933]">Rules & Guidelines</h1>
        <p className="text-sm text-[#667085] mt-0.5">
          Configured PRGI verification rules applied by the automated engine
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#FFF5E5] border border-[#F5D99A] rounded px-4 py-3 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-[#9A6700] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#9A6700] leading-relaxed">
          This page displays the rules currently configured in the verification engine.
          It does not represent the complete official PRGI rulebook. For authoritative guidelines,
          refer to the Registration of Newspapers (Central) Rules, 1956, as amended.
        </p>
      </div>

      {/* Rule sections — two column grid on wide screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {SECTIONS.map(section => (
          <div key={section.title} className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
            <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                {section.severity === 'HARD'
                  ? <Shield   className="w-4 h-4 text-[#B42318]" />
                  : <BookOpen className="w-4 h-4 text-[#9A6700]" />}
                <h2 className="text-sm font-semibold text-[#1F2933]">{section.title}</h2>
              </div>
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded border',
                section.severity === 'HARD'
                  ? 'bg-[#FCEEEE] text-[#B42318] border-[#F5C2BE]'
                  : 'bg-[#FFF5E5] text-[#9A6700] border-[#F5D99A]',
              )}>
                {section.severity === 'HARD'
                  ? 'Hard Rule — Auto Reject'
                  : 'Soft Rule — Contributes to Score'}
              </span>
            </div>

            <p className="text-xs text-[#667085] mb-3 leading-relaxed">{section.description}</p>

            <div className="flex flex-wrap gap-1.5">
              {section.items.map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 text-xs bg-[#F7F8F6] border border-[#D9DEE3] text-[#667085] px-2.5 py-1 rounded"
                >
                  <ChevronRight className="w-3 h-3 text-[#B0BAC4]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
