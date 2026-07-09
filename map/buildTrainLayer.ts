'use client';

import { ScatterplotLayer } from '@deck.gl/layers';
import { hexToRgb } from '@/lib/color';
import type { AnimatedTrain } from '@/hooks/useLiveTrains';

export interface TrainLayerOptions {
  trains: AnimatedTrain[];
  visibleModes: Set<string>;
  hoveredTrainId: string | null;
  onHoverTrain: (train: AnimatedTrain | null, x: number, y: number) => void;
}

function visibleTrainColor(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luminance < 0.18) return [226, 232, 240];
  return [r, g, b];
}

/**
 * Live tube trains as bright elevated markers.
 * Polled every 500ms from TfL Trackernet; positions are lerped on the client.
 */
export function buildTrainLayers({ trains, visibleModes, hoveredTrainId, onHoverTrain }: TrainLayerOptions) {
  const visible =
    visibleModes.size === 0
      ? trains
      : trains.filter((t) => visibleModes.has(t.mode) || visibleModes.has('tube') || t.mode === 'tube');

  const positionKey = visible
    .map((t) => `${t.id}:${t.displayLat.toFixed(4)}:${t.displayLon.toFixed(4)}`)
    .join('|');

  return [
    // Outer glow — large soft disc so trains read at city zoom
    new ScatterplotLayer<AnimatedTrain>({
      id: 'tfl-trains-glow',
      data: visible,
      getPosition: (d) => [d.displayLon, d.displayLat, d.elevation + 120],
      getFillColor: (d) => [...visibleTrainColor(d.color), 100],
      getRadius: 18,
      radiusUnits: 'pixels',
      stroked: false,
      filled: true,
      pickable: false,
      positionFormat: 'XYZ',
      updateTriggers: { getPosition: [positionKey] },
    }),
    // Carriage body — solid line-colored disc with white ring
    new ScatterplotLayer<AnimatedTrain>({
      id: 'tfl-trains-body',
      data: visible,
      getPosition: (d) => [d.displayLon, d.displayLat, d.elevation + 120],
      getFillColor: (d) => [...visibleTrainColor(d.color), 255],
      getLineColor: [15, 23, 42, 255],
      getRadius: (d) => (d.id === hoveredTrainId ? 12 : 9),
      radiusUnits: 'pixels',
      lineWidthMinPixels: 2.5,
      stroked: true,
      filled: true,
      pickable: true,
      positionFormat: 'XYZ',
      onHover: (info) => onHoverTrain((info.object as AnimatedTrain | undefined) ?? null, info.x, info.y),
      updateTriggers: {
        getPosition: [positionKey],
        getRadius: [hoveredTrainId],
      },
    }),
    // White headlight core
    new ScatterplotLayer<AnimatedTrain>({
      id: 'tfl-trains-core',
      data: visible,
      getPosition: (d) => [d.displayLon, d.displayLat, d.elevation + 120],
      getFillColor: [255, 255, 255, 255],
      getRadius: 3,
      radiusUnits: 'pixels',
      stroked: false,
      filled: true,
      pickable: false,
      positionFormat: 'XYZ',
      updateTriggers: { getPosition: [positionKey] },
    }),
  ];
}
