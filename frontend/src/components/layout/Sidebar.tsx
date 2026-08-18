import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PenSquare, Database, History,
  BookOpen, BarChart3, Info, Shield, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/',         label: 'Dashboard',             icon: LayoutDashboard, end: true },
  { to: '/verify',   label: 'Verify Title',           icon: PenSquare },
  { to: '/database', label: 'Title Database',         icon: Database },
  { to: '/history',  label: 'Verification History',   icon: History },
  { to: '/rules',    label: 'Rules & Guidelines',     icon: BookOpen },
  { to: '/analytics',label: 'Analytics',              icon: BarChart3 },
  { to: '/about',    label: 'System Information',     icon: Info },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-full w-60 z-30 flex flex-col',
        'bg-[#12304A]',
        'transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center flex-shrink-0">
                <Shield className="w-[17px] h-[17px] text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight tracking-wide">PRGI</p>
                <p className="text-white/50 text-[10px] leading-tight font-normal mt-0.5">
                  अक्षरAI
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/80 lg:hidden transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto" aria-label="Main navigation">
          <p className="px-5 text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-1">
            Menu
          </p>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => onClose()}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-white/10 text-white font-medium border-r-2 border-white/70'
                  : 'text-white/55 hover:text-white/90 hover:bg-white/5 font-normal',
              )}
            >
              <Icon className="w-[15px] h-[15px] flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#237A4B]" />
            <span className="text-[10px] text-white/45 font-medium">System Online</span>
          </div>
          <p className="text-[10px] text-white/25">v1.0.0 · SIH 2026 · PSS06</p>
        </div>
      </aside>
    </>
  );
}
