import { SEVERITY_LABEL, SEVERITY_ORDER, SEVERITY_COLOR_HEX } from '../lib/severity';

export function Legend() {
  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-10 w-64 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-2xl backdrop-blur-md">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Service status</h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {SEVERITY_ORDER.map((tier) => (
          <li key={tier} className="flex items-center gap-2 text-sm text-slate-200">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR_HEX[tier] }} />
            {SEVERITY_LABEL[tier]}
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-slate-500">
        Stations and lines are lifted higher above the city the worse their current service is — a live 3D plot of
        disruption across the network.
      </p>
    </div>
  );
}
