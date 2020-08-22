import { Client } from 'colyseus';
import { minBy, maxBy } from 'lodash';
import BaseGame from './BaseGame';
import { RoomOptions } from '../interfaces';

import Player from '../schemas/Player';
import HexTile from '../schemas/HexTile';
import DiceRoll from '../schemas/DiceRoll';

import TurnManager from '../game/TurnManager';
import BoardManager from '../game/BoardManager';
import GameCardManager from '../game/GameCardManager';
import HeroCardManager from '../game/HeroCardManager';
import BankManager from '../game/BankManager';

import BroadcastService from '../services/broadcast';

import {
  MESSAGE_FINISH_TURN,
  MESSAGE_PLACE_STRUCTURE,
  MESSAGE_PURCHASE_GAME_CARD,
  MESSAGE_ROLL_DICE,
  MESSAGE_PLAY_HERO_CARD,
  MESSAGE_SELECT_HERO_CARD,
  MESSAGE_SWAPPED_HERO_CARD,
  MESSAGE_GAME_VICTORY,
  MESSAGE_TRADE_WITH_BANK,
  MESSAGE_MOVE_ROBBER,
  MESSAGE_WILDLINGS_REMOVE_FROM_TILE,
  MESSAGE_WILDLINGS_REMOVE_FROM_CAMP,
  MESSAGE_WILDLINGS_REMOVE_FROM_CLEARING,
  MESSAGE_REMOVE_GUARD,
  MESSAGE_RELOCATE_GUARD,
  MESSAGE_REMOVE_ROAD,
  MESSAGE_STEAL_CARD,
  MESSAGE_COLLECT_RESOURCE_LOOT
} from '../constants';

import { firstmenManifest, PURCHASE_GAME_CARD } from '../manifest';

import WildlingManager from '../game/WildlingManager';
import FirstMenGameState from '../north/FirstMenGameState';
import { tokensPerPurchase } from '../specs/wildlings';

import {
  HERO_CARD_BowenMarsh,
  HERO_CARD_QhorinHalfhand,
  HERO_CARD_SamwellTarly,
  HERO_CARD_OthellYarwyck,
  HERO_CARD_Melisandre,
  HERO_CARD_EuronGrejoy
} from '../schemas/HeroCard';

class FirstMenGame extends BaseGame {
  onCreate(roomOptions: RoomOptions) {
    console.info("FirstMenGame | onCreate | roomOptions: ", roomOptions);
    this.setMetadata({ roomTitle: roomOptions.roomTitle });

    this.broadcastService = new BroadcastService(this, roomOptions.roomTitle);
    this.turnManager = new TurnManager(this.broadcastService);
    this.wildlingManager = new WildlingManager(this.broadcastService);

    const board = BoardManager.firstMenBoard();
    const gameCards = GameCardManager.initialShuffledDeck();

    const wildlingTokens = this.wildlingManager.shuffleTokens();
    const heroCards = HeroCardManager.shuffle();
    
    const gameState = new FirstMenGameState(firstmenManifest, board, gameCards, roomOptions, wildlingTokens, heroCards);
    this.setState(gameState);
    
    this.populateWithBotsIfNeeded(roomOptions);

    HeroCardManager.assignInitialHeroCards(this.state as FirstMenGameState);
  };

  /** PRE-onGameAction | PREVIOUS actions needed only in FirstMen mode */
  preGameAction(state: FirstMenGameState, currentPlayer: Player, data: any): number {
    switch (data.type) {
      case MESSAGE_MOVE_ROBBER:
        return state.robberPosition;

      case MESSAGE_SELECT_HERO_CARD:
        const { heroType } = data;
        console.log("FirstMenGame -> onMessage -> heroType", heroType)

        currentPlayer.swappingHeroCard = false;
        HeroCardManager.swapPlayerHeroCard(state, currentPlayer, heroType);
        
        this.broadcastService.broadcast(MESSAGE_SWAPPED_HERO_CARD, {
          playerName: currentPlayer.nickname,
          playerColor: currentPlayer.color,
          newHeroCardType: currentPlayer.currentHeroCard.type
        });
        
        this.wildlingManager.onTokensRevealed(state, 1);
        break;

      case MESSAGE_RELOCATE_GUARD:
        const {
          fromSection,
          fromPosition,
          toSection
        } = data;

        state.onGuardRelocate(fromSection, fromPosition, toSection);
        currentPlayer.allowGuardRelocate = false;
        break;

      case MESSAGE_WILDLINGS_REMOVE_FROM_CAMP:
        const { clanName, campIndex } = data;
        this.wildlingManager.removeWildlingFromCamp(state, clanName, campIndex);
        break;

      case MESSAGE_WILDLINGS_REMOVE_FROM_CLEARING:
        const { clearingIndex, wildlingIndex } = data;
        this.wildlingManager.removeWildlingFromClearing(state, clearingIndex, wildlingIndex);
        break;
      
      default:
        break;
    }

    return -1;
  }

  onMessage(client: Client, data: any) {
    const { type } = data;
    const currentPlayer: Player = this.state.players[client.sessionId];

    const state = this.state as FirstMenGameState;

    const lastRobberPosition: number = this.preGameAction(state, currentPlayer, data);
    this.onGameAction(currentPlayer, type, data);
    this.postGameAction(state, currentPlayer, data, lastRobberPosition);
  };
  
  /** POST-onGameAction | additional actions needed only in FirstMen mode: */
  postGameAction(state: FirstMenGameState, currentPlayer: Player, data: any, lastRobberPosition: number) {
    switch (data.type) {
      case MESSAGE_PLACE_STRUCTURE:
      case MESSAGE_PURCHASE_GAME_CARD:
        if (!state.isGameStarted) break;

        const { structureType = PURCHASE_GAME_CARD } = data;
        const tokensToPlay = tokensPerPurchase[structureType || PURCHASE_GAME_CARD];

        this.wildlingManager.onTokensRevealed(state, tokensToPlay);

        if (data.type === MESSAGE_PURCHASE_GAME_CARD && currentPlayer.heroPrivilege === HERO_CARD_Melisandre) {
          currentPlayer.flexiblePurchase = null;
          currentPlayer.isVisiblePurchaseGameCard = false;

          GameCardManager.shuffleDeck(state);
        };
        
        break;

      case MESSAGE_ROLL_DICE:
        const { dice = [3, 3, 1] } = data;
        const roll = new DiceRoll(dice);

        // Samwell Tarly check
        if (currentPlayer.heroPrivilege === HERO_CARD_SamwellTarly && roll.value !== 7 && currentPlayer.totalAvailableLoot === 0) {
          BankManager.giveOneResourceOfEach(currentPlayer);
        };

        if (!state.isGameStarted || dice.length < 2) break;
        
        const wildlingDice: number = dice[2];
        this.wildlingManager.wildlingsAdvance(state, wildlingDice);
        this.evaluateWildlingVictory();
        break;
        
      case MESSAGE_PLAY_HERO_CARD:
        const { heroType, isDiscard = false } = data;
        console.log("FirstMenGame -> onMessage -> heroType, isDiscard", heroType, isDiscard)

        this.broadcastService.broadcast(MESSAGE_PLAY_HERO_CARD, {
          playerName: currentPlayer.nickname,
          playerColor: currentPlayer.color,
          heroCardType: currentPlayer.currentHeroCard.type
        }, true);
        
        HeroCardManager.playHeroCard(state, currentPlayer, heroType, isDiscard);        
        break;

      case MESSAGE_TRADE_WITH_BANK:
        if (currentPlayer.heroPrivilege === HERO_CARD_BowenMarsh)
          currentPlayer.bankTradeRate = firstmenManifest.bankTradeRate;
        break;

      case MESSAGE_MOVE_ROBBER:
        if (currentPlayer.heroPrivilege === HERO_CARD_QhorinHalfhand) {
          const lastRobberTile: HexTile = state.board[lastRobberPosition];
          
          if (lastRobberTile.resource) {
            currentPlayer.addResource(lastRobberTile.resource);
            BankManager.loseResource(state, lastRobberTile.resource);

            this.broadcastService.broadcast(MESSAGE_COLLECT_RESOURCE_LOOT, {
              playerSessionId: currentPlayer.playerSessionId,
              playerName: currentPlayer.nickname,
              playerColor: currentPlayer.color,
              resource: lastRobberTile.resource
            });    
          }
        }

        break;

      case MESSAGE_WILDLINGS_REMOVE_FROM_TILE:
        const { tileIndex } = data;

        if (tileIndex) {
          const wildling = state.board[tileIndex].occupiedBy;

          state.spawnCounts[wildling.type]++;
          state.board[tileIndex].occupiedBy = null;

          wildling.occupiesTile = -1;
        }

        break;

      case MESSAGE_FINISH_TURN:
        currentPlayer.heroPrivilege = null;
        
        if (currentPlayer.heroPrivilege === HERO_CARD_EuronGrejoy)
          currentPlayer.bankTradeRate = firstmenManifest.bankTradeRate;
        break;

      case MESSAGE_REMOVE_ROAD:
        // Othell check
        if (currentPlayer.heroPrivilege === HERO_CARD_OthellYarwyck)
          currentPlayer.allowFreeRoads = 1;
        break;

      case MESSAGE_REMOVE_GUARD:
        const {
          section,
          position = 0
        } = data;

        state.onGuardKilled(section, position, false);
        currentPlayer.allowKill = null;
        break;

      case MESSAGE_STEAL_CARD:
        const { stealFrom, giveBack } = data;
        if (!giveBack) break;

        const otherPlayer: Player = this.state.players[stealFrom];
        currentPlayer.stolenResource(giveBack);
        otherPlayer.addResource(giveBack);
        break;

      case MESSAGE_COLLECT_RESOURCE_LOOT:
        // Samwell Tarly check
        if (currentPlayer.heroPrivilege === HERO_CARD_SamwellTarly && !currentPlayer.allowCollectAll)
          BankManager.resetResourcesLoot(currentPlayer);
        break;
    }
  }

  onJoin(client: Client, options: any) {
    this.onPlayerJoin(client.sessionId, options);
    HeroCardManager.assignInitialHeroCard(this.state as FirstMenGameState, client.sessionId);
  }

  // 3 wall breaches end the game
  evaluateWildlingVictory() {
    const state = this.state as FirstMenGameState;

    // If the number of wildlings in the Gift exceeds 7 (8 or more) the game ends immediately.
    const occupiedBoardTiles = state.board
      .filter(({ occupiedBy }) => !!occupiedBy)
      .length;

    if (state.wallBreaches >= 3 || occupiedBoardTiles >= 8) {
      state.isVictory = true;

      let winner: Player = null;
      
      winner = minBy(
        Object.values(state.players),
        player => player.guards
      );

      const othersWithSameGuardsCount: Player[] = Object
        .values(state.players)
        .filter(({ guards }) => guards === winner.guards);

      if (othersWithSameGuardsCount.length > 1) {
        winner = maxBy(
          othersWithSameGuardsCount,
          player => player.victoryPoints
        );
      };

      // @TODO: If still tied, the tied player with the oldest guard on the wall wins (guard on the lowest number in any wall section).

      this.broadcastService.broadcast(MESSAGE_GAME_VICTORY, {
        playerName: winner.nickname,
        playerColor: winner.color
      }, true);
    }
  }
};

export default FirstMenGame;
