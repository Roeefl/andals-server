import { MapSchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import Player from '../schemas/Player';
import TileManager from './TileManager';

import {
  resourceCardTypes,
  TILE_RESOURCE,
  DESERT,
  initialResourceCounts,
  PURCHASE_CITY
} from '../manifest';
import { Loot, AvailableLoot, FlexiblePurchase } from '../interfaces';
import buildingCosts from '../specs/buildingCosts';

class BankManager {
  setResourcesLoot(state: GameState, diceTotal?: number | null, isFirstLoot: boolean = false) {
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
    state.lootableHextiles
      .filter(({ value }) => !diceTotal || value === diceTotal)
      // 18 Resource-type tiles left to loop over
      .forEach(({ resource, row: tileRow, col: tileCol }) => {
        const adjacentStructures = TileManager.hexTileAdjacentStructures(tileRow, tileCol)

        state.structures
          // @TODO: Have to resolve this stupid bug where some players get all 6 and some get only 3
          .filter(({ row, col, ownerId }) => !isFirstLoot || (row === state.players[ownerId].lastStructureBuilt.row && col === state.players[ownerId].lastStructureBuilt.col))
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
  
  returnToBank(state: GameState, discardedCounts: Loot) {
    const updatedResourceCounts: Loot = resourceCardTypes.reduce((acc, name) => {
      acc[name] = state.resourceCounts[name] + discardedCounts[name];
      return acc;
    }, {} as Loot);
    
    state.resourceCounts = new MapSchema<Number>({
      ...updatedResourceCounts
    });
  }

  onBankPayment(state: GameState, purchaseType: string, flexiblePurchase?: FlexiblePurchase) {
    if (!state.isGameStarted) return;
    
    const totalPayments: Loot = buildingCosts[purchaseType];

    const { swapWhich, swapWith } = flexiblePurchase || {};
    console.log("onBankPayment -> swapWith", swapWith)
    console.log("onBankPayment -> swapWhich", swapWhich)
    if (swapWhich && swapWith) {
      totalPayments[swapWhich]++;
      totalPayments[swapWith]--;
    }
    console.log("onBankPayment -> totalPayments", totalPayments)

    this.returnToBank(state, totalPayments);
  }

  loseResource(state: GameState, resource: string) {
    state.resourceCounts = new MapSchema<Number>({
      ...state.resourceCounts,
      [resource]: state.resourceCounts[resource] - 1
    });
  }

  giveOneResourceOfEach(currentPlayer: Player) {
    const oneOfEach: Loot = {
      lumber: 1,
      sheep: 1,
      brick: 1,
      wheat: 1,
      ore: 1
    };

    currentPlayer.availableLoot = new MapSchema<Number>({
      ...oneOfEach
    });

    currentPlayer.allowCollectAll = false;
  }

  resetResourcesLoot(currentPlayer: Player) {
    currentPlayer.availableLoot = new MapSchema<Number>({
      ...initialResourceCounts
    });

    currentPlayer.allowCollectAll = true;
  }
}

export default new BankManager();
