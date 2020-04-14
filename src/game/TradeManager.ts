import { ArraySchema, MapSchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import BankManager from '../game/BankManager';

import Player from '../schemas/Player';

import { initialResourceCounts, Loot } from '../manifest';
import {
  MESSAGE_TRADE_REQUEST,
  MESSAGE_TRADE_START_AGREED,
  MESSAGE_TRADE_CONFIRM,
  MESSAGE_TRADE_REFUSE
} from '../constants';

class TradeManager {
  onStartEndTrade(state: GameState, type: string, currentPlayer: Player, withWho?: string, isAgreed?: boolean) {
    if (type === MESSAGE_TRADE_START_AGREED) {
      const { pendingTrade } = currentPlayer;
      const otherPlayer: Player = state.players[pendingTrade];
  
      currentPlayer.resetTradeStatus();
      otherPlayer.resetTradeStatus();
  
      if (!isAgreed) return;
  
      currentPlayer.tradingWith = otherPlayer.playerSessionId;
      otherPlayer.tradingWith = currentPlayer.playerSessionId;
      return;
    }
  
    if (type === MESSAGE_TRADE_REQUEST) {
      if (!withWho) return;
      const otherPlayer: Player = state.players[withWho];
      
      currentPlayer.isWaitingTradeRequest = true;
      otherPlayer.pendingTrade = currentPlayer.playerSessionId;
      return;
    }
  
    const { tradingWith } = currentPlayer;
    if (!tradingWith) return;
    const otherPlayer: Player = state.players[tradingWith];
  
    if (type === MESSAGE_TRADE_REFUSE) {
      currentPlayer.cancelTrade();
      otherPlayer.cancelTrade();
      return;
    }
  
    if (type === MESSAGE_TRADE_CONFIRM) {
      currentPlayer.isTradeConfirmed = !currentPlayer.isTradeConfirmed;
  
      if (otherPlayer.isTradeConfirmed) {
        this.onExecuteTrade(currentPlayer, otherPlayer);
      }
    }
  }

  onUpdateTrade(state: GameState, player: Player, resource: string, isRemoveCard?: boolean) {
    player.updateTradeCounts(resource, isRemoveCard);
    player.isTradeConfirmed = false;

    const { tradingWith } = player;
    if (tradingWith) {
      const otherPlayer: Player = state.players[tradingWith];
      otherPlayer.isTradeConfirmed = false;
    }
  }
  
  onExecuteTrade(player1: Player, player2: Player) {
    player1.performTrade(player2.tradeCounts);
    player2.performTrade(player1.tradeCounts);
  
    player1.resetTradeCounts();
    player2.resetTradeCounts();
  
    player1.tradingWith = null;
    player2.tradingWith = null;
  }

  onStealCard(state: GameState, currentPlayer: Player, stealFrom: string, resource: string) {
    const otherPlayer: Player = state.players[stealFrom];
    
    currentPlayer.addResource(resource);
    otherPlayer.stolenResource(resource);

    currentPlayer.allowStealingFrom = new ArraySchema<string>();
  }

  onMonopoly(state: GameState, monopolyPlayer: Player, resource: string) {
    // Every player must then give that player all of that type of resource cards in their hand
    Object
      .keys(state.players)
      .filter(sessionId => sessionId !== monopolyPlayer.playerSessionId)
      .forEach(sessionId => {
        const otherPlayer: Player = state.players[sessionId];

        const otherPlayerIsGiving: Loot = new MapSchema<Number>({
          ...initialResourceCounts,
          [resource]: otherPlayer.resourceCounts[resource]
        });

        monopolyPlayer.performTrade(otherPlayerIsGiving);
        otherPlayer.gaveAllOfResourceType(resource);
      });
  }

  onBankTrade(currentPlayer: Player, requestedResource: string) {
    const playerIsReceiving: Loot = new MapSchema<Number>({
      ...initialResourceCounts,
      [requestedResource]: 1
    });

    currentPlayer.performTrade(playerIsReceiving);
    currentPlayer.resetTradeCounts();
  }
}

export default new TradeManager();
