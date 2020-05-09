import { minBy } from 'lodash';

import GameState from '../game/GameState';
import HexTile from '../schemas/HexTile';
import Player from '../schemas/Player';
import { TILE_WATER } from '../manifest';
import { ROOM_TYPE_FIRST_MEN } from '../specs/roomTypes';

export interface ValidStructurePosition {
  row: number
  col: number
  loot?: number
  lootableTiles?: number
};

export interface ValidHextile {
  population: number
  row: number
  col: number
};

const BEST_TILE_VALUE = 7;

class TileManager {
  // hexTileAdjacentHexes(row: number, col: number) {
  //   // top-left, top-right, left, right, bottom-left, bottom-right
  //   return [
  //     [row - 1, col - 1], [row - 1, col],
  //     [row, col - 1], [row, col + 1],
  //     [row + 1, col - 1], [row + 1, col]
  //   ].filter(([hexRow, hexCol]) => hexRow >= 0 && hexRow < hexTilemap.length && hexCol >= 0 && hexCol <= hexTilemap[0].length);
  // }

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

  harborAdjacentStructures(structureTilemap: number[][], ports: number[] = [0, 1], row: number, col: number) {
    const adjacentStructures = this.hexTileAdjacentStructures(row, col)
      .filter(([sRow, sCol]) => sRow >= 0 && sRow < structureTilemap.length && !!structureTilemap[sRow][sCol]);
      
      const [firstPortIndex, secondPortIndex] = ports;

      return adjacentStructures.length > 2
        ? [
            adjacentStructures[firstPortIndex],
            adjacentStructures[secondPortIndex]
          ]
        : adjacentStructures;
  }

  harborAdjacentToStructure(board: HexTile[], structureTilemap: number[][], row: number, col: number, ports: number[] = [0, 1]) {
    return board
      .filter(({ type, resource }) => type === TILE_WATER && !!resource)
      .find(({ row: tileRow, col: tileCol }) => {
        const adjacentStructures = this.harborAdjacentStructures(structureTilemap, ports, tileRow, tileCol);
        return adjacentStructures.some(([structureRow, structureCol]) => structureRow === row && structureCol === col);
      });
  }

  adjacentStructuresToStructure(tileType: number, row: number, col: number) {
    // offset by +2 for EVEN rows only
    const colOffset = row % 2 === 0 ? 2 : 0;
    
    // If structure tile type is 'TOP', push tile directly above it
    // If structure tile type it 'TOP-LEFT', push tile directly below it
    const thirdAdjacentTile = (tileType === 1)
      ? [row - 1, col - 1 + colOffset]
      : [row + 1, col - 1 + colOffset];
  
    return [
      [row, col], // structure itself
      [row, col - 1], [row, col + 1], // prev, next in same row
      thirdAdjacentTile
    ];
  };

  isValidSettlement(state: GameState, ownerId: string, row: number, col: number) {
    const { structureTilemap, roadTilemap } = state.manifest;

    if (!structureTilemap[row][col])
      return false;

    if (!state.isSetupPhase) {
      const isAdjacentToOwnedRoad = state.roads
        .filter(road => !!road && road.ownerId && road.ownerId === ownerId)
        .map(({ row: roadRow, col: roadCol }) => {
          const roadTile = roadTilemap[roadRow][roadCol];
          if (!roadTile) return false;
    
          let allowedStructures: number[][] = [];
          
          switch (roadTile) {
            case 1:
            case 2:
              allowedStructures = [[Math.floor(roadRow / 2), roadCol], [Math.floor(roadRow / 2), roadCol + 1]];
              break;
    
            case 3:
              allowedStructures = [[Math.floor(roadRow / 2), roadCol], [Math.ceil(roadRow / 2), roadCol - 1]];
              break;
          }
    
          return allowedStructures.some(([itemRow, itemCol]) => itemRow === row && itemCol === col);
        });
    
      if (isAdjacentToOwnedRoad.every(allowed => !allowed)) return false;
    }
  
    // Not allowed to place structure on ports on setup round
    if (state.isSetupPhase && this.harborAdjacentToStructure(state.board, state.manifest.structureTilemap, row, col, state.ports)) return false;
  
    const isAdjacentToActiveStructures = state.structures
      .filter(structure => !!structure && !!structure.ownerId)
      .map(({ row: structureRow, col: structureCol }) => {
        const structureTile = structureTilemap[structureRow][structureCol]; // 'hide' === 0,'top' === 1, 'top-left' === 2
        if (!structureTile) return false;
  
        const adjacentStructureTiles = this.adjacentStructuresToStructure(structureTile, structureRow, structureCol);
        return adjacentStructureTiles.some(([tileRow, tileCol]) => tileRow === row && tileCol === col);
      });
  
    return isAdjacentToActiveStructures.every(isAdjacent => !isAdjacent);
  };

  isValidRoad(state: GameState, owner: Player, row: number, col: number) {
    const { structureTilemap, roadTilemap } = state.manifest;

    if (!roadTilemap[row][col])
      return false;

    // Already owns this road...
    if (state.roads.find(road => !!road && road.ownerId === owner.playerSessionId && road.row === row && road.col === col))
      return false;
  
    const isAllowedPerStructure = state.structures
      .filter(structure => !state.isSetupPhase || !owner.lastStructureBuilt || (!!structure && structure.row === owner.lastStructureBuilt.row && structure.col === owner.lastStructureBuilt.col))
      .filter(structure => !!structure && structure.ownerId && structure.ownerId === owner.playerSessionId)
      .map(({ row: structureRow, col: structureCol }) => {
        const structureTile = structureTilemap[structureRow][structureCol]; // 'hide' === 0,'top' === 1, 'top-left' === 2
        if (!structureTile) return false;
  
        let intersections = [[structureRow * 2, structureCol - 1], [structureRow * 2, structureCol]];
        const colOffset = structureRow % 2 === 0 ? 2 : 0;
  
        if (structureTile === 1) { // 'top' ?
          intersections = [
            ...intersections,
            [structureRow * 2 - 1, structureCol],
            [structureRow * 2 - 1, structureCol - 1 + colOffset]
          ];
        } else {
          intersections = [
            ...intersections,
            [structureRow * 2 + 1, structureCol - 1],
            [structureRow * 2 + 1, structureCol]
          ];
        }
  
        return intersections.some(([iRow, iCol]) => iRow === row && iCol === col);
      });
  
      // During setup phase -- only allow if adjacent to the last structure built
    if (state.isSetupPhase) return isAllowedPerStructure.some(allowed => allowed);
  
    const isAllowedPerRoad = state.roads
      .filter(road => !!road && road.ownerId && road.ownerId === owner.playerSessionId)
      .map(({ row: roadRow, col: roadCol }) => {
        // 0: 'hide', 1: 'top-left', 2: 'top-right', 3: 'left'
        const roadTile = roadTilemap[roadRow][roadCol];
        if (!roadTile) return false;
  
        let intersections: number[][] = [];
  
        const baseGameEvenRows = [0, 2, 4, 6];
        const firstMenEvenRows = [0, 1, 3, 4];

        const isFirstMen = state.manifest.roomType === ROOM_TYPE_FIRST_MEN;
        
        const evenRows = isFirstMen ? firstMenEvenRows : baseGameEvenRows;
          
        let colOffset = evenRows.includes(roadRow) ? 0 : -2;
        
        switch (roadTile) {
          // road: [6, 6], type: 1 || intersecting roads: [6, 5], [6, 7], [5, 6], [7, 6]
          case 1:
            intersections = [
              [roadRow, roadCol - 1], [roadRow, roadCol + 1],
              [roadRow - 1, roadCol + colOffset + 1], [roadRow - 1, roadCol + colOffset + 2],
              [roadRow + 1, roadCol]
            ];
            break;
  
          // road: [6, 7], type: 2 || intersecting roads: [6, 6], [6, 8], [5, 5], [7, 7]
          case 2:
            intersections = [
              [roadRow, roadCol - 1], [roadRow, roadCol + 1],
              [roadRow - 1, roadCol + colOffset + 1], [roadRow - 1, roadCol + colOffset + 2],
              [roadRow + 1, roadCol], [roadRow + 1, roadCol + 1]
            ];
            break;
  
          // road: [7, 7], type: 3 || intersecting roads: [6, 6], [6, 7], [8, 5], [8, 6]
          case 3:
            colOffset = 0;
            if (isFirstMen && roadRow === 5) colOffset = 2;

            intersections = [
              [roadRow - 1, roadCol - 1], [roadRow - 1, roadCol],
              [roadRow + 1, roadCol - 2], [roadRow + 1, roadCol - 1]
            ];
            break;
        }
  
        return intersections.some(([iRow, iCol]) => iRow === row && iCol === col);
      });
  
    return isAllowedPerStructure.some(allowed => allowed) || isAllowedPerRoad.some(allowed => allowed);
  };

  validRoads(state: GameState, player: Player) {
    const { roadTilemap } = state.manifest;

    const allValidRoads: ValidStructurePosition[] = [];

    roadTilemap
      .forEach((row, rowIndex) => {
        row.forEach((s, colIndex) => {
          if (this.isValidRoad(state, player, rowIndex, colIndex)) {
            const road: ValidStructurePosition = { row: rowIndex, col: colIndex };
            allValidRoads.push(road);
          }
        })
      });

    return allValidRoads;
  }

  bestRobberHextile(state: GameState, botSessionId: string) {
    let bestHextile: ValidHextile = {
      row: 0,
      col: 0,
      population: 0
    };

    state.lootableHextiles
      .forEach(({ row: tileRow, col: tileCol }) => {
        const adjacentStructures = this.hexTileAdjacentStructures(tileRow, tileCol);

        const population: number = state.structures
          .filter(({ ownerId, row, col }) => ownerId !== botSessionId && adjacentStructures.some(([sRow, sCol]) => sRow === row && sCol === col))
          .length;

        if (population > bestHextile.population) {
          bestHextile = {
            row: tileRow,
            col: tileCol,
            population
          };
        }
      });

    return bestHextile;
  }

  highestDiceRollProbability(totalResourceValues: number, lootableTiles: number = 2) {
    const divideBy = lootableTiles * BEST_TILE_VALUE;
    return Math.abs(1 - (totalResourceValues / divideBy));
  }

  bestSettlement(state: GameState, ownerId: string): ValidStructurePosition {
    const allValidSettlements: ValidStructurePosition[] = [];

    state.lootableHextiles
      .forEach(({ row: tileRow, col: tileCol, value }) => {
        const adjacentStructures = this.hexTileAdjacentStructures(tileRow, tileCol);

        adjacentStructures.forEach(([settlementRow, settlementCol]) => {
          if (this.isValidSettlement(state, ownerId, settlementRow, settlementCol)) {
            const existingSettlement = allValidSettlements.find(({ row, col, loot }) => row === settlementRow && col === settlementCol);

            if (existingSettlement) {
              existingSettlement.loot += value;
              existingSettlement.lootableTiles++;
            } else {
              const initSettlement: ValidStructurePosition = {
                row: settlementRow,
                col: settlementCol,
                loot: value,
                lootableTiles: 1
              };

              allValidSettlements.push(initSettlement)
            }
          }
        });
      });

    const threeAdjacentTilesSettlements = allValidSettlements.filter(({ lootableTiles }) => lootableTiles >= 3);
    if (threeAdjacentTilesSettlements.length) {
      return minBy(
        threeAdjacentTilesSettlements,
        settlement => this.highestDiceRollProbability(settlement.loot, settlement.lootableTiles)
      );
    }

    const twoAdjacentTilesSettlements = allValidSettlements.filter(({ lootableTiles }) => lootableTiles === 2);
    if (twoAdjacentTilesSettlements.length) {
      return minBy(
        twoAdjacentTilesSettlements,
        settlement => this.highestDiceRollProbability(settlement.loot, settlement.lootableTiles)
      );
    }

    return minBy(
      allValidSettlements,
      settlement => this.highestDiceRollProbability(settlement.loot, settlement.lootableTiles)
    );
  };
}

export default new TileManager();
