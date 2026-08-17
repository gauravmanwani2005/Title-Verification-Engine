import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Database, Eye } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { getTitleDatabase } from '@/services/verificationService';
import { TOTAL_REGISTERED_TITLES } from '@/data/mockTitles';
import type { RegisteredTitle } from '@/types';

const LANGUAGES  = ['All','Hindi','English','Marathi','Gujarati','Bengali','Tamil','Telugu'];
const STATUS_CLASSES: Record<RegisteredTitle['status'], string> = {
  ACTIVE:    'bg-[#EAF5EE] text-[#237A4B] border-[#B7DECA]',
  CANCELLED: 'bg-[#FCEEEE] text-[#B42318] border-[#F5C2BE]',
  SUSPENDED: 'bg-[#FFF5E5] text-[#9A6700] border-[#F5D99A]',
};
const PAGE_SIZE = 10;

export function TitleDatabase() {
  const navigate = useNavigate();
  const [query,    setQuery]   = useState('');
  const [language, setLang]    = useState('All');
  const [page,     setPage]    = useState(0);
  const [titles,   setTitles]  = useState<RegisteredTitle[]>([]);
  const [total,    setTotal]   = useState(0);
  const [loading,  setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getTitleDatabase({ query, language, page, size: PAGE_SIZE });
      setTitles(res.titles);
      setTotal(res.total);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [query, language, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const selectClass = cn(
    'border border-[#D9DEE3] rounded px-3 py-2 text-sm bg-[#F7F8F6] text-[#1F2933]',
    'focus:outline-none focus:ring-2 focus:ring-[#1F5A8A] transition-colors',
  );

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1F2933]">Registered Title Database</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-[#667085]">{TOTAL_REGISTERED_TITLES} registered PRGI titles</p>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#E8EEF4] border border-[#C2D8EC] text-[#12304A] rounded font-medium">
              <Database className="w-2.5 h-2.5" /> Indexed for similarity search
            </span>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded border border-[#D9DEE3] shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA3AE]" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(0); }}
              placeholder="Search title, registration number, publisher..."
              className={cn(
                'w-full pl-9 pr-4 py-2 border border-[#D9DEE3] rounded text-sm bg-[#F7F8F6] text-[#1F2933]',
                'placeholder:text-[#9AA3AE]',
                'focus:outline-none focus:ring-2 focus:ring-[#1F5A8A] focus:bg-white transition-colors',
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#9AA3AE] flex-shrink-0" />
            <select value={language} onChange={e => { setLang(e.target.value); setPage(0); }}
              className={selectClass}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded border border-[#D9DEE3] shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F8F6] border-b border-[#D9DEE3] text-left">
                {['SN','Title','Reg. Number','Language','Periodicity','Publisher','State','Reg. Date','Status','Action'].map((h, i) => (
                  <th key={h} className={cn(
                    'px-4 py-3 text-[11px] font-semibold text-[#667085] uppercase tracking-wide',
                    i >= 4 && i <= 6 && 'hidden lg:table-cell',
                    i === 7 && 'hidden xl:table-cell',
                    i === 2 && 'hidden md:table-cell',
                    i === 3 && 'hidden sm:table-cell',
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={cn('divide-y divide-[#F7F8F6]', loading && 'opacity-50')}>
              {titles.length === 0 && !loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-[#9AA3AE]">
                    No titles found matching your search.
                  </td>
                </tr>
              ) : titles.map((t, i) => (
                <tr key={t.id} className="hover:bg-[#F7F8F6] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#9AA3AE] tabular-nums">
                    {page * PAGE_SIZE + i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1F2933] text-xs">{t.title}</p>
                    <p className="text-[10px] text-[#9AA3AE] md:hidden">{t.registrationNumber}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-[11px] text-[#667085] bg-[#F7F8F6] border border-[#D9DEE3] px-2 py-0.5 rounded">
                      {t.registrationNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-[#667085]">{t.language}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-[#667085]">{t.periodicity}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-[#667085] max-w-[140px] truncate">{t.publisher}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-[#667085]">{t.state}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-[#667085]">{formatDate(t.registrationDate)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded border', STATUS_CLASSES[t.status])}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/database/${t.id}`, { state: t })}
                      className="flex items-center gap-1 text-[11px] text-[#1F5A8A] hover:text-[#12304A] font-medium transition-colors"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-[#D9DEE3] flex items-center justify-between">
          <p className="text-xs text-[#667085]">
            Showing {Math.min(page * PAGE_SIZE + 1, total)}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} results
            {query && ` for "${query}"`}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
              className="p-1.5 rounded border border-[#D9DEE3] text-[#667085] hover:bg-[#F7F8F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#667085] px-2">Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded border border-[#D9DEE3] text-[#667085] hover:bg-[#F7F8F6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
