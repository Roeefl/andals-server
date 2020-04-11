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

const MAX_REROLL_ATTEMPTS = 3;

class BoardManager {
  hasSameResourceInAdjacentHexes(adjacentHexes: number[][], board: HexTile[], row: number, col: number, resourceType: string) {
    return adjacentHexes
      .filter(([hexRow, hexCol]) => hexTileMap[hexRow][hexCol] === TILE_RESOURCE && (hexRow < row || (hexRow === row && hexCol < col)))
      .map(([hexRow, hexCol]) => {
        const otherTile: HexTile = board[hexRow * 7 + hexCol];
        return otherTile.resource === resourceType;
      })
      .some(isSameResource => isSameResource);
  }

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
        const currentTileType = hexTileMap[r][t];

        let currentTile = null;

        if (currentTileType === TILE_SPACER) {
          currentTile = new HexTile(TILE_SPACER, r, t);
        } else if (currentTileType === TILE_WATER) {
          const tileIndex: number = r * 7 + t;

          if (harborIndices.includes(tileIndex)) {
            const randomHarborIndex =  Math.floor(Math.random() * availableHarborTypes.length);
            const randomHarbor = availableHarborTypes[randomHarborIndex];

            availableHarborTypes.splice(randomHarborIndex, 1);
            currentTile = new HexTile(TILE_WATER, r, t, randomHarbor);
          } else { // Just water, no harbor
            currentTile = new HexTile(TILE_WATER, r, t);
          }
        } else { // is a resource tile
          let randomResourceIndex: number = Math.floor(Math.random() * availableTileTypes.length);
          let randomResource: string = availableTileTypes[randomResourceIndex];

          if (randomResource === DESERT) {
            currentTile = new HexTile(TILE_RESOURCE, r, t, DESERT, 0);
          } else {
            const adjacentHexes = TileManager.hexTileAdjacentHexes(r, t);
            let isAdjacentToSameResourceHex = this.hasSameResourceInAdjacentHexes(adjacentHexes, board, r, t, randomResource);
            let currentIteration = 0;

            while (isAdjacentToSameResourceHex && currentIteration <= MAX_REROLL_ATTEMPTS) {
              randomResourceIndex = Math.floor(Math.random() * availableTileTypes.length);
              randomResource = availableTileTypes[randomResourceIndex];
              isAdjacentToSameResourceHex = this.hasSameResourceInAdjacentHexes(adjacentHexes, board, r, t, randomResource);
              ++currentIteration;
            }
            
            const randomValueIndex = Math.floor(Math.random() * availableTileValues.length);
            const randomValue = availableTileValues[randomValueIndex];

            currentTile = new HexTile(TILE_RESOURCE, r, t, randomResource, randomValue);
            availableTileValues.splice(randomValueIndex, 1);
          };

          availableTileTypes.splice(randomResourceIndex, 1);
        }

        board.push(currentTile);
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
