import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 bg-[#F7F8F6] rounded-full mb-4">
        <Icon className="w-8 h-8 text-[#B0BAC4]" />
      </div>
      <p className="text-sm font-medium text-[#667085]">{title}</p>
      {description && (
        <p className="text-xs text-[#9AA3AE] mt-1 max-w-xs leading-relaxed">{description}</p>
      )}
    </div>
  );
}
