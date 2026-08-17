import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ label, value, icon: Icon, trend, trendUp }: Props) {
  return (
    <div className="bg-white rounded border border-[#D9DEE3] p-5 shadow-card hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-[#1F2933] mt-1 tabular-nums">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trendUp ? 'text-[#237A4B]' : 'text-[#667085]'}`}>
              {trend}
            </p>
          )}
        </div>
        {/* Icon uses navy — not random colors per card */}
        <div className="p-2 rounded bg-[#F7F8F6] text-[#12304A]">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
