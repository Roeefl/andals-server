import GameState from '../game/GameState';
import HexTile from '../schemas/HexTile';
import hexTileMap from '../tilemaps/hexes';
import TileManager from './TileManager';

import {
  TILE_RESOURCE, TILE_WATER, TILE_SPACER,
  DESERT,
  availableInitialTileTypes, availableInitialTileValues,
  availableInitialHarborTypes, harborIndices,
} from '../manifest';

class BoardManager {
  initialBoard() {
    // Total of 49 tiles
    const board: HexTile[] = [];

    let availableTileTypes: string[] = [
      ...availableInitialTileTypes
    ];

    let availableTileValues: number[] = [
      ...availableInitialTileValues
    ];

    let availableHarborTypes: string[] = [
      ...availableInitialHarborTypes
    ];

    for (let r = 0; r < hexTileMap.length; r++) {
      for (let t = 0; t < hexTileMap[r].length; t++) {
        const currentTile = hexTileMap[r][t];

        if (currentTile === TILE_SPACER) {
          const tile = new HexTile(TILE_SPACER, r, t);
          board.push(tile);
        } else if (currentTile === TILE_WATER) {
          const tileIndex: number = r * 7 + t;

          if (harborIndices.includes(tileIndex)) {
            const randomTypeIndex =  Math.floor(Math.random() * availableHarborTypes.length);
            const randomType = availableHarborTypes[randomTypeIndex];

            const tile = new HexTile(TILE_WATER, r, t, randomType);
            board.push(tile);       

            availableHarborTypes.splice(randomTypeIndex, 1);
          } else { // Just water, no harbor
            const waterTile = new HexTile(TILE_WATER, r, t);
            board.push(waterTile);  
          }
        } else {
          // === TILE_RESOURCE
          const randomTypeIndex = Math.floor(Math.random() * availableTileTypes.length);
          const randomType = availableTileTypes[randomTypeIndex];

          let tile = null;
          if (randomType === DESERT) {
            tile = new HexTile(TILE_RESOURCE, r, t, randomType, 0);
          } else {
            const randomValueIndex = Math.floor(Math.random() * availableTileValues.length);
            const randomValue = availableTileValues[randomValueIndex];

            tile = new HexTile(TILE_RESOURCE, r, t, randomType, randomValue);
            availableTileValues.splice(randomValueIndex, 1);
          };

          availableTileTypes.splice(randomTypeIndex, 1);
          board.push(tile);
        }
      }
    }

    return board;
  }

  robberAdjacentPlayers(state: GameState) {
    const { robberPosition } = state;
    const robberTile: HexTile = state.board[robberPosition];
    const { row, col } = robberTile;

    const owners: string[] = [];
    const adjacentStructures = TileManager.hexTileAdjacentStructures(row, col);
  
    state.structures
      .forEach(({ row: sRow, col: sCol, ownerId }) => {
        if (!owners.includes(ownerId) && adjacentStructures.some(([iRow, iCol]) => iRow === sRow && iCol === sCol)) {
          owners.push(ownerId);
        }
      });

    return owners;
  }
}

export default new BoardManager();
