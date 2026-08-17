import { useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const LABELS: Record<string, string> = {
  '':          'Dashboard',
  verify:      'Verify Title',
  result:      'Verification Result',
  database:    'Title Database',
  history:     'Verification History',
  rules:       'Rules & Guidelines',
  analytics:   'Analytics',
  about:       'System Information',
};

// Pages where we skip the breadcrumb (not useful on top-level pages)
const SKIP_ON: string[] = ['', 'verify', 'analytics'];

export function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const topLevel = segments[0] ?? '';

  if (SKIP_ON.includes(topLevel)) return null;

  const crumbs = [
    { label: 'Home', path: '/' },
    ...segments.map((seg, i) => ({
      label: LABELS[seg] ?? seg,
      path: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-[#9AA3AE] mb-4">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1">
          {i === 0 && <Home className="w-3 h-3" />}
          {i < crumbs.length - 1 ? (
            <>
              <span className="hover:text-[#1F5A8A] cursor-pointer transition-colors">
                {crumb.label}
              </span>
              <ChevronRight className="w-3 h-3 text-[#D9DEE3]" />
            </>
          ) : (
            <span className="text-[#667085] font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
