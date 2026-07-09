import clsx from 'clsx';
import { StatusChip } from './StatusChip';
import type { LineFeature, ModeMeta } from '../lib/types';

interface SidebarProps {
  modeMeta: Record<string, ModeMeta>;
  visibleModes: Set<string>;
  onToggleMode: (mode: string) => void;
  lines: LineFeature[];
  selectedLineId: string | null;
  onSelectLine: (line: LineFeature) => void;
}

const UPCOMING_MODES: { id: string; displayName: string }[] = [
  { id: 'dlr', displayName: 'DLR' },
  { id: 'overground', displayName: 'London Overground' },
  { id: 'elizabeth-line', displayName: 'Elizabeth line' },
  { id: 'tram', displayName: 'Tram' },
  { id: 'river-bus', displayName: 'River Bus' },
  { id: 'cable-car', displayName: 'Cable Car' },
];

export function Sidebar({ modeMeta, visibleModes, onToggleMode, lines, selectedLineId, onSelectLine }: SidebarProps) {
  const byMode = new Map<string, LineFeature[]>();
  for (const line of lines) {
    const bucket = byMode.get(line.mode) ?? [];
    bucket.push(line);
    byMode.set(line.mode, bucket);
  }

  return (
    <aside className="pointer-events-auto absolute left-4 top-24 bottom-4 z-10 flex w-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-md">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Modes</h2>
        <div className="mt-2 flex flex-col gap-1.5">
          {Object.entries(modeMeta).map(([mode, meta]) => (
            <label
              key={mode}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-slate-200 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={visibleModes.has(mode)}
                onChange={() => onToggleMode(mode)}
                className="h-3.5 w-3.5 accent-sky-500"
              />
              {meta.displayName}
            </label>
          ))}
          {UPCOMING_MODES.map((mode) => (
            <div
              key={mode.id}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm text-slate-500"
              title="Coming soon"
            >
              <input type="checkbox" checked={false} disabled className="h-3.5 w-3.5" />
              {mode.displayName}
              <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                soon
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {[...byMode.entries()].map(([mode, modeLines]) => (
          <div key={mode} className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {modeMeta[mode]?.displayName ?? mode}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {modeLines
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((line) => (
                  <li key={line.id}>
                    <button
                      type="button"
                      onClick={() => onSelectLine(line)}
                      className={clsx(
                        'flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition',
                        selectedLineId === line.id
                          ? 'border-sky-400/50 bg-sky-400/10'
                          : 'border-transparent hover:border-white/10 hover:bg-white/5',
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: line.color }} />
                        <span className="truncate text-slate-100">{line.name}</span>
                      </span>
                      <StatusChip tier={line.severityTier} label={line.statusSeverityDescription} />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
