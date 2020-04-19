export function absoluteIndex(tilemap: number[][], row: number, col: number): number {
  return row * tilemap[0].length + col;
};
