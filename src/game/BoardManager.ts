import { shuffle } from 'lodash';

import GameState from '../game/GameState';
import HexTile from '../schemas/HexTile';
import hexTileMap from '../tilemaps/hexes';
import TileManager from './TileManager';

import {
  TILE_RESOURCE, TILE_WATER, TILE_SPACER,
  DESERT,
  boardHextiles, boardHextileValues,
  boardHarbors, harborIndices,
} from '../manifest';

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

  /**
   * Generates a board array with a total of 49 hex tiles
   * @memberof BoardManager
  **/
  initialBoard() {
    const board: HexTile[] = [];

    const hextiles: string[] = shuffle(boardHextiles);
    let hexTileIndex: number = 0;

    const hextileValues: number[] = shuffle(boardHextileValues);
    let hextileValueIndex: number = 0;

    const harbors: string[] = shuffle(boardHarbors);
    let harborIndex: number = 0;

    for (let r = 0; r < hexTileMap.length; r++) {
      for (let t = 0; t < hexTileMap[r].length; t++) {
        const currentTileType = hexTileMap[r][t];

        let currentTile = null;

        if (currentTileType === TILE_SPACER) {
          currentTile = new HexTile(TILE_SPACER, r, t);
        } else if (currentTileType === TILE_WATER) {
          const tileIndex: number = r * 7 + t;

          if (harborIndices.includes(tileIndex)) {
            const nextHarbor = harbors[harborIndex];
            harborIndex++;

            currentTile = new HexTile(TILE_WATER, r, t, nextHarbor);
          } else {
            // Just water, no harbor
            currentTile = new HexTile(TILE_WATER, r, t);
          }
        } else {
          // is a resource tile
          const nextResource: string = hextiles[hexTileIndex];
          hexTileIndex++;

          if (nextResource === DESERT) {
            currentTile = new HexTile(TILE_RESOURCE, r, t, DESERT);
          } else {
            // const adjacentHexes = TileManager.hexTileAdjacentHexes(r, t);
            // let isAdjacentToSameResourceHex = this.hasSameResourceInAdjacentHexes(adjacentHexes, board, r, t, nextResource);
            // while (isAdjacentToSameResourceHex) {
            //   nextResource = hextiles[hexTileIndex];
            //   isAdjacentToSameResourceHex = this.hasSameResourceInAdjacentHexes(adjacentHexes, board, r, t, nextResource);
            // }
            
            const nextValue = hextileValues[hextileValueIndex];
            hextileValueIndex++;
            currentTile = new HexTile(TILE_RESOURCE, r, t, nextResource, nextValue);
          };
        }

        board.push(currentTile);
      }
    };

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
