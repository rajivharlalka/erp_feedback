'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Legend } from '@/components/Legend';
import { useNetworkData, AVAILABLE_MODES } from '@/hooks/useNetworkData';
import type { LineFeature } from '@/lib/types';

// MapLibre / deck.gl need a real browser WebGL context — never SSR them.
const MapView = dynamic(() => import('@/components/MapView').then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-3 text-slate-300">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        <p className="text-sm tracking-wide text-slate-400">Loading the city in 3D&hellip;</p>
      </div>
    </div>
  ),
});

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

export function TransportMapApp() {
  const modes = useMemo<string[]>(() => [...AVAILABLE_MODES], []);
  const { data, isLoading, isFetching, isError, error, refetch } = useNetworkData(modes);
  const [visibleModes, setVisibleModes] = useState<Set<string>>(new Set(modes));
  const [selectedLine, setSelectedLine] = useState<LineFeature | null>(null);
  const isDesktop = useIsDesktop();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep the desktop sidebar "open" for accessibility / aria; mobile starts closed.
  useEffect(() => {
    if (isDesktop) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, [isDesktop]);

  function toggleMode(mode: string) {
    setVisibleModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  }

  const lines = data?.lines ?? [];
  const stations = data?.stations ?? [];
  const modeMeta = data?.modeMeta ?? {};

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100">
      <MapView
        lines={lines}
        stations={stations}
        modeMeta={modeMeta}
        visibleModes={visibleModes}
        focusLine={selectedLine}
        onSelectLine={setSelectedLine}
        isDesktop={isDesktop}
      />

      <Header
        updatedAt={data?.updatedAt ?? null}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        showMenuButton={!isLoading && !!data}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {!isLoading && data && (
        <Sidebar
          modeMeta={modeMeta}
          visibleModes={visibleModes}
          onToggleMode={toggleMode}
          lines={lines}
          selectedLineId={selectedLine?.id ?? null}
          onSelectLine={setSelectedLine}
          open={sidebarOpen}
          onClose={() => {
            if (!isDesktop) setSidebarOpen(false);
          }}
        />
      )}

      {/* Hide legend while the mobile sheet is open so panels don't stack. */}
      {!isLoading && data && (isDesktop || !sidebarOpen) && <Legend />}

      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="text-sm">Fetching live line status from TfL&hellip;</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="pointer-events-auto absolute bottom-24 left-3 right-3 z-30 rounded-xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-sm text-red-200 shadow-2xl sm:bottom-4 sm:left-1/2 sm:right-auto sm:max-w-md sm:-translate-x-1/2">
          {error instanceof Error ? error.message : 'Failed to load live TfL data.'}{' '}
          <button type="button" onClick={() => refetch()} className="ml-2 underline underline-offset-2">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
