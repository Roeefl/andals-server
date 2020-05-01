import { ArraySchema } from '@colyseus/schema';

import TileManager from './TileManager';
import GameState from '../game/GameState';
import FirstMenGameState from '../north/FirstMenGameState';

import Structure from '../schemas/Structure';
import Road from '../schemas/Road';
import Player from '../schemas/Player';
import GameCard from '../schemas/GameCard';
import Guard from '../schemas/Guard';

import {
  PURCHASE_ROAD, PURCHASE_SETTLEMENT, PURCHASE_GUARD,
  TILE_WATER
} from '../manifest';

import { wallSectionSize } from '../specs/wall';
import { FlexiblePurchase } from '../interfaces';

class PurchaseManager {
  onPurchaseStructure(state: GameState, data: any, ownerId: string, structureType: string = PURCHASE_SETTLEMENT) {
    const { row, col } = data;
  
    const structure = new Structure(ownerId, structureType, row, col);
    
    const updatedStructures = [
      ...state.structures,
      structure
    ];
    
    state.structures = new ArraySchema<Structure>(
      ...updatedStructures
    );
  
   const owner: Player = state.players[ownerId];
   owner.onPurchase(structureType, state.isSetupPhase);
   owner.saveLastStructure(structure);

   // Player just purchased a new settlement - check if need to add harbor privileges for him
   if (structureType === PURCHASE_SETTLEMENT) {
     state.board
      .filter(({ type, resource }) => type === TILE_WATER && !!resource)
      .forEach(({ resource, row: tileRow, col: tileCol }) => {
        const adjacentStructures = TileManager.harborAdjacentStructures(state.manifest.structureTilemap, state.ports, tileRow, tileCol);

        if (adjacentStructures.some(([sRow, sCol]) => sRow === row && sCol === col)) {
          owner.receiveHarborPrivileges(resource);
        }
      });
   }
  } 

  onPurchaseRoad(state: GameState, data: any, ownerId: string) {
    const { row, col } = data;

    const road = new Road(ownerId, row, col);

    const updatedRoads = [
      ...state.roads,
      road
    ];
    state.roads = new ArraySchema<Road>(
      ...updatedRoads
    );

    const owner: Player = state.players[ownerId];
    owner.onPurchase(PURCHASE_ROAD, state.isSetupPhase, owner.allowFreeRoads > 0);
    // this.evaluateLongestRoad();
  }

  onRemoveRoad(state: GameState, data: any, ownerId: string) {
    const { row, col } = data;

    const existingRoadIndex = state.roads.findIndex(road => road.row === row && road.col === col);
    console.log("onRemoveRoad -> existingRoadIndex", existingRoadIndex)

    const updatedRoads = state.roads.filter((road, index) => index !== existingRoadIndex);
    state.roads = new ArraySchema<Road>(
      ...updatedRoads
    );

    const owner: Player = state.players[ownerId];
    owner.roads++;

    // Owner should receive 'free road' flag
    // Road was not actually removed
  }

  evaluateLongestRoad() {
    // @TODO: implement
  }

  onPurchaseGameCard(state: GameState, ownerId: string, selectedCardIndex: number = -1) {
    const randomCardIndex = selectedCardIndex < 0
      ? Math.floor(Math.random() * state.gameCards.length)
      : selectedCardIndex;
      
    const selectedCard: GameCard = state.gameCards[randomCardIndex];
    console.log("onPurchaseGameCard -> selectedCard", selectedCard)

    const owner: Player = state.players[ownerId];
    owner.onPurchaseGameCard(selectedCard);

    const updatedGameCards = [
      ...state.gameCards
    ].filter((card, index) => index !== randomCardIndex);

    state.gameCards = new ArraySchema<GameCard>(
      ...updatedGameCards
    );
  }

  onPurchaseGuard(state: FirstMenGameState, ownerId: string, section: number, position: number, flexiblePurchase?: FlexiblePurchase, isFree: boolean = false) {
    const guard = new Guard(ownerId, section, position);
    
    const updatedWall = [
      ...state.wall
    ];
    updatedWall[section * wallSectionSize + position] = guard;
    
    state.wall = new ArraySchema<Guard>(
      ...updatedWall
    );
  
   const owner: Player = state.players[ownerId];
   owner.onPurchase(PURCHASE_GUARD, state.isSetupPhase, isFree, flexiblePurchase);
  }
}

export default new PurchaseManager();
