'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchTrains } from '@/lib/api';
import type { TrainFeature } from '@/lib/types';

/** Fetch live positions every two seconds; animation fills the interval. */
export const TRAIN_POLL_MS = 2_000;

export interface AnimatedTrain extends TrainFeature {
  displayLat: number;
  displayLon: number;
  targetLat: number;
  targetLon: number;
  fromLat: number;
  fromLon: number;
  movedAt: number;
  lastSeenAt: number;
  /** Degrees clockwise from north — drives 3D mesh orientation. */
  heading: number;
}

// Run very slightly longer than the poll cadence. This avoids a visible pause
// when a response takes a little longer than expected.
const LERP_MS = 2_200;

/** Retain a transiently missing vehicle rather than flashing it on/off. */
const STALE_TRAIN_GRACE_MS = 10_000;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function headingBetween(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;
  if (Math.abs(dLat) < 1e-10 && Math.abs(dLon) < 1e-10) return 0;
  return ((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360;
}

function resolveHeading(train: TrainFeature, fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  if (typeof train.heading === 'number' && Number.isFinite(train.heading)) return train.heading;
  return headingBetween(fromLat, fromLon, toLat, toLon);
}

function samplePosition(train: AnimatedTrain, now: number): Pick<AnimatedTrain, 'displayLat' | 'displayLon'> {
  const t = Math.min(1, Math.max(0, (now - train.movedAt) / LERP_MS));
  return {
    displayLat: lerp(train.fromLat, train.targetLat, t),
    displayLon: lerp(train.fromLon, train.targetLon, t),
  };
}

/**
 * Poll `/api/trains` every two seconds and expose smoothly interpolated positions.
 * Only confirmed TfL locations are interpolated; no estimated route progress
 * is used, because the Unified API does not supply Underground train GPS.
 */
export function useLiveTrains(modes: string[], enabled = true) {
  const [trains, setTrains] = useState<AnimatedTrain[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const mapRef = useRef<Map<string, AnimatedTrain>>(new Map());
  const rafRef = useRef(0);
  const pollRef = useRef(0);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    let lastPaint = 0;
    const paint = () => {
      const now = performance.now();
      rafRef.current = requestAnimationFrame(paint);
      // 15 fps is smooth at map scale while avoiding needless WebGL churn.
      if (now - lastPaint < 66) return;
      lastPaint = now;

      const next: AnimatedTrain[] = [];
      for (const train of mapRef.current.values()) {
        const { displayLat, displayLon } = samplePosition(train, now);

        next.push({
          ...train,
          displayLat,
          displayLon,
          heading: train.heading,
        });
      }
      setTrains(next);
    };

    async function poll() {
      // Avoid out-of-order responses replacing newer positions.
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;
      try {
        const payload = await fetchTrains(modes);
        if (cancelled) return;

        const now = performance.now();
        const prev = mapRef.current;
        const next = new Map<string, AnimatedTrain>();

        for (const train of payload.trains) {
          const existing = prev.get(train.id);
          const targetLat = train.lat;
          const targetLon = train.lon;

          if (existing) {
            // Sample the active interpolation at the precise fetch time. Using
            // the last React paint here caused trains to snap backwards.
            const current = samplePosition(existing, now);
            const moved =
              Math.abs(existing.targetLat - targetLat) > 1e-6 ||
              Math.abs(existing.targetLon - targetLon) > 1e-6;
            const reportedHeading =
              typeof train.heading === 'number' && Number.isFinite(train.heading) ? train.heading : undefined;
            const heading =
              reportedHeading ??
              (moved
                ? resolveHeading(train, current.displayLat, current.displayLon, targetLat, targetLon)
                : existing.heading);

            next.set(train.id, {
              ...train,
              fromLat: moved ? current.displayLat : existing.fromLat,
              fromLon: moved ? current.displayLon : existing.fromLon,
              targetLat: moved ? targetLat : existing.targetLat,
              targetLon: moved ? targetLon : existing.targetLon,
              displayLat: current.displayLat,
              displayLon: current.displayLon,
              movedAt: moved ? now : existing.movedAt,
              lastSeenAt: now,
              heading,
            });
          } else {
            const heading =
              typeof train.heading === 'number' && Number.isFinite(train.heading)
                ? train.heading
                : resolveHeading(train, train.lat, train.lon, targetLat, targetLon);
            next.set(train.id, {
              ...train,
              fromLat: targetLat,
              fromLon: targetLon,
              targetLat,
              targetLon,
              displayLat: targetLat,
              displayLon: targetLon,
              movedAt: now,
              lastSeenAt: now,
              heading,
            });
          }
        }

        // A single volatile TfL response should not make a carriage flash out
        // and then reappear as a new object on the next poll.
        for (const [id, train] of prev) {
          if (!next.has(id) && now - train.lastSeenAt < STALE_TRAIN_GRACE_MS) {
            const current = samplePosition(train, now);
            next.set(id, {
              ...train,
              fromLat: current.displayLat,
              fromLon: current.displayLon,
              targetLat: current.displayLat,
              targetLon: current.displayLon,
              displayLat: current.displayLat,
              displayLon: current.displayLon,
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
      } finally {
        requestInFlightRef.current = false;
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
