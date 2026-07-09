'use client';

interface HeaderProps {
  updatedAt: string | null;
  isFetching: boolean;
  onRefresh: () => void;
  onOpenSidebar?: () => void;
  showMenuButton?: boolean;
  trainCount?: number;
  trainsLive?: boolean;
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function Header({
  updatedAt,
  isFetching,
  onRefresh,
  onOpenSidebar,
  showMenuButton,
  trainCount = 0,
  trainsLive = false,
}: HeaderProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:flex sm:justify-center sm:p-4">
      <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/85 px-3 py-2.5 shadow-2xl backdrop-blur-md sm:w-auto sm:gap-4 sm:px-5 sm:py-3">
        {showMenuButton && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 md:hidden"
            aria-label="Open line status"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
          <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 sm:flex">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l3 2" />
            </svg>
          </span>
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-wide text-slate-100">
              <span className="sm:hidden">Tube — Live 3D</span>
              <span className="hidden sm:inline">London Underground — Live 3D</span>
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">Unofficial visualization of live TfL line status</p>
            <p className="truncate text-[11px] text-slate-400 sm:hidden">Updated {formatUpdatedAt(updatedAt)}</p>
          </div>
        </div>

        <div
          className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 sm:flex"
          title="Live train positions polled every 500ms"
        >
          <span className={`h-1.5 w-1.5 rounded-full ${trainsLive ? 'animate-pulse bg-emerald-400' : 'bg-slate-500'}`} />
          {trainsLive ? `${trainCount} trains live` : 'Trains…'}
        </div>

        <div className="hidden h-8 w-px bg-white/10 md:block" />

        <div className="hidden flex-col text-right md:flex">
          <span className="text-xs text-slate-400">Last updated</span>
          <span className="text-xs font-medium text-slate-200">{formatUpdatedAt(updatedAt)}</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50 sm:px-3"
          disabled={isFetching}
          aria-label={isFetching ? 'Refreshing' : 'Refresh'}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4v5h5M20 20v-5h-5M4.5 9A8 8 0 0 1 19 8M19.5 15A8 8 0 0 1 5 16" />
          </svg>
          <span className="hidden sm:inline">{isFetching ? 'Refreshing' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
}
