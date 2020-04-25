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
    owner.onPurchase(PURCHASE_ROAD, state.isSetupPhase);

    // this.evaluateLongestRoad();
  }

  evaluateLongestRoad() {
    // @TODO: implement
  }

  onPurchaseGameCard(state: GameState, ownerId: string) {
    const randomCardIndex = Math.floor(Math.random() * state.gameCards.length);
    const selectedCard: GameCard = state.gameCards[randomCardIndex];

    const owner: Player = state.players[ownerId];
    owner.onPurchaseCard(selectedCard);

    const updatedGameCards = [
      ...state.gameCards
    ].filter((card, index) => index !== randomCardIndex);

    state.gameCards = new ArraySchema<GameCard>(
      ...updatedGameCards
    );
  }

  onPurchaseGuard(state: FirstMenGameState, ownerId: string, section: number, position: number, flexiblePurchase: FlexiblePurchase) {
    const guard = new Guard(ownerId, section, position);
    
    const updatedWall = [
      ...state.wall
    ];
    updatedWall[section * wallSectionSize + position] = guard;
    
    state.wall = new ArraySchema<Guard>(
      ...updatedWall
    );
  
   const owner: Player = state.players[ownerId];
   owner.onPurchase(PURCHASE_GUARD, state.isSetupPhase, false, flexiblePurchase);
  }
}

export default new PurchaseManager();
