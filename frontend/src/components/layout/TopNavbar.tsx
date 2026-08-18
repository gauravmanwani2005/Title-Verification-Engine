import { Menu, Search, Bell, User, ChevronDown } from 'lucide-react';

interface Props {
  onMenuClick: () => void;
}

export function TopNavbar({ onMenuClick }: Props) {
  return (
    <header className="h-14 bg-white border-b border-[#D9DEE3] flex items-center px-4 gap-4 sticky top-0 z-10">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded text-[#667085] hover:text-[#1F2933] hover:bg-[#F7F8F6] transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="hidden md:block leading-tight">
        <p className="text-sm font-semibold text-[#1F2933]">अक्षरAI</p>
        <p className="text-xs text-[#667085]">
          AI-assisted publication title verification and similarity analysis
        </p>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-[#F7F8F6] border border-[#D9DEE3] rounded px-3 py-1.5 w-56 cursor-pointer hover:border-[#B0BAC4] transition-colors">
        <Search className="w-3.5 h-3.5 text-[#9AA3AE]" />
        <span className="text-xs text-[#9AA3AE]">Quick search...</span>
        <kbd className="ml-auto text-[10px] bg-white border border-[#D9DEE3] px-1.5 py-0.5 rounded text-[#9AA3AE]">
          ⌘K
        </kbd>
      </div>

      {/* Demo mode badge */}
      <div className="hidden sm:flex items-center gap-1.5 bg-[#FFF5E5] border border-[#F5D99A] rounded px-2.5 py-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#9A6700]" />
        <span className="text-[10px] font-semibold text-[#9A6700] uppercase tracking-wide">Demo Mode</span>
      </div>

      {/* System status */}
      <div className="hidden sm:flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#237A4B]" />
        <span className="text-xs text-[#667085]">Online</span>
      </div>

      {/* Notifications */}
      <button
        className="relative p-1.5 rounded text-[#667085] hover:text-[#1F2933] hover:bg-[#F7F8F6] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#B42318] rounded-full" />
      </button>

      {/* User */}
      <button
        className="flex items-center gap-1.5 p-1 rounded text-[#667085] hover:text-[#1F2933] hover:bg-[#F7F8F6] transition-colors"
        aria-label="User menu"
      >
        <div className="w-6 h-6 bg-[#12304A] rounded-full flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
        <ChevronDown className="w-3 h-3" />
      </button>
    </header>
  );
}
