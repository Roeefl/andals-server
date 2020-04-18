import { Client } from 'colyseus';
import BaseGame from './BaseGame';
import { RoomOptions } from '../interfaces';

import Player from '../schemas/Player';

import BoardManager from '../game/BoardManager';
import PurchaseManager from '../game/PurchaseManager';
import BankManager from '../game/BankManager';
import TurnManager from '../game/TurnManager';
import GameCardManager from '../game/GameCardManager';
import TradeManager from '../game/TradeManager';
import DiceManager from '../game/DiceManager';

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
    const gameCards = GameCardManager.shuffled();

    const tokens = WildlingManager.initialTokens();
    
    const gameState = new FirstMenGameState(firstmenManifest, board, gameCards, roomOptions);
    this.setState(gameState);
    
    this.populateWithBotsIfNeeded(roomOptions);
  };

  onMessage(client: Client, data: any) {
    const { type } = data;
    const currentPlayer: Player = this.state.players[client.sessionId];

    if (!firstMenMessageTypes.includes(type)) {
      this.onGameAction(currentPlayer, type, data);
      return;
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
