interface HeaderProps {
  updatedAt: string | null;
  isFetching: boolean;
  onRefresh: () => void;
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function Header({ updatedAt, isFetching, onRefresh }: HeaderProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-4">
      <div className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l3 2" />
            </svg>
          </span>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-wide text-slate-100">London Underground — Live 3D</h1>
            <p className="text-xs text-slate-400">Unofficial visualization of live TfL line status</p>
          </div>
        </div>

        <div className="hidden h-8 w-px bg-white/10 sm:block" />

        <div className="hidden flex-col text-right sm:flex">
          <span className="text-xs text-slate-400">Last updated</span>
          <span className="text-xs font-medium text-slate-200">{formatUpdatedAt(updatedAt)}</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          disabled={isFetching}
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
          {isFetching ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
    </header>
  );
}
