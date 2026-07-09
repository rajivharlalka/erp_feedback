export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = Number.parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}
