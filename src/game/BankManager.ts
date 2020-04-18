import { MapSchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import Player from '../schemas/Player';
import TileManager from './TileManager';

import {
  resourceCardTypes,
  TILE_RESOURCE,
  DESERT,
  initialResourceCounts
} from '../manifest';
import { Loot, AvailableLoot } from '../interfaces';
import buildingCosts from '../buildingCosts';

class BankManager {
  setResourcesLoot(state: GameState, diceTotal?: number) {
    const updatedResourceCounts: Loot = {
      ...state.resourceCounts
    };
  
    const updatedLoot = Object
      .keys(state.players)
      .reduce((acc, ownerId) => {
        acc[ownerId] = {
          ...initialResourceCounts
        };
  
        return acc;
      }, {} as AvailableLoot);
    
    // Game started - round 1 or higher - allocate resources from the bank to players according to hexes state
    state.board
      .filter(({ type, resource }, index) => type === TILE_RESOURCE && !!resource && resource !== DESERT && index !== state.robberPosition)
      .filter(({ value }) => !diceTotal || value === diceTotal)
      // 18 Resource-type tiles left to loop over
      .forEach(({ resource, row: tileRow, col: tileCol }) => {
        const adjacentStructures = TileManager.hexTileAdjacentStructures(tileRow, tileCol);

        state.structures
          .forEach(({ row, col, ownerId, type }) => {
            if (adjacentStructures.some(([sRow, sCol]) => sRow === row && sCol === col)) {
              const addedValue = type === PURCHASE_CITY ? 2 : 1;
  
              updatedLoot[ownerId][resource] += addedValue;
              updatedResourceCounts[resource] -= addedValue;
            }
          });
      });

    Object
      .keys(state.players)
      .forEach(sessionId => {
        const player: Player = state.players[sessionId];
        const playerUpdatedLoot = updatedLoot[sessionId];
  
        player.availableLoot = new MapSchema<Number>({
          ...playerUpdatedLoot
        });
      });
  
    state.resourceCounts = new MapSchema<Number>({
      ...updatedResourceCounts
    });
  }

  onPlayerCollectAllLoot(player: Player) {
    player.onCollectLoot();
  }

  returnToBank(state: GameState, discardedCounts: Loot) {
    const updatedResourceCounts: Loot = resourceCardTypes.reduce((acc, name) => {
      acc[name] = state.resourceCounts[name] + discardedCounts[name];
      return acc;
    }, {} as Loot);
    
    state.resourceCounts = new MapSchema<Number>({
      ...updatedResourceCounts
    });
  }

  onBankPayment(state: GameState, purchaseType: string) {
    if (!state.isGameStarted) return;
    
    const totalPayments: Loot = buildingCosts[purchaseType];
    this.returnToBank(state, totalPayments);
  }
}

export default new BankManager();
