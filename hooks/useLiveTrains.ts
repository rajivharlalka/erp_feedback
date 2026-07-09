'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchTrains } from '@/lib/api';
import type { TrainFeature } from '@/lib/types';

export const TRAIN_POLL_MS = 500;

export interface AnimatedTrain extends TrainFeature {
  displayLat: number;
  displayLon: number;
  targetLat: number;
  targetLon: number;
  fromLat: number;
  fromLon: number;
  movedAt: number;
}

const LERP_MS = 1000;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Poll `/api/trains` every 500ms and expose smoothly interpolated positions.
 */
export function useLiveTrains(modes: string[], enabled = true) {
  const [trains, setTrains] = useState<AnimatedTrain[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const mapRef = useRef<Map<string, AnimatedTrain>>(new Map());
  const rafRef = useRef(0);
  const pollRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    let lastPaint = 0;
    const paint = () => {
      const now = performance.now();
      rafRef.current = requestAnimationFrame(paint);
      // ~12 fps is enough for smooth glides without thrashing React/deck.gl.
      if (now - lastPaint < 80) return;
      lastPaint = now;

      const next: AnimatedTrain[] = [];
      for (const train of mapRef.current.values()) {
        const t = easeInOut((now - train.movedAt) / LERP_MS);
        next.push({
          ...train,
          displayLat: lerp(train.fromLat, train.targetLat, t),
          displayLon: lerp(train.fromLon, train.targetLon, t),
        });
      }
      setTrains(next);
    };

    async function poll() {
      try {
        const payload = await fetchTrains(modes);
        if (cancelled) return;

        const now = performance.now();
        const prev = mapRef.current;
        const next = new Map<string, AnimatedTrain>();

        for (const train of payload.trains) {
          const existing = prev.get(train.id);
          if (existing) {
            const moved =
              Math.abs(existing.targetLat - train.lat) > 1e-6 ||
              Math.abs(existing.targetLon - train.lon) > 1e-6;
            next.set(train.id, {
              ...train,
              fromLat: moved ? existing.displayLat : existing.fromLat,
              fromLon: moved ? existing.displayLon : existing.fromLon,
              targetLat: train.lat,
              targetLon: train.lon,
              displayLat: existing.displayLat,
              displayLon: existing.displayLon,
              movedAt: moved ? now : existing.movedAt,
            });
          } else {
            next.set(train.id, {
              ...train,
              fromLat: train.lat,
              fromLon: train.lon,
              targetLat: train.lat,
              targetLon: train.lon,
              displayLat: train.lat,
              displayLon: train.lon,
              movedAt: now,
            });
          }
        }

        mapRef.current = next;
        setTrains(
          [...next.values()].map((train) => ({
            ...train,
            displayLat: train.displayLat,
            displayLon: train.displayLon,
          })),
        );
        setUpdatedAt(payload.updatedAt);
        setError(null);
        setIsLive(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch live trains');
          setIsLive(false);
        }
      }
    }

    void poll();
    pollRef.current = window.setInterval(() => void poll(), TRAIN_POLL_MS);
    rafRef.current = requestAnimationFrame(paint);

    return () => {
      cancelled = true;
      window.clearInterval(pollRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [modes, enabled]);

  return { trains, count: trains.length, updatedAt, error, isLive };
}
