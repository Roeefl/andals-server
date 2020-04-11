import structureTileMap from '../tilemaps/structures';
 
class TileManager {
  hexTileAdjacentStructures(row: number, col: number) {
    // offset by +2 for EVEN rows only
    const colOffset = row % 2 === 0 ? 2 : 0;

    // top-left, top, top-right, bottom-left, bottom, bottom-right
    return [
      [row, col * 2],
      [row, col * 2 + 1],
      [row, col * 2 + 2],
      [row + 1, col * 2 - 1 + colOffset],
      [row + 1, col * 2 + colOffset],
      [row + 1, col * 2 + 1 + colOffset]
    ];
  }

  harborAdjacentStructures(row: number, col: number) {
    const allAdjacentStructures = this.hexTileAdjacentStructures(row, col);

    return allAdjacentStructures
      .filter(([sRow, sCol]) => !!structureTileMap[sRow][sCol])
      .slice(0, 2);
  }
}

export default new TileManager();
