import { ArraySchema } from '@colyseus/schema';

import TileManager from './TileManager';
import GameState from '../game/GameState';

import Structure from '../schemas/Structure';
import Road from '../schemas/Road';
import Player from '../schemas/Player';
import GameCard from '../schemas/GameCard';

import {
  PURCHASE_ROAD, PURCHASE_SETTLEMENT,
  TILE_WATER,
  CARD_KNIGHT, CARD_VICTORY_POINT, CARD_ROAD_BUILDING, CARD_YEAR_OF_PLENTY, CARD_MONOPOLY 
} from '../manifest';

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
        const adjacentStructures = TileManager.harborAdjacentStructures(state.ports, tileRow, tileCol);

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

    if (selectedCard.type === CARD_KNIGHT) this.onPurchaseKnight(state, owner);
  }

  // hasLargestArmy-related logic
  onPurchaseKnight(state: GameState, owner: Player) {
    if (owner.knights < 3) return;

    const otherPlayerKnights = Object
      .values(state.players)
      .map(player => player.knights);
    
    // If this player is first to reach 3 - give him hasLargestArmy, others already have false
    if (otherPlayerKnights.every(count => count < 3)) {
      owner.hasLargestArmy = true;
      return;
    }

    // If hasLargestArmy was already given - but this player surpassed everybody else - take away from everybody, then give to him
    if (otherPlayerKnights.every(count => count < owner.knights)) {
      Object
        .keys(state.players)
        .forEach(sessionId => {
          const player: Player = state.players[sessionId];
          player.hasLargestArmy = false;
        });

      owner.hasLargestArmy = true;
    }
  }
}

export default new PurchaseManager();
