import { MapSchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import Player from '../schemas/Player';

import {
  TILE_RESOURCE,
  DESERT,
  PURCHASE_CITY,
  initialResourceCounts,
  Loot,
  AvailableLoot
} from '../manifest';

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
  
        // offset by +2 for EVEN rows only
        const colOffset = tileRow % 2 === 0 ? 2 : 0;
  
        const tileStructureIndices = [
          [tileRow, tileCol * 2], [tileRow, tileCol * 2 + 1], [tileRow, tileCol * 2 + 2], // top-left, top, top-right
          [tileRow + 1, tileCol * 2 - 1 + colOffset], [tileRow + 1, tileCol * 2 + colOffset], [tileRow + 1, tileCol * 2 + 1 + colOffset] // bottom-left, bottom, bottom-right
        ];
  
        state.structures
          .forEach(({ row, col, ownerId, type }) => {
            if (!!resource && tileStructureIndices.some(([sRow, sCol]) => sRow === row && sCol === col)) {
              const addedValue = type === PURCHASE_CITY ? 2 : 1;
  
              updatedLoot[ownerId][resource] += addedValue;
              updatedResourceCounts[resource] -= addedValue;
            }
          });
      });
  
    Object
      .entries(state.players)
      .forEach(([sessionId, player]) => {
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
}

export default new BankManager();
