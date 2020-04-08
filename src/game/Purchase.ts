import { ArraySchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import Structure from '../schemas/Structure';
import Road from '../schemas/Road';
import Player from '../schemas/Player';

import { PURCHASE_ROAD, PURCHASE_SETTLEMENT } from '../manifest';

class Purchase {
  structure(state: GameState, data: any, ownerId: string, nickname: string, type: string = PURCHASE_SETTLEMENT) {
    const { row, col } = data;
  
    const structure = new Structure(ownerId, type, row, col);
    
    const updatedStructures = [
      ...state.structures,
      structure
    ];
    
    state.structures = new ArraySchema<Structure>(
      ...updatedStructures
    );
  
   const owner: Player = state.players[ownerId];
   owner.onPurchase(type, state.isSetupPhase);
   owner.saveLastStructure(structure);
  } 

  road(state: GameState, data: any, ownerId: string, nickname: string) {
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
}

export default new Purchase();
