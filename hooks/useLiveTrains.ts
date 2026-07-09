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
  /** Degrees clockwise from north — drives 3D mesh orientation. */
  heading: number;
}

// Run very slightly longer than the poll cadence. This avoids a visible pause
// when a response takes a little longer than expected.
const LERP_MS = 2_200;

/** Soft glide along a known segment so trains keep moving between polls. */
const SEGMENT_GLIDE_MS = 45_000;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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

function segmentTargets(train: TrainFeature): {
  lat: number;
  lon: number;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  heading: number;
} | null {
  const { segmentFromLat, segmentFromLon, segmentToLat, segmentToLon, segmentProgress, timeToNextStation } = train;
  if (
    segmentFromLat == null ||
    segmentFromLon == null ||
    segmentToLat == null ||
    segmentToLon == null
  ) {
    return null;
  }

  // Estimate progress from ETA when available so mid-route trains keep gliding.
  let progress = typeof segmentProgress === 'number' ? segmentProgress : 0.5;
  if (typeof timeToNextStation === 'number' && timeToNextStation > 0) {
    const etaProgress = 1 - Math.min(1, Math.max(0, timeToNextStation / (SEGMENT_GLIDE_MS / 1000)));
    // Prefer ETA when we only have a coarse midpoint (0.5).
    if (Math.abs(progress - 0.5) < 0.05) progress = etaProgress;
  }

  const lat = lerp(segmentFromLat, segmentToLat, progress);
  const lon = lerp(segmentFromLon, segmentToLon, progress);
  return {
    lat,
    lon,
    fromLat: segmentFromLat,
    fromLon: segmentFromLon,
    toLat: segmentToLat,
    toLon: segmentToLon,
    heading: resolveHeading(train, segmentFromLat, segmentFromLon, segmentToLat, segmentToLon),
  };
}

/**
 * Poll `/api/trains` every two seconds and expose smoothly interpolated positions.
 * Trains with a known station segment also glide forward between polls.
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
        const t = easeInOut((now - train.movedAt) / LERP_MS);
        let displayLat = lerp(train.fromLat, train.targetLat, t);
        let displayLon = lerp(train.fromLon, train.targetLon, t);

        // Keep mid-route trains drifting toward the next station between polls.
        const seg = segmentTargets(train);
        if (seg && typeof train.timeToNextStation === 'number' && train.timeToNextStation > 8) {
          const glide = Math.min(1, (now - train.movedAt) / SEGMENT_GLIDE_MS);
          const ahead = Math.min(1, (train.segmentProgress ?? 0.5) + glide * 0.15);
          const glideLat = lerp(seg.fromLat, seg.toLat, ahead);
          const glideLon = lerp(seg.fromLon, seg.toLon, ahead);
          // Blend poll-lerp with soft segment glide so motion never freezes.
          displayLat = lerp(displayLat, glideLat, 0.35);
          displayLon = lerp(displayLon, glideLon, 0.35);
        }

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
          const seg = segmentTargets(train);
          const targetLat = seg?.lat ?? train.lat;
          const targetLon = seg?.lon ?? train.lon;
          const heading =
            seg?.heading ??
            resolveHeading(
              train,
              existing?.displayLat ?? train.lat,
              existing?.displayLon ?? train.lon,
              targetLat,
              targetLon,
            );

          if (existing) {
            const moved =
              Math.abs(existing.targetLat - targetLat) > 1e-6 ||
              Math.abs(existing.targetLon - targetLon) > 1e-6;
            next.set(train.id, {
              ...train,
              fromLat: moved ? existing.displayLat : existing.fromLat,
              fromLon: moved ? existing.displayLon : existing.fromLon,
              targetLat,
              targetLon,
              displayLat: existing.displayLat,
              displayLon: existing.displayLon,
              movedAt: moved ? now : existing.movedAt,
              heading: moved ? heading : existing.heading || heading,
            });
          } else {
            next.set(train.id, {
              ...train,
              fromLat: targetLat,
              fromLon: targetLon,
              targetLat,
              targetLon,
              displayLat: targetLat,
              displayLon: targetLon,
              movedAt: now,
              heading,
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
