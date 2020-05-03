import GameState from '../game/GameState';
import Player from '../schemas/Player';
import BankManager from '../game/BankManager';

import { MESSAGE_GAME_LOG, MESSAGE_TURN_ORDER, MESSAGE_COLLECT_ALL_LOOT } from '../constants';
import { ROOM_TYPE_BASE_GAME } from '../specs/roomTypes';

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

  resetHasPlayedStatus(state: GameState) {
    Object
      .values(state.players)
      .forEach(player => {
        player.hasPlayedGameCard = false
        player.hasPlayedHeroCard = false;
      });
  }

  finishTurn(state: GameState, player: Player, broadcast: (type: string, data: any, isEssential?: boolean) => void) {
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

      broadcast(MESSAGE_GAME_LOG, { message: 'Finished turn order phase' });
      broadcast(MESSAGE_GAME_LOG, { message: 'Starting setup phase', isSetup: true }, true);
      broadcast(MESSAGE_GAME_LOG, { message: `${nickname} is first to play`});
      return;
    }

    if (isSetupPhase) {
      player.initializeSetupPhase(); // @FIXME: WHAT? why twice?

      const lastPlacementRound = state.maxClients * 2 - 1;
      const endOfGuardRound = state.maxClients * 3 - 1;

      if (setupPhaseTurns === LAST_PLAYER) {
        // Give last player in the round another turn
        state.setupPhaseTurns++;

        broadcast( MESSAGE_GAME_LOG, { message: `${player.nickname} is last in the setup phase and plays a double turn` });
        return;
      }

      if (setupPhaseTurns > LAST_PLAYER && setupPhaseTurns < lastPlacementRound) {
        // Reverse turn order until the end of setup phase
        state.currentTurn = (currentTurn - 1) % state.maxClients;
        if (state.currentTurn < 0)
          state.currentTurn = state.maxClients - 1;

        state.setupPhaseTurns++;

        broadcast(MESSAGE_GAME_LOG, { message: `${player.nickname} finished his turn` });
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
          broadcast(MESSAGE_GAME_LOG, { message: 'Place your guards on the wall', isPlaceGuards: true }, true);
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

      broadcast(MESSAGE_GAME_LOG, { message: `${player.nickname} finished his turn` });
      return;
    }
     
    // Not turn order phase - round consists of state.maxClients turns
    state.currentTurn = (currentTurn + 1) % state.maxClients;
    const isEndOfRound: Boolean = state.currentTurn === roundStarter;

    this.resetHasPlayedStatus(state);

    // In case any player did not pick up his loot - give it to him - IF autoPickupEnabled setting is set to true
    if (state.autoPickupEnabled)
      this.onAllPlayersPickupLoot(state, broadcast);

    if (!state.isTurnOrderPhase)
      broadcast(MESSAGE_TURN_ORDER, { message: `${player.nickname} finished his turn` });
      

    if (isEndOfRound) {
      broadcast(MESSAGE_GAME_LOG, { message: `Round ${currentRound} complete. Starting Round ${currentRound + 1}` });
      state.currentRound++;
    }
  }

  startGame(state: GameState, broadcast: (type: string, data: any, isEssential?: boolean) => void) {
    // END OF SETUP PHASE
    state.isSetupPhase = false;
    state.isGameStarted = true;
    
    broadcast(MESSAGE_GAME_LOG, { message: 'Finished setup phase. Game is starting!', isGameStart: true }, true);
    BankManager.setResourcesLoot(state, null, true);

    // not sure if this should be under 'auto pickup' or not
    this.onAllPlayersPickupLoot(state, broadcast);

    state.currentTurn = state.roundStarter;
  }

  onAllPlayersPickupLoot(state: GameState, broadcast: (type: string, data: any, isEssential?: boolean) => void) {
    state.allPlayers
      .filter(player => player.totalAvailableLoot > 0)
      .forEach(player => {
        broadcast(MESSAGE_COLLECT_ALL_LOOT, {
          playerSessionId: player.playerSessionId,
          playerName: player.nickname,
          loot: player.availableLoot
        });

        player.onCollectLoot();
      });
  }
}

export default new TurnManager();
