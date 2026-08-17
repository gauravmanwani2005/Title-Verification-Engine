import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, User, ChevronDown, Menu, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole, type Role } from '@/context/RoleContext';

const OFFICER_NAV = [
  { to: '/',          label: 'Dashboard',          end: true },
  { to: '/verify',    label: 'Verify Title'                  },
  { to: '/database',  label: 'Title Database'                },
  { to: '/history',   label: 'History'                       },
  { to: '/rules',     label: 'Rules & Guidelines'            },
  { to: '/analytics', label: 'Analytics'                     },
  { to: '/about',     label: 'System Information'            },
];

const APPLICANT_NAV = [
  { to: '/',              label: 'My Dashboard',    end: true },
  { to: '/verify',        label: 'Verify Title'              },
  { to: '/my-applications', label: 'My Applications'         },
];

const ROLE_LABELS: Record<Role, string> = {
  officer:   'Verification Officer',
  applicant: 'Applicant / Publisher',
};

export function AppHeader() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navItems = role === 'officer' ? OFFICER_NAV : APPLICANT_NAV;

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function switchRole(r: Role) {
    setRole(r);
    setProfileOpen(false);
    setMobileOpen(false);
    navigate('/'); // always go to the correct dashboard immediately
  }

  return (
    <header className="bg-white border-b border-[#D9DEE3] sticky top-0 z-30">

      {/* ── Top strip ─────────────────────────────────────────────────────── */}
      <div className="max-w-[1500px] mx-auto px-6">
        <div className="h-14 flex items-center justify-between gap-4">

          {/* Branding */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-[#12304A] flex-shrink-0">
              <span className="text-white text-[10px] font-bold tracking-tight leading-none">PRGI</span>
            </div>
            <div className="leading-tight hidden sm:block">
              <p className="text-sm font-bold text-[#12304A] tracking-tight">Title Verification System</p>
              <p className="text-[10px] text-[#9AA3AE] font-normal">Press Registrar General of India</p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">

            {/* Demo badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-[#FFF5E5] border border-[#F5D99A] rounded px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#9A6700]" />
              <span className="text-[10px] font-semibold text-[#9A6700] uppercase tracking-wide">Demo</span>
            </div>

            {/* System status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#D9DEE3]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#237A4B]" />
              <span className="text-[10px] font-medium text-[#667085]">Online</span>
            </div>

            {/* Notifications — only for officer */}
            {role === 'officer' && (
              <button
                className="relative p-1.5 rounded text-[#667085] hover:text-[#1F2933] hover:bg-[#F7F8F6] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#B42318] rounded-full" />
              </button>
            )}

            {/* Profile / role switcher */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-1.5 px-2 py-1 rounded border border-[#D9DEE3] text-[#667085] hover:text-[#1F2933] hover:bg-[#F7F8F6] transition-colors"
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center',
                  role === 'officer' ? 'bg-[#12304A]' : 'bg-[#1F5A8A]',
                )}>
                  <User className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs text-[#667085] hidden md:inline">
                  {role === 'officer' ? 'Officer' : 'Applicant'}
                </span>
                <ChevronDown className={cn('w-3 h-3 hidden md:inline transition-transform', profileOpen && 'rotate-180')} />
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-[#D9DEE3] rounded shadow-card-hover z-50">
                  {/* Current role */}
                  <div className="px-4 py-3 border-b border-[#D9DEE3]">
                    <p className="text-[10px] font-semibold text-[#9AA3AE] uppercase tracking-wide mb-1">
                      Current Role
                    </p>
                    <p className="text-sm font-semibold text-[#1F2933]">{ROLE_LABELS[role]}</p>
                  </div>

                  {/* Switch role */}
                  <div className="px-4 py-2 border-b border-[#D9DEE3]">
                    <p className="text-[10px] font-semibold text-[#9AA3AE] uppercase tracking-wide mb-2">
                      Switch Role
                    </p>
                    {(['officer', 'applicant'] as Role[]).map(r => (
                      <button
                        key={r}
                        onClick={() => switchRole(r)}
                        className={cn(
                          'w-full flex items-center justify-between px-2 py-1.5 rounded text-xs font-medium transition-colors mb-1',
                          role === r
                            ? 'bg-[#E8EEF4] text-[#12304A]'
                            : 'text-[#667085] hover:bg-[#F7F8F6] hover:text-[#1F2933]',
                        )}
                      >
                        <span>{ROLE_LABELS[r]}</span>
                        {role === r && <CheckCircle className="w-3.5 h-3.5 text-[#237A4B]" />}
                      </button>
                    ))}
                  </div>

                  {/* Profile actions */}
                  <div className="px-4 py-2">
                    <button className="w-full text-left text-xs text-[#667085] hover:text-[#1F2933] py-1.5 transition-colors">
                      Profile Settings
                    </button>
                    <button className="w-full text-left text-xs text-[#B42318] py-1.5 hover:text-[#8B1A10] transition-colors">
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden p-1.5 rounded text-[#667085] hover:text-[#1F2933] hover:bg-[#F7F8F6] transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Primary navigation (desktop) ──────────────────────────────────── */}
      <div className="hidden md:block border-t border-[#D9DEE3] bg-white">
        <div className="max-w-[1500px] mx-auto px-6">
          <nav aria-label="Primary navigation" className="flex items-center -mb-px">
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-[#1F5A8A] text-[#12304A]'
                    : 'border-transparent text-[#667085] hover:text-[#1F2933] hover:border-[#D9DEE3]',
                )}
              >
                {label}
              </NavLink>
            ))}

            {/* Role indicator pill — right side */}
            <div className="ml-auto flex items-center">
              <span className={cn(
                'text-[10px] font-semibold px-3 py-1 rounded border',
                role === 'officer'
                  ? 'bg-[#E8EEF4] text-[#12304A] border-[#C2D8EC]'
                  : 'bg-[#EAF5EE] text-[#237A4B] border-[#B7DECA]',
              )}>
                {ROLE_LABELS[role]}
              </span>
            </div>
          </nav>
        </div>
      </div>

      {/* ── Mobile navigation dropdown ─────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#D9DEE3] bg-white shadow-md">
          <nav className="max-w-[1500px] mx-auto px-4 py-2">
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center px-3 py-2.5 rounded text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#E8EEF4] text-[#12304A]'
                    : 'text-[#667085] hover:text-[#1F2933] hover:bg-[#F7F8F6]',
                )}
              >
                {label}
              </NavLink>
            ))}
            {/* Role switcher in mobile */}
            <div className="mt-2 pt-2 border-t border-[#D9DEE3] px-3 pb-2">
              <p className="text-[10px] text-[#9AA3AE] font-semibold uppercase tracking-wide mb-2">Switch Role</p>
              {(['officer', 'applicant'] as Role[]).map(r => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded text-xs font-medium transition-colors mb-1',
                    role === r ? 'bg-[#E8EEF4] text-[#12304A]' : 'text-[#667085] hover:bg-[#F7F8F6]',
                  )}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
