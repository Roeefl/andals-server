import { ArraySchema, MapSchema } from '@colyseus/schema';

import GameState from '../game/GameState';
import Player from '../schemas/Player';
import { HERO_CARD_JeorMormont } from '../schemas/HeroCard';

import { initialResourceCounts } from '../manifest';
import { Loot } from '../interfaces';
import {
  MESSAGE_TRADE_REQUEST,
  MESSAGE_TRADE_START_AGREED,
  MESSAGE_TRADE_CONFIRM,
  MESSAGE_TRADE_REFUSE
} from '../constants';

class TradeManager {
  facilitateTrade(player1: Player, player2: Player, isAgreed: Boolean = true, offeredResource?: string) {
    // Already in a trade
    if (player1.tradingWith || player2.tradingWith) return;

    player1.resetTradeStatus();
    player2.resetTradeStatus();

    if (!isAgreed) return;

    player1.tradingWith = player2.playerSessionId;
    player2.tradingWith = player1.playerSessionId;

    if (offeredResource)
      player1.updateTradeCounts(offeredResource);
  }

  onStartEndTrade(state: GameState, type: string, currentPlayer: Player, withWho?: string, isAgreed?: boolean) {
    if (type === MESSAGE_TRADE_START_AGREED) {
      const { pendingTrade } = currentPlayer;
      const otherPlayer: Player = state.players[pendingTrade];

      this.facilitateTrade(currentPlayer, otherPlayer, isAgreed);
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
    if (!tradingWith) {
      // Might be trading with bank and cancelling trade
      if (type === MESSAGE_TRADE_REFUSE)
        currentPlayer.cancelTrade();

      return;
    };

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

    player1.requestingResource = null;
    player2.requestingResource = null;
  }

  onStealCard(state: GameState, currentPlayer: Player, stealFrom: string, resource: string) {
    const otherPlayer: Player = state.players[stealFrom];
    
    currentPlayer.addResource(resource);
    otherPlayer.stolenResource(resource);

    if (currentPlayer.heroPrivilege === HERO_CARD_JeorMormont) {
      const remainingPlayers = currentPlayer.allowStealingFrom.filter(sessionId => sessionId !== stealFrom);
      this.allowStealingFrom(state, currentPlayer, remainingPlayers);

      if (!currentPlayer.allowStealingFrom.length)
        currentPlayer.isVisibleSteal = false;
      return;
    }

    this.allowStealingFrom(state, currentPlayer, []);
    currentPlayer.allowStealingFrom = new ArraySchema<string>();
    currentPlayer.isVisibleSteal = false;
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

  allowStealingFrom(state: GameState, currentPlayer: Player, fromPlayersSessionIds: string[]) {
    const onlyStealablePlayers = fromPlayersSessionIds.filter(sessionId => {
      const player: Player = state.players[sessionId];
      return player.totalResourceCounts > 0;
    });

    currentPlayer.allowStealingFrom = new ArraySchema<string>(
      ...onlyStealablePlayers
    );
  }
}

export default new TradeManager();
