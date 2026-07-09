'use client';

import type { AnimatedTrain } from '@/hooks/useLiveTrains';

interface TrainTooltipProps {
  train: AnimatedTrain;
  x: number;
  y: number;
}

export function TrainTooltip({ train, x, y }: TrainTooltipProps) {
  const left = typeof window !== 'undefined' ? Math.min(Math.max(x, 96), window.innerWidth - 96) : x;
  const top = Math.max(y - 14, 72);
  const eta =
    typeof train.timeToNextStation === 'number'
      ? train.timeToNextStation < 60
        ? 'due'
        : `${Math.round(train.timeToNextStation / 60)} min`
      : null;

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[min(18rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 text-sm text-slate-100 shadow-xl backdrop-blur"
      style={{ left, top }}
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: train.color }} />
        <p className="font-semibold leading-tight">{train.lineName} line</p>
      </div>
      <p className="mt-1 text-xs text-slate-300">{train.currentLocation}</p>
      {train.towards && <p className="mt-0.5 text-xs text-slate-400">Towards {train.towards}</p>}
      {train.nextStationName && (
        <p className="mt-1 text-xs text-slate-400">
          Next: {train.nextStationName.replace(/ Underground Station$/, '')}
          {eta ? ` · ${eta}` : ''}
        </p>
      )}
    </div>
  );
}
