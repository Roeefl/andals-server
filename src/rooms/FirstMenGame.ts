import { Client } from 'colyseus';
import BaseGame from './BaseGame';
import { RoomOptions } from '../interfaces';

import Player from '../schemas/Player';

import BoardManager from '../game/BoardManager';
import GameCardManager from '../game/GameCardManager';
import HeroCardManager from '../game/HeroCardManager';

import { MESSAGE_PLACE_GUARD, MESSAGE_PLACE_STRUCTURE, MESSAGE_PURCHASE_GAME_CARD, MESSAGE_WILDLINGS_REVEAL_TOKENS, MESSAGE_ROLL_DICE, MESSAGE_GAME_VICTORY } from '../constants';

import {
  firstmenManifest, PURCHASE_GUARD, PURCHASE_GAME_CARD
} from '../manifest';
import WildlingManager from '../game/WildlingManager';
import FirstMenGameState from '../north/FirstMenGameState';
import { tokensPerPurchase } from '../specs/wildlings';

const firstMenMessageTypes: string[] = [
  MESSAGE_PLACE_GUARD
];

class FirstMenGame extends BaseGame {
  onCreate(roomOptions: RoomOptions) {
    console.info("FirstMenGame | onCreate | roomOptions: ", roomOptions);

    const board = BoardManager.firstMenBoard();
    const gameCards = GameCardManager.shuffle();

    const wildlingTokens = WildlingManager.shuffleTokens();
    const heroCards = HeroCardManager.shuffle();
    
    const gameState = new FirstMenGameState(firstmenManifest, board, gameCards, roomOptions, wildlingTokens, heroCards);
    this.setState(gameState);
    
    this.populateWithBotsIfNeeded(roomOptions);

    HeroCardManager.assignInitialHeroCards(this.state as FirstMenGameState);
  };

  onMessage(client: Client, data: any) {
    const { type } = data;
    const currentPlayer: Player = this.state.players[client.sessionId];

    const state = this.state as FirstMenGameState;

    // if (!firstMenMessageTypes.includes(type))
    this.onGameAction(currentPlayer, type, data);

    switch (type) {
      case MESSAGE_PLACE_GUARD:
        break;

      case MESSAGE_PLACE_STRUCTURE:
      case MESSAGE_PURCHASE_GAME_CARD:
        if (!state.isGameStarted) break;

        const { structureType = PURCHASE_GAME_CARD } = data;
        const tokensToPlay = tokensPerPurchase[structureType || PURCHASE_GAME_CARD];
        const tokens = state.wildlingTokens.slice(0, tokensToPlay);

        WildlingManager.onPurchaseWithTokens(state, tokensToPlay);
        this.broadcastToAll(MESSAGE_WILDLINGS_REVEAL_TOKENS, { tokens });
        break;

      case MESSAGE_ROLL_DICE:
        const { dice = [3, 3, 1] } = data;
        if (!state.isGameStarted || dice.length < 2) break;
        
        const wildlingDice: number = dice[2];
        WildlingManager.wildlingsAdvance(state, wildlingDice,
          (broadcastType: string, data: any, isEssential: boolean = false) => this.broadcastToAll(broadcastType, data, isEssential));

        this.evaluateBreaches();
        break;
    }
  };

  onJoin(client: Client, options: any) {
    this.onPlayerJoin(client.sessionId, options);
    HeroCardManager.assignInitialHeroCard(this.state as FirstMenGameState, client.sessionId);
  }

  // 3 wall breaches end the game
  evaluateBreaches() {
    const state = this.state as FirstMenGameState;

    if (state.wallBreaches >= 3) {
      state.isVictory = true;

      this.broadcastToAll(MESSAGE_GAME_VICTORY, {
        playerName: 'ASSSESS' // @TODO: Calculate winner by guards + VP etc
      });
    }
  }
};

export default FirstMenGame;
