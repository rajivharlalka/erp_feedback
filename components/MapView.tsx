'use client';

import { AmbientLight, DirectionalLight, LightingEffect } from '@deck.gl/core';
import { MapboxOverlay } from '@deck.gl/mapbox';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { boundsOfLine } from '@/map/geo';
import { buildLayers } from '@/map/buildLayers';
import { buildTrainLayers } from '@/map/buildTrainLayer';
import type { AnimatedTrain } from '@/hooks/useLiveTrains';
import type { LineFeature, ModeMeta, StationFeature } from '@/lib/types';
import { StationTooltip } from './StationTooltip';
import { TrainTooltip } from './TrainTooltip';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const LONDON_CENTER: [number, number] = [-0.1276, 51.5072];

const lightingEffect = new LightingEffect({
  ambient: new AmbientLight({ color: [255, 255, 255], intensity: 0.85 }),
  sun: new DirectionalLight({ color: [255, 248, 235], intensity: 1.1, direction: [-1, -2, -1.5] }),
  fill: new DirectionalLight({ color: [180, 200, 255], intensity: 0.35, direction: [1, 0.5, -0.5] }),
});

interface HoveredStation {
  station: StationFeature;
  x: number;
  y: number;
}

interface HoveredTrain {
  train: AnimatedTrain;
  x: number;
  y: number;
}

interface MapViewProps {
  lines: LineFeature[];
  stations: StationFeature[];
  trains: AnimatedTrain[];
  modeMeta: Record<string, ModeMeta>;
  visibleModes: Set<string>;
  focusLine: LineFeature | null;
  onSelectLine: (line: LineFeature) => void;
  isDesktop?: boolean;
}

export function MapView({
  lines,
  stations,
  trains,
  modeMeta,
  visibleModes,
  focusLine,
  onSelectLine,
  isDesktop = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hoveredStation, setHoveredStation] = useState<HoveredStation | null>(null);
  const [hoveredTrain, setHoveredTrain] = useState<HoveredTrain | null>(null);

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

    const overlay = new MapboxOverlay({
      interleaved: false,
      layers: [],
      effects: [lightingEffect],
    });
    overlayRef.current = overlay;
    map.addControl(overlay as unknown as maplibregl.IControl);
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    const markReady = () => {
      if (cancelled) return;
      setMapReady(true);
      window.clearTimeout(readyFallback);
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

    const baseLayers = buildLayers({
      lines,
      stations,
      modeMeta,
      visibleModes,
      hoveredStationId: hoveredStation?.station.id ?? null,
      onHoverStation: (station, x, y) => {
        setHoveredStation(station ? { station, x, y } : null);
        if (station) setHoveredTrain(null);
      },
      onClickLine: onSelectLine,
    });

    const trainLayers = buildTrainLayers({
      trains,
      visibleModes,
      hoveredTrainId: hoveredTrain?.train.id ?? null,
      onHoverTrain: (train, x, y) => {
        setHoveredTrain(train ? { train, x, y } : null);
        if (train) setHoveredStation(null);
      },
    });

    overlayRef.current.setProps({ layers: [...baseLayers, ...trainLayers] });
  }, [lines, stations, trains, modeMeta, visibleModes, hoveredStation, hoveredTrain, onSelectLine, mapReady]);

  useEffect(() => {
    if (!focusLine || !mapRef.current || !mapReady) return;
    const bounds = boundsOfLine(focusLine);
    if (!bounds) return;
    mapRef.current.fitBounds(bounds, {
      padding: isDesktop
        ? { top: 96, bottom: 96, left: 420, right: 96 }
        : { top: 88, bottom: 120, left: 32, right: 32 },
      duration: 1400,
      pitch: isDesktop ? 55 : 45,
      bearing: -17,
      maxZoom: 14,
    });
  }, [focusLine, mapReady, isDesktop]);

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
      {hoveredTrain && <TrainTooltip train={hoveredTrain.train} x={hoveredTrain.x} y={hoveredTrain.y} />}
      {!hoveredTrain && hoveredStation && (
        <StationTooltip station={hoveredStation.station} x={hoveredStation.x} y={hoveredStation.y} />
      )}
    </div>
  );
}
