import { Client } from 'colyseus';
import BaseGame from './BaseGame';
import { RoomOptions } from '../interfaces';

import Player from '../schemas/Player';
import HexTile from '../schemas/HexTile';

import BoardManager from '../game/BoardManager';
import GameCardManager from '../game/GameCardManager';
import HeroCardManager from '../game/HeroCardManager';
import BankManager from '../game/BankManager';

import {
  MESSAGE_PLACE_GUARD,
  MESSAGE_PLACE_STRUCTURE,
  MESSAGE_PURCHASE_GAME_CARD,
  MESSAGE_WILDLINGS_REVEAL_TOKENS,
  MESSAGE_ROLL_DICE,
  MESSAGE_PLAY_HERO_CARD,
  MESSAGE_GAME_VICTORY,
  MESSAGE_TRADE_WITH_BANK,
  MESSAGE_MOVE_ROBBER,
  MESSAGE_WILDLINGS_REMOVE_FROM_TILE
} from '../constants';

import {
  firstmenManifest, PURCHASE_GUARD, PURCHASE_GAME_CARD
} from '../manifest';

import WildlingManager from '../game/WildlingManager';
import FirstMenGameState from '../north/FirstMenGameState';
import { tokensPerPurchase } from '../specs/wildlings';

import { HERO_CARD_BowenMarsh, HERO_CARD_QhorinHalfhand } from '../schemas/HeroCard';

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

    let lastRobberPosition: number = -1;

    // PRE-onGameAction | previous actions needed only in FirstMen mode:
    switch (type) {
      case MESSAGE_MOVE_ROBBER:
        lastRobberPosition = state.robberPosition;
        break;

      default:
        break;
    }

    this.onGameAction(currentPlayer, type, data);

    // POST-onGameAction | additional actions needed only in FirstMen mode:
    switch (type) {
      case MESSAGE_PLACE_GUARD:
        break;

      case MESSAGE_PLACE_STRUCTURE:
      case MESSAGE_PURCHASE_GAME_CARD:
        if (!state.isGameStarted) break;

        const { structureType = PURCHASE_GAME_CARD } = data;
        const tokensToPlay = tokensPerPurchase[structureType || PURCHASE_GAME_CARD];
        const tokens = state.wildlingTokens.slice(0, tokensToPlay);

        WildlingManager.onTokensRevealed(state, tokensToPlay);
        this.broadcastToAll(MESSAGE_WILDLINGS_REVEAL_TOKENS, { tokens }, true);
        break;

      case MESSAGE_ROLL_DICE:
        const { dice = [3, 3, 1] } = data;
        if (!state.isGameStarted || dice.length < 2) break;
        
        const wildlingDice: number = dice[2];
        WildlingManager.wildlingsAdvance(state, wildlingDice,
          (broadcastType: string, data: any, isEssential: boolean = false) => this.broadcastToAll(broadcastType, data, isEssential));

        this.evaluateBreaches();
        break;
        
      case MESSAGE_PLAY_HERO_CARD:
        const { heroType, isDiscard = false } = data;
        
        HeroCardManager.playHeroCard(state, currentPlayer, heroType, isDiscard);
        // WildlingManager.onTokensRevealed(state, 1);
        
        this.broadcastToAll(MESSAGE_PLAY_HERO_CARD, {
          playerName: currentPlayer.nickname,
          heroCard: currentPlayer.currentHeroCard
        }, true);
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
          }
        }

      case MESSAGE_WILDLINGS_REMOVE_FROM_TILE:
        const { tileIndex } = data;

        if (tileIndex) {
          const wildling = state.board[tileIndex].occupiedBy;

          state.spawnCounts[wildling.type]++;
          state.board[tileIndex].occupiedBy = null;

          wildling.occupiesTile = null;
        }
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
      }, true);
    }
  }
};

export default FirstMenGame;
