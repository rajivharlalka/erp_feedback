'use client';

import { SEVERITY_COLOR_HEX, SEVERITY_LABEL } from '@/lib/severity';
import type { StationFeature } from '@/lib/types';

interface StationTooltipProps {
  station: StationFeature;
  x: number;
  y: number;
}

export function StationTooltip({ station, x, y }: StationTooltipProps) {
  // Keep the tooltip on-screen on narrow viewports.
  const left = typeof window !== 'undefined' ? Math.min(Math.max(x, 88), window.innerWidth - 88) : x;
  const top = Math.max(y - 14, 72);

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[min(16rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-xl backdrop-blur"
      style={{ left, top }}
    >
      <p className="font-semibold leading-tight">{station.name}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: SEVERITY_COLOR_HEX[station.worstSeverityTier] }}
        />
        <span className="text-xs text-slate-300">{SEVERITY_LABEL[station.worstSeverityTier]}</span>
      </div>
      <p className="mt-1 text-xs text-slate-400">{station.lineIds.length} line(s) serve this station</p>
    </div>
  );
}
