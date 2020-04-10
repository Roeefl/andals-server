import { ArraySchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import Structure from '../schemas/Structure';
import Road from '../schemas/Road';
import Player from '../schemas/Player';
import GameCard from '../schemas/GameCard';

import { PURCHASE_ROAD, PURCHASE_SETTLEMENT, PURCHASE_CARD } from '../manifest';

class PurchaseManager {
  structure(state: GameState, data: any, ownerId: string, structureType: string = PURCHASE_SETTLEMENT) {
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
  } 

  road(state: GameState, data: any, ownerId: string) {
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

  gameCard(state: GameState, ownerId: string) {
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
}

export default new PurchaseManager();
