class TileManager {
  hexTileAdjacentStructures(row: number, col: number) {
    // offset by +2 for EVEN rows only
    const colOffset = row % 2 === 0 ? 2 : 0;

    return [
      // top-left, top, top-right
      [row, col * 2], [row, col * 2 + 1], [row, col * 2 + 2],
      // bottom-left, bottom, bottom-right
      [row + 1, col * 2 - 1 + colOffset], [row + 1, col * 2 + colOffset], [row + 1, col * 2 + 1 + colOffset]
    ];
  }
}

export default new TileManager();
