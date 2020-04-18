import { Client } from 'colyseus';
import BaseGame from './BaseGame';
import { RoomOptions } from '../interfaces';

import Player from '../schemas/Player';

import BoardManager from '../game/BoardManager';
import PurchaseManager from '../game/PurchaseManager';
import BankManager from '../game/BankManager';
import GameCardManager from '../game/GameCardManager';
import HeroCardManager from '../game/HeroCardManager';

import { MESSAGE_GAME_LOG, MESSAGE_PLACE_GUARD } from '../constants';

import {
  firstmenManifest, PURCHASE_GUARD
} from '../manifest';
import WildlingManager from '../game/WildlingManager';
import FirstMenGameState from '../north/FirstMenGameState';

const firstMenMessageTypes: string[] = [
  MESSAGE_PLACE_GUARD
];

class FirstMenGame extends BaseGame {
  onCreate(roomOptions: RoomOptions) {
    console.info("FirstMenGame | onCreate | roomOptions: ", roomOptions);

    const board = BoardManager.firstMenBoard();
    const gameCards = GameCardManager.shuffle();

    const tokens = WildlingManager.shuffleTokens();
    const heroCards = HeroCardManager.shuffle();
    
    const gameState = new FirstMenGameState(firstmenManifest, board, gameCards, roomOptions, tokens, heroCards);
    this.setState(gameState);
    
    this.populateWithBotsIfNeeded(roomOptions);

    this.assignInitialHeroCards();
  };

  assignInitialHeroCards() {
    const state = this.state as FirstMenGameState;
    let cardIndex = 0;

    Object
      .keys(this.state.players)
      .forEach(sessionId => {
        const player: Player = this.state.players[sessionId];
        const heroCard = state.heroCards[cardIndex];

        heroCard.ownerId = player.playerSessionId;
        player.currentHeroCard = heroCard;

        cardIndex++;
      });
  }

  onMessage(client: Client, data: any) {
    const { type } = data;
    const currentPlayer: Player = this.state.players[client.sessionId];

    if (!firstMenMessageTypes.includes(type)) {
      this.onGameAction(currentPlayer, type, data);
    }

    if (type === MESSAGE_PLACE_GUARD) {
      const { section = 0, position = 0 } = data;
      this.onPlaceGuard(currentPlayer, section, position);
    }
  };

  onPlaceGuard(currentPlayer: Player, section: number, position: number) {
    PurchaseManager.onPurchaseGuard(this.state as FirstMenGameState, currentPlayer.playerSessionId, section, position);
    BankManager.onBankPayment(this.state, PURCHASE_GUARD);
    this.evaluateVictoryStatus();
  
    this.broadcastToAll(MESSAGE_GAME_LOG, {
      message: `${currentPlayer.nickname} has placed a Guard in [Section ${section}, Position ${position}]`
    });
  }
};

export default FirstMenGame;
