'use client';

import { SEVERITY_LABEL, SEVERITY_ORDER, SEVERITY_COLOR_HEX } from '@/lib/severity';

export function Legend() {
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-10 rounded-2xl border border-white/10 bg-slate-900/85 p-3 shadow-2xl backdrop-blur-md sm:left-auto sm:right-4 sm:bottom-4 sm:w-64 sm:p-4 md:bottom-4">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">Service status</h2>

      {/* Compact horizontal legend on mobile */}
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 sm:hidden">
        {SEVERITY_ORDER.map((tier) => (
          <li key={tier} className="flex items-center gap-1.5 text-[11px] text-slate-200">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_COLOR_HEX[tier] }} />
            {SEVERITY_LABEL[tier]}
          </li>
        ))}
      </ul>

      {/* Full vertical legend on larger screens */}
      <ul className="mt-2 hidden flex-col gap-1.5 sm:flex">
        {SEVERITY_ORDER.map((tier) => (
          <li key={tier} className="flex items-center gap-2 text-sm text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR_HEX[tier] }} />
            {SEVERITY_LABEL[tier]}
          </li>
        ))}
      </ul>
      <p className="mt-3 hidden border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500 sm:block">
        Stations and lines are lifted higher above the city the worse their current service is. Bright markers on the
        lines are live trains, polled every 500ms from TfL Trackernet.
      </p>
    </div>
  );
}
