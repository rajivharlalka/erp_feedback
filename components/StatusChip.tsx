import clsx from 'clsx';
import { SEVERITY_COLOR_HEX, SEVERITY_LABEL } from '@/lib/severity';
import type { SeverityTier } from '@/lib/types';

interface StatusChipProps {
  tier: SeverityTier;
  label?: string;
  className?: string;
}

export function StatusChip({ tier, label, className }: StatusChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex max-w-[9.5rem] shrink-0 items-center gap-1.5 truncate rounded-full border px-2 py-0.5 text-[11px] font-medium sm:max-w-none sm:text-xs',
        className,
      )}
      style={{
        color: SEVERITY_COLOR_HEX[tier],
        borderColor: `${SEVERITY_COLOR_HEX[tier]}55`,
        backgroundColor: `${SEVERITY_COLOR_HEX[tier]}1A`,
      }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: SEVERITY_COLOR_HEX[tier] }} />
      <span className="truncate">{label ?? SEVERITY_LABEL[tier]}</span>
    </span>
  );
}
