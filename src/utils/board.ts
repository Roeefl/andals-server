import hexTileMap from '../tilemaps/baseGame/hexes';

export function absoluteIndex(row: number, col: number): number {
  return row * hexTileMap.length + col;
};
