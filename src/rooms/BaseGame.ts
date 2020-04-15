import { ArraySchema } from '@colyseus/schema';
import { Room, Client } from 'colyseus';
import Player from '../schemas/Player';
import GameBot from '../schemas/GameBot';

import GameState from '../game/GameState';
import BoardManager from '../game/BoardManager';
import PurchaseManager from '../game/PurchaseManager';
import BankManager from '../game/BankManager';
import TurnManager from '../game/TurnManager';
import GameCardManager from '../game/GameCardManager';
import TradeManager from '../game/TradeManager';
import DiceManager from '../game/DiceManager';

import {
  MESSAGE_GAME_LOG,
  MESSAGE_CHAT,
  MESSAGE_GAME_ACTION,
  MESSAGE_READY,
  MESSAGE_ROLL_DICE,
  MESSAGE_COLLECT_ALL_LOOT,
  MESSAGE_DISCARD_HALF_DECK,
  MESSAGE_FINISH_TURN,
  MESSAGE_PLACE_ROAD,
  MESSAGE_PLACE_STRUCTURE,
  MESSAGE_PURCHASE_GAME_CARD,
  MESSAGE_PLAY_GAME_CARD,
  MESSAGE_SELECT_MONOPOLY_RESOURCE,
  MESSAGE_MOVE_ROBBER,
  MESSAGE_STEAL_CARD,
  MESSAGE_GAME_VICTORY,

  MESSAGE_TRADE_WITH_BANK,
  MESSAGE_TRADE_REQUEST,
  MESSAGE_TRADE_START_AGREED,
  MESSAGE_TRADE_ADD_CARD,
  MESSAGE_TRADE_REMOVE_CARD,
  MESSAGE_TRADE_CONFIRM,
  MESSAGE_TRADE_REFUSE
} from '../constants';

import {
  PURCHASE_ROAD,
  PURCHASE_SETTLEMENT,
  PURCHASE_GAME_CARD,
  playerColors,
  Loot
} from '../manifest';

import { RoomOptions } from '../interfaces';

const maxReconnectionTime = 5 * 60;

class BaseGame extends Room<GameState> {
  get activeClients() {
    return Object
      .keys(this.state.players)
      .length;
  }

  get allPlayers() {
    const players: Player[] = Object.values(this.state.players);
    return players; 
  }

  get allBots() {
    return Object
      .values(this.state.players)
      .filter(player => player.isBot);
  }

  get currentPlayer() {
    const { currentTurn } = this.state;
    return this.allPlayers[currentTurn];
  }

  onCreate(roomOptions: RoomOptions) {
    console.info("BaseGame | onCreate | roomOptions: ", roomOptions);

    const initialBoard = BoardManager.initialBoard();
    const initialGameCards = GameCardManager.initialGameCards();
    
    const gameState = new GameState(initialBoard, initialGameCards, roomOptions);
    this.setState(gameState);

    const {
      playVsBots = false,
      maxPlayers = 4
    } = roomOptions;

    if (playVsBots) {
      for (let b = 1; b < maxPlayers; b++) {
        const color = playerColors[this.activeClients];
        const addedBot = new GameBot(color, this.activeClients);
        
        this.state.players[addedBot.playerSessionId] = addedBot;
        this.onPlayerReady(addedBot);
      }
      this.lock();
    }
  };

  broadcastToAll(type: string, data: Object = {}) {
    this.broadcast({
      sender: this.state.roomTitle,
      type,
      ...data
    });
  }

  onJoin(client: Client, options: any) {
    const color = playerColors[this.activeClients];
    const addedPlayer = new Player(client.sessionId, options, color, this.activeClients);
    
    this.state.players[client.sessionId] = addedPlayer;
    
    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: this.state.roomTitle,
      message: `${addedPlayer.nickname || client.sessionId} has joined the room.`
    }, {
      except: client
    });
  
    if (this.activeClients >= this.state.maxClients)
      this.lock();
  };

  async onLeave(client: Client, isConsented: boolean) {
    const { enableBotReplacement } = this.state;

    // flag client as inactive for other users
    const currentPlayer: Player = this.state.players[client.sessionId];
    currentPlayer.isConnected = false;

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: this.state.roomTitle,
      message: `${currentPlayer.nickname || client.sessionId} has left the room and is replaced by a bot.`
    }, {
      except: client
    });

    const replacementBot = new GameBot('', 0, currentPlayer);
    if (enableBotReplacement) {
      this.state.players[client.sessionId] = replacementBot;
  
      if (replacementBot.playerIndex === this.state.currentTurn)
        this.advanceBot(replacementBot)
    }

    try {
      // allow disconnected client to reconnect into this room 
      await this.allowReconnection(client, maxReconnectionTime);
      
      // client returned! let's re-activate it.
      if (enableBotReplacement) {
        const options = {
          nickname: currentPlayer.nickname
        };
        this.state.players[client.sessionId] = new Player(replacementBot.playerSessionId, options, replacementBot.color, replacementBot.playerIndex);
        this.state.players[client.sessionId].restore(replacementBot);
      } else {
        this.state.players[client.sessionId].isConnected = true;

        this.broadcast({
          type: MESSAGE_GAME_LOG,
          sender: this.state.roomTitle,
          message: `${currentPlayer.nickname || client.sessionId} has reconnected!`
        });
      }
    } catch (e) {
      if (enableBotReplacement)
        // Final rename to a full bot name...
        replacementBot.nickname = GameBot.generateName();
      else
        // 20 seconds expired. let's remove the client.
        delete this.state.players[client.sessionId];
    } finally {
      if (enableBotReplacement)
        replacementBot.nickname = GameBot.generateName();
      else
        delete this.state.players[client.sessionId];
    }
  };

  onMessage(client: Client, data: any) {
    const { type = MESSAGE_GAME_ACTION } = data;
    const currentPlayer: Player = this.state.players[client.sessionId];

    this.onGameAction(currentPlayer, type, data);
  };

  async onGameAction(currentPlayer: Player, type: string, data: any = {}) {
    switch (type) {
      case MESSAGE_CHAT:
        const { message = ' ' } = data;
        this.onChatMessage(currentPlayer, message);
        break;

      case MESSAGE_ROLL_DICE:
        const { dice = [3, 3] } = data;
        DiceManager.onDiceRoll(this.state, dice, currentPlayer);

        this.broadcastToAll(MESSAGE_ROLL_DICE, {
          playerName: currentPlayer.nickname,
          dice
        });
        
        if (this.state.isGameStarted)
          this.allBotsCollectLoot();

        break;

      case MESSAGE_COLLECT_ALL_LOOT:
        this.broadcastToAll(MESSAGE_COLLECT_ALL_LOOT, {
          playerName: currentPlayer.nickname,
          loot: currentPlayer.availableLoot
        });

        BankManager.onPlayerCollectAllLoot(currentPlayer);
        break;

      case MESSAGE_DISCARD_HALF_DECK:
        const { discardedCounts = {} } = data;

        this.broadcastToAll(MESSAGE_DISCARD_HALF_DECK, {
          playerName: currentPlayer.nickname,
          discardedCounts
        });
        
        currentPlayer.discardResources(discardedCounts);
        currentPlayer.mustDiscardHalfDeck = false;
        
        BankManager.returnToBank(this.state, discardedCounts);
        break;

      case MESSAGE_MOVE_ROBBER:
        const { tile = 0 } = data;
        this.state.robberPosition = tile;
        currentPlayer.mustMoveRobber = false;

        const allowStealingFrom = BoardManager.robberAdjacentPlayers(this.state);
        currentPlayer.allowStealingFrom = new ArraySchema<string>(
          ...allowStealingFrom
        );
        
        break;

      case MESSAGE_STEAL_CARD:
        TradeManager.onStealCard(this.state, currentPlayer, data.stealFrom, data.resource);
        break;

      case MESSAGE_PLACE_ROAD:
        PurchaseManager.onPurchaseRoad(this.state, data, currentPlayer.playerSessionId);
        BankManager.onBankPayment(this.state, PURCHASE_ROAD);
        
        if (currentPlayer.roadBuildingPhase > 0) {
          currentPlayer.advanceRoadBuildingPhase();
        }

        this.broadcastToAll(MESSAGE_GAME_LOG, {
          message: `${currentPlayer.nickname} built a road`
        });
        break;

      case MESSAGE_PLACE_STRUCTURE:
        const { structureType = PURCHASE_SETTLEMENT } = data;
        PurchaseManager.onPurchaseStructure(this.state, data, currentPlayer.playerSessionId, structureType);
        BankManager.onBankPayment(this.state, structureType);
        this.evaluateVictoryStatus();

        this.broadcastToAll(MESSAGE_GAME_LOG, {
          message: `${currentPlayer.nickname} built a ${structureType}`
        });
        break;

      case MESSAGE_PURCHASE_GAME_CARD:
        PurchaseManager.onPurchaseGameCard(this.state, currentPlayer.playerSessionId);
        BankManager.onBankPayment(this.state, PURCHASE_GAME_CARD);
        this.evaluateVictoryStatus();

        this.broadcastToAll(MESSAGE_GAME_LOG, {
          message: `${currentPlayer.nickname} purchased a development card`
        });
        break;

      case MESSAGE_PLAY_GAME_CARD:
        const { cardType, cardIndex } = data;
        GameCardManager.playGameCard(currentPlayer, cardType, cardIndex);
        this.onPlayKnightCard(currentPlayer);
        this.evaluateVictoryStatus();

        break;

      case MESSAGE_SELECT_MONOPOLY_RESOURCE:
        currentPlayer.isDeclaringMonopoly = false;

        const { selectedResource } = data;
        TradeManager.onMonopoly(this.state, currentPlayer, selectedResource);
        break;
        
      case MESSAGE_TRADE_ADD_CARD:
      case MESSAGE_TRADE_REMOVE_CARD:
        const { resource } = data;
        TradeManager.onUpdateTrade(this.state, currentPlayer, resource, type === MESSAGE_TRADE_REMOVE_CARD);
        
        if (currentPlayer.tradingWith)
          this.botsAdjustTrade(currentPlayer.tradingWith, type);

        break;

      case MESSAGE_TRADE_WITH_BANK:
        const { requestedResource } = data;
        BankManager.returnToBank(this.state, currentPlayer.tradeCounts);
        TradeManager.onBankTrade(currentPlayer, requestedResource);
        break;
            
      case MESSAGE_TRADE_REQUEST:
      case MESSAGE_TRADE_START_AGREED:
      case MESSAGE_TRADE_REFUSE:
      case MESSAGE_TRADE_CONFIRM:
        const { isAgreed, withWho } = data;
        TradeManager.onStartEndTrade(this.state, type, currentPlayer, withWho, isAgreed);

        if (type === MESSAGE_TRADE_REQUEST && withWho) {
          const maybeBot: Player = this.state.players[withWho];

          if (maybeBot.isBot)
           this.onGameAction(maybeBot, MESSAGE_TRADE_START_AGREED, { isAgreed: true });
        }
        break;

      case MESSAGE_FINISH_TURN:
        TurnManager.finishTurn(this.state, currentPlayer, (broadcastType: string, broadcastMessage: string) => this.broadcastToAll(broadcastType, { message: broadcastMessage }));
        await this.advanceBot(this.currentPlayer as GameBot);

        // In case any player did not pick up his loot - give it to him 
        if (this.state.autoPickupEnabled)
          this.autoPickupLoot();

        break;

      case MESSAGE_READY:
        this.onPlayerReady(currentPlayer);
        break;

      default:
        break;
    }
  }

  autoPickupLoot() {
    this.allPlayers
      .filter(player => player.totalAvailableLoot > 0)
      .forEach(player => {
        this.broadcastToAll(MESSAGE_COLLECT_ALL_LOOT, {
          playerName: player.nickname,
          loot: player.availableLoot
        });

        player.onCollectLoot();
      });
  }

  async advanceBot(currentBot: GameBot) {
    if (!currentBot.isBot) return;

    if (this.state.isTurnOrderPhase) {
      const botDice: number[] = await GameBot.rollDice();
      this.onGameAction(currentBot, MESSAGE_ROLL_DICE, { dice: botDice });

      this.onGameAction(currentBot, MESSAGE_FINISH_TURN);
      return;
    }
    
    if (this.state.isSetupPhase) {
      const settlement = await GameBot.validSettlement(this.state, currentBot.playerSessionId);
      this.onGameAction(currentBot, MESSAGE_PLACE_STRUCTURE, settlement);

      const road = await GameBot.validRoad(this.state, currentBot);
      this.onGameAction(currentBot, MESSAGE_PLACE_ROAD, road);

      this.onGameAction(currentBot, MESSAGE_FINISH_TURN);

      // end of setup phase - all bots need to collect game-starting loot
      // if (this.state.setupPhaseTurns === this.state.maxClients * 2 - 1) {
      //   this.allBotsCollectLoot();
      // }
      return;
    }

    const botDice: number[] = await GameBot.rollDice();
    this.onGameAction(currentBot, MESSAGE_ROLL_DICE, { dice: botDice });

    if (currentBot.mustMoveRobber) {
      const tile = await GameBot.desiredRobberTile(this.state, currentBot.playerSessionId);
      this.onGameAction(currentBot, MESSAGE_MOVE_ROBBER, { tile });
    }

    if (currentBot.mustDiscardHalfDeck) {
      const discardedCounts: Loot = currentBot.discardedCounts();
      this.onGameAction(currentBot, MESSAGE_DISCARD_HALF_DECK, { discardedCounts });
    }
  
    if (currentBot.allowStealingFrom.length) {
      const stealData = currentBot.stealCard(this.state);
      this.onGameAction(currentBot, MESSAGE_STEAL_CARD, stealData);
    }
    
    if (currentBot.hasResources.city) {
      const city = await GameBot.validCity(this.state, currentBot.playerSessionId);

      if (city)
        this.onGameAction(currentBot, MESSAGE_PLACE_STRUCTURE, city);
    }

    if (currentBot.hasResources.gameCard) {
      this.onGameAction(currentBot, MESSAGE_PURCHASE_GAME_CARD);
    }

    if (currentBot.hasResources.settlement) {
      const settlement = await GameBot.validSettlement(this.state, currentBot.playerSessionId);
      if (settlement)
        this.onGameAction(currentBot, MESSAGE_PLACE_STRUCTURE, settlement);
    }

    if (currentBot.hasResources.road) {
      const road = await GameBot.validRoad(this.state, currentBot);
      if (road)
        this.onGameAction(currentBot, MESSAGE_PLACE_ROAD, road);
    }

    this.onGameAction(currentBot, MESSAGE_FINISH_TURN);
  }

  allBotsCollectLoot() {
    const allBots: GameBot[] = this.allBots;

    allBots
      .filter(bot => bot.totalAvailableLoot > 0)
      .forEach(bot => this.onGameAction(bot, MESSAGE_COLLECT_ALL_LOOT));
  }

  async botsAdjustTrade(tradingWith: string, type: string) {
    const tradingBot: GameBot = this.state.players[tradingWith];
    if (!tradingBot.isBot) return;

    const selectedResource = type === MESSAGE_TRADE_ADD_CARD
      ? await tradingBot.bestAddedTradeResource()
      : await tradingBot.bestRemovedTradeResource();
    if (!selectedResource) return;
    
    this.onGameAction(tradingBot, type, selectedResource);
    this.onGameAction(tradingBot, MESSAGE_TRADE_CONFIRM);
  }

  onChatMessage(sender: Player, message: string) {
    this.broadcastToAll(MESSAGE_CHAT, {
      sender: sender.nickname,
      senderSessionId: sender.playerSessionId,
      message
    });
  }

  async onPlayerReady(player: Player) {
    player.isReady = !player.isReady;

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: this.state.roomTitle,
      message: `${player.nickname} is ${player.isReady ? '' : 'not'} ready`
    });
    // }, {
      // except: client
    // });

    if (this.activeClients < this.state.maxClients) return;

    const isAllReady = Object
      .values(this.state.players)
      .every(playerData => playerData.isReady);
      
    if (!isAllReady) return;

    // All players are ready - initialize turn Order phase
    this.broadcastToAll(MESSAGE_GAME_LOG, {
      message: 'All Players Ready'
    });

    this.broadcastToAll(MESSAGE_GAME_LOG, {
      message: 'Starting turn order determination phase'
    });

    this.state.isGameReady = true;
    this.state.isTurnOrderPhase = true;
    this.state.currentTurn = 0;

    if (!this.state.withBots) return;

    // Game has bots
    const bots: GameBot[] = this.allBots;
    if (!bots.length) return;

    const [firstBot] = bots;
    if (firstBot.playerIndex !== 0) return;

    await this.advanceBot(firstBot);
  }

  onDispose() {
    console.info("BaseGame -> onDispose -> onDispose");
  };

  evaluateVictoryStatus() {
    Object
      .keys(this.state.players)
      .forEach(sessionId => {
        const player: Player = this.state.players[sessionId];

        if (player.victoryPoints >= 10) {
          this.broadcastToAll(MESSAGE_GAME_VICTORY, {
            playerName: player.nickname
          });
        }
      });
  }

  onPlayKnightCard(currentPlayer: Player) {
    if (currentPlayer.knights < 3) return;

    const otherPlayerKnights = Object
      .keys(this.state.players)
      .map(sessionId => {
        const player: Player = this.state.players[sessionId];
        return player.knights;
      });

    // If this player is first to reach 3 - give him hasLargestArmy, others already have false
    if (otherPlayerKnights.every(knights => knights < 3)) {
      currentPlayer.hasLargestArmy = true;
      return;
    }

    // If hasLargestArmy was already given - but this player surpassed everybody else - take away from everybody, then give to him
    if (otherPlayerKnights.every(knights => knights < currentPlayer.knights)) {
      Object
        .keys(this.state.players)
        .forEach(sessionId => {
          const player: Player = this.state.players[sessionId];
          player.hasLargestArmy = false;
        });

      currentPlayer.hasLargestArmy = true;
    }
  }
};

export default BaseGame;