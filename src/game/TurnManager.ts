import GameState from '../game/GameState';
import Player from '../schemas/Player';
import Bank from '../game/BankManager';

import { MESSAGE_GAME_LOG } from '../constants';

class TurnManager {
  initializeSetupPhase(state: GameState) {
    Object
      .values(state.players)
      .forEach(player => player.initializeSetupPhase());
  }

  resetHasPlayedGameCard(state: GameState) {
    Object
      .values(state.players)
      .forEach(player => player.hasPlayedGameCard = false);
  }

  finishTurn(state: GameState, player: Player, broadcast: (type: string, message: string) => void) {
    const {
      isSetupPhase,
      isTurnOrderPhase,
      roundStarter,
      currentTurn,
      setupPhaseTurns,
      currentRound
    } = state;

    const LAST_PLAYER: number = state.maxClients - 1;

    state.isDiceRolled = false;

    const isEndOfTurnOrderPhase: Boolean = currentTurn === LAST_PLAYER;
    if (isTurnOrderPhase && isEndOfTurnOrderPhase) {
      state.isTurnOrderPhase = false;
      
      const initialRolls = Object
        .values(state.players)
        .map((player: Player, playerIndex: number) => ({
          playerIndex,
          nickname: player.nickname,
          initialRoll: player.rolls[0].value
        }));

      const sortedInitialRolls = initialRolls
        .sort((a, b) => a.initialRoll <= b.initialRoll ? 1 : -1);
        
      const { playerIndex, nickname } = sortedInitialRolls[0];
      
      state.currentTurn = playerIndex;
      state.roundStarter = playerIndex;
      state.isSetupPhase = true;

      this.initializeSetupPhase(state);

      broadcast(MESSAGE_GAME_LOG, 'Turn determination phase finished.');
      broadcast(MESSAGE_GAME_LOG, 'Setup phase is starting.');
      broadcast(MESSAGE_GAME_LOG, `${nickname} is first to play`);
      return;
    }

    if (isSetupPhase) {
      player.initializeSetupPhase();

      if (setupPhaseTurns === LAST_PLAYER) {
        // Give last player in the round another turn
        state.setupPhaseTurns++;

        broadcast( MESSAGE_GAME_LOG, `${player.nickname} is last in the setup phase and plays a double turn`);
        return;
      }

      if (setupPhaseTurns === (state.maxClients * 2 - 1)) {
        // END OF SETUP PHASE
        state.currentTurn = state.roundStarter;
        state.isSetupPhase = false;

        state.isGameStarted = true;

        // initializeFirstRoundStart
        // same method with no diceTotal should loop over ALL hexes instead of ones matching the diceValue.
        Bank.setResourcesLoot(state);

        broadcast(MESSAGE_GAME_LOG, 'Setup phase is complete. Game started!');
        return;
      }

      if (setupPhaseTurns > LAST_PLAYER) {
        // Reverse turn order until the end of setup phase
        state.currentTurn = (currentTurn - 1) % state.maxClients;
        if (state.currentTurn < 0)
          state.currentTurn = state.maxClients - 1;

        state.setupPhaseTurns++;

        broadcast(MESSAGE_GAME_LOG, `${player.nickname} finished his turn`);
        return;
      }

      state.currentTurn = (currentTurn + 1) % state.maxClients;
      state.setupPhaseTurns++;

      broadcast(MESSAGE_GAME_LOG, `${player.nickname} finished his turn`);
      return;
    }
     
    // Not turn order phase - round consists of state.maxClients turns
    state.currentTurn = (currentTurn + 1) % state.maxClients;
    const isEndOfRound: Boolean = currentTurn === roundStarter;

    this.resetHasPlayedGameCard(state);

    if (!state.isTurnOrderPhase)
      broadcast(MESSAGE_GAME_LOG, `${player.nickname} finished his turn`);
    
    if (isEndOfRound) {
      broadcast(MESSAGE_GAME_LOG, `Round ${currentRound} complete. Starting Round ${currentRound + 1}`);
      state.currentRound++;
    }
  }
}

export default new TurnManager();
