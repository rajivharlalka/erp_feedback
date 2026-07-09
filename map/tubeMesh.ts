'use client';

import { CubeGeometry } from '@luma.gl/engine';

/**
 * Shared unit cube used as a tube carriage body.
 * Scaled per-train in SimpleMeshLayer to an elongated 3D box.
 */
export const TUBE_CARRIAGE_MESH = new CubeGeometry({ id: 'tfl-tube-carriage' });

/** Length × width × height in meters — reads as a small train at city zoom. */
export const TUBE_CARRIAGE_SCALE: [number, number, number] = [95, 28, 22];
