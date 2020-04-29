export function absoluteIndex(tilemap: number[][], row: number, col: number): number {
  return row * tilemap[0].length + col;
};

export function tileIndex(tilemap: number[][], tile: number) {
  return [Math.floor(tile / tilemap[0].length), Math.floor(tile % tilemap[0].length)];
};
