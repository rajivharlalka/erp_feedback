'use client';

import clsx from 'clsx';
import { StatusChip } from './StatusChip';
import type { LineFeature, ModeMeta } from '@/lib/types';

interface SidebarProps {
  modeMeta: Record<string, ModeMeta>;
  visibleModes: Set<string>;
  onToggleMode: (mode: string) => void;
  lines: LineFeature[];
  selectedLineId: string | null;
  onSelectLine: (line: LineFeature) => void;
  open: boolean;
  onClose: () => void;
}

const UPCOMING_MODES: { id: string; displayName: string }[] = [
  { id: 'dlr', displayName: 'DLR' },
  { id: 'overground', displayName: 'London Overground' },
  { id: 'elizabeth-line', displayName: 'Elizabeth line' },
  { id: 'tram', displayName: 'Tram' },
  { id: 'river-bus', displayName: 'River Bus' },
  { id: 'cable-car', displayName: 'Cable Car' },
];

export function Sidebar({
  modeMeta,
  visibleModes,
  onToggleMode,
  lines,
  selectedLineId,
  onSelectLine,
  open,
  onClose,
}: SidebarProps) {
  const byMode = new Map<string, LineFeature[]>();
  for (const line of lines) {
    const bucket = byMode.get(line.mode) ?? [];
    bucket.push(line);
    byMode.set(line.mode, bucket);
  }

  function handleSelectLine(line: LineFeature) {
    onSelectLine(line);
    onClose();
  }

  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close line status"
        onClick={onClose}
        className={clsx(
          'pointer-events-auto absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-[2px] transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={clsx(
          'pointer-events-auto absolute z-40 flex flex-col overflow-hidden border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out',
          // Mobile: bottom sheet
          'inset-x-0 bottom-0 max-h-[78dvh] rounded-t-3xl',
          open ? 'translate-y-0' : 'translate-y-full',
          // Desktop: left panel, always visible
          'md:inset-y-4 md:left-4 md:right-auto md:bottom-auto md:top-24 md:max-h-none md:w-80 md:translate-y-0 md:rounded-2xl',
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:hidden">
          <div className="mx-auto h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden />
          <h2 className="sr-only">Line status</h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

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
            <details className="group mt-1">
              <summary className="cursor-pointer list-none rounded-lg px-1.5 py-1 text-xs text-slate-500 hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1">
                  Coming soon
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 transition group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <div className="mt-1 flex flex-col gap-1.5">
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
            </details>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                        onClick={() => handleSelectLine(line)}
                        className={clsx(
                          'flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2.5 text-left text-sm transition md:py-2',
                          selectedLineId === line.id
                            ? 'border-sky-400/50 bg-sky-400/10'
                            : 'border-transparent hover:border-white/10 hover:bg-white/5',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: line.color }}
                          />
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
    </>
  );
}
