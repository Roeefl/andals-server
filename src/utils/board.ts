import hexTileMap from '../tilemaps/hexes';

export function absoluteIndex(row: number, col: number): number {
  return row * hexTileMap.length + col;
};
