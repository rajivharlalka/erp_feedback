'use client';

import { MapboxOverlay } from '@deck.gl/mapbox';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { boundsOfLine } from '@/map/geo';
import { buildLayers } from '@/map/buildLayers';
import type { LineFeature, ModeMeta, StationFeature } from '@/lib/types';
import { StationTooltip } from './StationTooltip';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const LONDON_CENTER: [number, number] = [-0.1276, 51.5072];

interface HoveredStation {
  station: StationFeature;
  x: number;
  y: number;
}

interface MapViewProps {
  lines: LineFeature[];
  stations: StationFeature[];
  modeMeta: Record<string, ModeMeta>;
  visibleModes: Set<string>;
  focusLine: LineFeature | null;
  onSelectLine: (line: LineFeature) => void;
}

export function MapView({ lines, stations, modeMeta, visibleModes, focusLine, onSelectLine }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HoveredStation | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let map: maplibregl.Map | null = null;
    let readyFallback = 0;
    let resizeObserver: ResizeObserver | null = null;

    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: LONDON_CENTER,
        zoom: 10,
        pitch: 0,
        bearing: 0,
        canvasContextAttributes: { antialias: true },
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.error('[MapView] failed to construct map', err);
      setMapError(err instanceof Error ? err.message : 'Failed to initialize the 3D map.');
      return;
    }

    mapRef.current = map;

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    overlayRef.current = overlay;
    map.addControl(overlay as unknown as maplibregl.IControl);
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    const markReady = () => {
      if (cancelled) return;
      setMapReady(true);
      window.clearTimeout(readyFallback);
      // Force a resize now that the container has a real layout size — MapLibre
      // measures the container at construction time, which can be 0x0 if React
      // hasn't finished painting yet.
      map?.resize();
      map?.easeTo({
        center: LONDON_CENTER,
        zoom: 11.6,
        pitch: 55,
        bearing: -17,
        duration: 3200,
      });
    };

    map.once('style.load', markReady);
    map.on('error', (e) => {
      console.error('[MapView] map error', e?.error ?? e);
    });

    readyFallback = window.setTimeout(markReady, 8_000);

    resizeObserver = new ResizeObserver(() => {
      map?.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelled = true;
      window.clearTimeout(readyFallback);
      resizeObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!overlayRef.current || !mapReady) return;
    overlayRef.current.setProps({
      layers: buildLayers({
        lines,
        stations,
        modeMeta,
        visibleModes,
        hoveredStationId: hovered?.station.id ?? null,
        onHoverStation: (station, x, y) => setHovered(station ? { station, x, y } : null),
        onClickLine: onSelectLine,
      }),
    });
  }, [lines, stations, modeMeta, visibleModes, hovered, onSelectLine, mapReady]);

  useEffect(() => {
    if (!focusLine || !mapRef.current || !mapReady) return;
    const bounds = boundsOfLine(focusLine);
    if (!bounds) return;
    mapRef.current.fitBounds(bounds, {
      padding: { top: 96, bottom: 96, left: 420, right: 96 },
      duration: 1400,
      pitch: 55,
      bearing: -17,
      maxZoom: 14,
    });
  }, [focusLine, mapReady]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {!mapReady && !mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950">
          <div className="flex flex-col items-center gap-3 text-slate-300">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="text-sm tracking-wide text-slate-400">Loading the city in 3D&hellip;</p>
          </div>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 p-6">
          <div className="max-w-md rounded-2xl border border-red-400/30 bg-red-950/80 px-5 py-4 text-center text-sm text-red-100">
            <p className="font-semibold">Couldn&apos;t start the 3D map</p>
            <p className="mt-2 text-red-200/80">{mapError}</p>
            <p className="mt-3 text-xs text-red-200/60">
              This usually means WebGL is unavailable in the current browser. Try a recent Chrome, Firefox, or Edge
              with hardware acceleration enabled.
            </p>
          </div>
        </div>
      )}
      {hovered && <StationTooltip station={hovered.station} x={hovered.x} y={hovered.y} />}
    </div>
  );
}
