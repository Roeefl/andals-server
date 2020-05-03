import { ArraySchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import Player from '../schemas/Player';
import DiceRoll from '../schemas/DiceRoll';

import BankManager from '../game/BankManager';

class DiceManager {
  onDiceRoll(state: GameState, dice: number[], currentPlayer: Player): boolean {
    state.dice = new ArraySchema<Number>(...dice);
    state.isDiceRolled = true;
  
    const roll = new DiceRoll(dice);
  
    const updatedRolls = [
      ...currentPlayer.rolls,
      roll
    ];
  
    currentPlayer.rolls = new ArraySchema<DiceRoll>(
      ...updatedRolls
    );
    
    if (!state.isGameStarted) return false;

    // If a player has more than seven cards, that player must discard half of them.
    const isRobbing = roll.value === 7;  
    
    if (isRobbing) {
      Object
        .keys(state.players)
        .forEach(sessionId => {
          const player: Player = state.players[sessionId];
          const totalResources: number = player.totalResourceCounts;

          if (totalResources > 7) {
            player.mustDiscardHalfDeck = true;
          }
        });

      currentPlayer.mustMoveRobber = true;
    } else {
      BankManager.setResourcesLoot(state, roll.value);
    }
    
    return isRobbing;
  }
}

export default new DiceManager();
