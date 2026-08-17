import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, MapPin, Newspaper, Building, User, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { SimilarityBar } from '@/components/shared/SimilarityBar';
import { MOCK_REGISTERED_TITLES } from '@/data/mockTitles';
import type { RegisteredTitle } from '@/types';

const STATUS_CLASSES: Record<RegisteredTitle['status'], string> = {
  ACTIVE:    'bg-[#EAF5EE] text-[#237A4B] border-[#B7DECA]',
  CANCELLED: 'bg-[#FCEEEE] text-[#B42318] border-[#F5C2BE]',
  SUSPENDED: 'bg-[#FFF5E5] text-[#9A6700] border-[#F5D99A]',
};

export function TitleDetail() {
  const location = useLocation();
  const navigate  = useNavigate();
  const title     = location.state as RegisteredTitle | null;

  if (!title) {
    return (
      <div className="flex flex-col items-center py-24">
        <p className="text-[#667085]">Title not found.</p>
        <button onClick={() => navigate('/database')} className="mt-4 text-[#1F5A8A] text-sm hover:underline">
          ← Back to Database
        </button>
      </div>
    );
  }

  const similarTitles = MOCK_REGISTERED_TITLES
    .filter(t => t.id !== title.id && (t.language === title.language || t.periodicity === title.periodicity))
    .slice(0, 4)
    .map((t, i) => ({ ...t, similarityScore: 72 - i * 12 }));

  const meta = [
    { icon: Newspaper, label: 'Language',          value: title.language },
    { icon: Calendar,  label: 'Periodicity',        value: title.periodicity },
    { icon: Calendar,  label: 'Registration Date',  value: formatDate(title.registrationDate) },
    { icon: Building,  label: 'Publisher',          value: title.publisher },
    { icon: User,      label: 'Owner',              value: title.owner },
    { icon: MapPin,    label: 'State',              value: title.state },
    { icon: MapPin,    label: 'District',           value: title.district },
  ];

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/database')}
        className="flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#1F2933] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Database
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Left — Title details */}
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#1F2933]">{title.title}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="font-mono text-xs bg-[#F7F8F6] text-[#667085] border border-[#D9DEE3] px-2 py-0.5 rounded">
                  {title.registrationNumber}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${STATUS_CLASSES[title.status]}`}>
                  {title.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mt-6">
            {meta.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-[#9AA3AE] uppercase tracking-wide flex items-center gap-1 mb-1">
                  <Icon className="w-3 h-3" /> {label}
                </p>
                <p className="text-sm font-medium text-[#1F2933]">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Similarity search */}
        <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#1F5A8A]" />
              <h2 className="text-sm font-semibold text-[#1F2933]">Similarity Search</h2>
            </div>
            <button
              onClick={() => navigate('/verify', { state: { prefill: title.title } })}
              className="flex items-center gap-1.5 text-xs bg-[#12304A] text-white px-3 py-1.5 rounded hover:bg-[#1F5A8A] transition-colors"
            >
              <FileText className="w-3 h-3" /> Find Similar Titles
            </button>
          </div>

          <p className="text-xs text-[#667085] mb-4">
            Titles with highest similarity to "{title.title}"
          </p>

          <div className="space-y-2">
            {similarTitles.map(similar => (
              <div
                key={similar.id}
                className="flex items-center gap-3 p-3 rounded border border-[#D9DEE3] hover:border-[#B0BAC4] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1F2933]">{similar.title}</p>
                  <div className="flex gap-2 text-[10px] text-[#9AA3AE] mt-0.5">
                    <span className="font-mono">{similar.registrationNumber}</span>
                    <span>{similar.language}</span>
                    <span>{similar.state}</span>
                  </div>
                </div>
                <div className="w-28">
                  <SimilarityBar score={similar.similarityScore} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
