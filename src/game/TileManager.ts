import structureTileMap from '../tilemaps/structures';
import hexTileMap from '../tilemaps/hexes'; 

class TileManager {
  hexTileAdjacentHexes(row: number, col: number) {
    // top-left, top-right, left, right, bottom-left, bottom-right
    return [
      [row - 1, col - 1], [row - 1, col],
      [row, col - 1], [row, col + 1],
      [row + 1, col - 1], [row + 1, col]
    ].filter(([hexRow, hexCol]) => hexRow >= 0 && hexRow < hexTileMap.length && hexCol >= 0 && hexCol <= hexTileMap[0].length);
  }

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

  harborAdjacentStructures(ports: number[] = [0, 1], row: number, col: number) {
    const adjacentStructures = this.hexTileAdjacentStructures(row, col)
      .filter(([sRow, sCol]) => !!structureTileMap[sRow][sCol]);
      
      const [firstPortIndex, secondPortIndex] = ports;

      return adjacentStructures.length > 2
        ? [
            adjacentStructures[firstPortIndex],
            adjacentStructures[secondPortIndex]
          ]
        : adjacentStructures;
  }
}

export default new TileManager();
