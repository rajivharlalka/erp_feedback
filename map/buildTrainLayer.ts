'use client';

import { ScatterplotLayer } from '@deck.gl/layers';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { hexToRgb } from '@/lib/color';
import type { AnimatedTrain } from '@/hooks/useLiveTrains';
import { TUBE_CARRIAGE_MESH, TUBE_CARRIAGE_SCALE } from '@/map/tubeMesh';

export interface TrainLayerOptions {
  trains: AnimatedTrain[];
  visibleModes: Set<string>;
  hoveredTrainId: string | null;
  onHoverTrain: (train: AnimatedTrain | null, x: number, y: number) => void;
}

function visibleTrainColor(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  // Lift near-black lines (Northern) so carriages stay readable on the basemap.
  if (luminance < 0.18) return [226, 232, 240];
  return [r, g, b];
}

/**
 * Live tube trains as elevated 3D carriage meshes.
 * Positions are polled every two seconds and lerped on the client.
 */
export function buildTrainLayers({ trains, visibleModes, hoveredTrainId, onHoverTrain }: TrainLayerOptions) {
  const visible = trains.filter((t) => visibleModes.has(t.mode));

  return [
    // Soft ground glow so trains stay findable at city zoom
    new ScatterplotLayer<AnimatedTrain>({
      id: 'tfl-trains-glow',
      data: visible,
      getPosition: (d) => [d.displayLon, d.displayLat, d.elevation + 8],
      getFillColor: (d) => [...visibleTrainColor(d.color), 90],
      getRadius: 55,
      radiusUnits: 'meters',
      radiusMinPixels: 6,
      radiusMaxPixels: 22,
      stroked: false,
      filled: true,
      pickable: false,
      positionFormat: 'XYZ',
    }),
    // True 3D tube carriage — elongated cube oriented along travel heading
    new SimpleMeshLayer<AnimatedTrain>({
      id: 'tfl-trains-mesh',
      data: visible,
      mesh: TUBE_CARRIAGE_MESH,
      getPosition: (d) => [d.displayLon, d.displayLat, d.elevation + 28],
      getColor: (d) => [...visibleTrainColor(d.color), d.id === hoveredTrainId ? 255 : 245],
      // deck.gl: [pitch, yaw, roll] — yaw faces the direction of travel
      getOrientation: (d) => [0, 90 - d.heading, 0],
      getScale: (d) => {
        const boost = d.id === hoveredTrainId ? 1.35 : 1;
        return [TUBE_CARRIAGE_SCALE[0] * boost, TUBE_CARRIAGE_SCALE[1] * boost, TUBE_CARRIAGE_SCALE[2] * boost];
      },
      sizeScale: 1,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 80],
      material: {
        ambient: 0.55,
        diffuse: 0.7,
        shininess: 32,
        specularColor: [80, 80, 80],
      },
      onHover: (info) => onHoverTrain((info.object as AnimatedTrain | undefined) ?? null, info.x, info.y),
      updateTriggers: {
        getScale: [hoveredTrainId],
        getColor: [hoveredTrainId],
      },
    }),
    // Bright headlight tip so motion reads clearly in 3D
    new ScatterplotLayer<AnimatedTrain>({
      id: 'tfl-trains-headlight',
      data: visible,
      getPosition: (d) => {
        const rad = (d.heading * Math.PI) / 180;
        // Nudge ~40m ahead of the carriage center along heading
        const dLat = (Math.cos(rad) * 40) / 111_320;
        const dLon = (Math.sin(rad) * 40) / (111_320 * Math.cos((d.displayLat * Math.PI) / 180));
        return [d.displayLon + dLon, d.displayLat + dLat, d.elevation + 34];
      },
      getFillColor: [255, 252, 235, 255],
      getRadius: 12,
      radiusUnits: 'meters',
      radiusMinPixels: 2,
      radiusMaxPixels: 6,
      stroked: false,
      filled: true,
      pickable: false,
      positionFormat: 'XYZ',
    }),
  ];
}
