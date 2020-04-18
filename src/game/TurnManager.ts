import GameState from '../game/GameState';
import Player from '../schemas/Player';
import BankManager from '../game/BankManager';

import { MESSAGE_GAME_LOG } from '../constants';
import { ROOM_TYPE_BASE_GAME } from '../roomTypes';

class TurnManager {
  initializeSetupPhase(state: GameState) {
    Object
      .values(state.players)
      .forEach(player => player.initializeSetupPhase());
  }

  initializeGuardPhase(state: GameState) {
    Object
      .values(state.players)
      .forEach(player => player.initialGuardSetupPhase());
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
      player.initializeSetupPhase(); // @FIXME: WHAT? why twice?

      const lastPlacementRound = state.maxClients * 2 - 1;
      const endOfGuardRound = state.maxClients * 3 - 1;

      if (setupPhaseTurns === LAST_PLAYER) {
        // Give last player in the round another turn
        state.setupPhaseTurns++;

        broadcast( MESSAGE_GAME_LOG, `${player.nickname} is last in the setup phase and plays a double turn`);
        return;
      }

      if (setupPhaseTurns > LAST_PLAYER && setupPhaseTurns < (lastPlacementRound)) {
        // Reverse turn order until the end of setup phase
        state.currentTurn = (currentTurn - 1) % state.maxClients;
        if (state.currentTurn < 0)
          state.currentTurn = state.maxClients - 1;

        state.setupPhaseTurns++;

        broadcast(MESSAGE_GAME_LOG, `${player.nickname} finished his turn`);
        return;
      }

      if (setupPhaseTurns === lastPlacementRound) {
        state.currentTurn = state.roundStarter;

        if (state.roomType === ROOM_TYPE_BASE_GAME) {
          this.startGame(state, broadcast);
        }
        else {
          this.initializeGuardPhase(state);
          state.setupPhaseTurns++;
        }

        return;
      }

      if (setupPhaseTurns > lastPlacementRound) {
        // guard placing round
        // Don't do fucking anything just let them place guards.
      }

      if (setupPhaseTurns === endOfGuardRound) {
        this.startGame(state, broadcast);
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

  startGame(state: GameState, broadcast: (type: string, message: string) => void) {
    // END OF SETUP PHASE
    state.isSetupPhase = false;
    state.isGameStarted = true;

    BankManager.setResourcesLoot(state);

    broadcast(MESSAGE_GAME_LOG, 'Setup phase is complete. Game started!');
  }
}

export default new TurnManager();
