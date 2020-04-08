import { ArraySchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import Player from '../schemas/Player';
import DiceRoll from '../schemas/DiceRoll';

import BankManager from '../game/BankManager';

class DiceManager {
  onDiceRoll(state: GameState, dice: number[], player: Player) {
    state.dice = new ArraySchema<Number>(...dice);
    state.isDiceRolled = true;
  
    const roll = new DiceRoll(dice);
  
    const updatedRolls = [
      ...player.rolls,
      roll
    ];
  
    player.rolls = new ArraySchema<DiceRoll>(
      ...updatedRolls
    );
    
    if (state.isGameStarted)
      BankManager.setResourcesLoot(state, roll.value);
  }
  
}

export default new DiceManager();
