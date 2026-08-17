import { cn, getSimilarityBarColor, getSimilarityTextColor } from '@/lib/utils';

interface Props {
  score: number;
  showLabel?: boolean;
  className?: string;
}

export function SimilarityBar({ score, showLabel = true, className }: Props) {
  const clamped = Math.min(100, Math.max(0, score));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-[#D9DEE3] rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getSimilarityBarColor(clamped))}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn(
          'text-xs font-semibold w-8 text-right tabular-nums',
          getSimilarityTextColor(clamped),
        )}>
          {clamped}%
        </span>
      )}
    </div>
  );
}
