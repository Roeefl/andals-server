import { ArraySchema } from '@colyseus/schema';
import { Room, Client } from 'colyseus';
import Player from '../schemas/Player';

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
  MESSAGE_TRADE_INCOMING_RESPONSE,
  MESSAGE_TRADE_ADD_CARD,
  MESSAGE_TRADE_REMOVE_CARD,
  MESSAGE_TRADE_CONFIRM,
  MESSAGE_TRADE_REFUSE
} from '../constants';

import {
  PURCHASE_ROAD,
  PURCHASE_SETTLEMENT,
  PURCHASE_GAME_CARD,
  playerColors
} from '../manifest';

const maxReconnectionTime = 1; // 60;

class GameRoom extends Room<GameState> {
  onCreate(options: any) {
    console.info("GameRoom -> onCreate -> options", options);
    const { roomTitle = 'Firstmen.io Game Room', maxPlayers = 4 } = options;

    const initialBoard = BoardManager.initialBoard();
    const initialGameCards = GameCardManager.initialGameCards();
    
    const gameState = new GameState(roomTitle, maxPlayers, initialBoard, initialGameCards);
    this.setState(gameState);
  };

  get activeClients() {
    return Object
      .keys(this.state.players)
      .length;
  }

  broadcastToAll(type: string, data: Object = {}) {
    this.broadcast({
      sender: this.state.roomTitle,
      type,
      ...data
    });
  }

  onJoin(client: Client, options: any) {
    const color = playerColors[this.activeClients];
    const addedPlayer = new Player(client.sessionId, options, color);
    
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
    // flag client as inactive for other users
    this.state.players[client.sessionId].isConnected = false;

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: this.state.roomTitle,
      message: `${this.state.players[client.sessionId].nickname || client.sessionId} has left the room.`
    }, {
      except: client
    });

    try {
      // allow disconnected client to reconnect into this room until 20 seconds
      await this.allowReconnection(client, maxReconnectionTime);
      
      // client returned! let's re-activate it.
      this.state.players[client.sessionId].isConnected = true;
    } catch (e) {
      // 20 seconds expired. let's remove the client.
      delete this.state.players[client.sessionId];
    }
  };

  onMessage(client: Client, data: any) {
    const { sessionId = '' } = client;

    const {
      type = MESSAGE_GAME_ACTION,
      message = ''
    } = data;

    const currentPlayer: Player = this.state.players[client.sessionId];

    switch (type) {
      case MESSAGE_CHAT:
        this.onChatMessage(currentPlayer.nickname ,sessionId, message);
        break;

      case MESSAGE_ROLL_DICE:
        const { dice = [3, 3] } = data;
        DiceManager.onDiceRoll(this.state, dice, currentPlayer);

        this.broadcastToAll(MESSAGE_ROLL_DICE, {
          playerName: currentPlayer.nickname,
          dice
        });
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
        const { stealFrom } = data;
        TradeManager.onStealCard(this.state, currentPlayer, stealFrom, data.resource);
        break;

      case MESSAGE_PLACE_ROAD:
        PurchaseManager.onPurchaseRoad(this.state, data, client.sessionId);
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
        PurchaseManager.onPurchaseStructure(this.state, data, client.sessionId, structureType);
        BankManager.onBankPayment(this.state, structureType);
        this.evaluateVictoryStatus();

        this.broadcastToAll(MESSAGE_GAME_LOG, {
          message: `${currentPlayer.nickname} built a ${structureType}`
        });
        break;

      case MESSAGE_PURCHASE_GAME_CARD:
        PurchaseManager.onPurchaseGameCard(this.state, client.sessionId);
        BankManager.onBankPayment(this.state, PURCHASE_GAME_CARD);
        this.evaluateVictoryStatus();

        this.broadcastToAll(MESSAGE_GAME_LOG, {
          message: `${currentPlayer.nickname} purchased a development card`
        });
        break;

      case MESSAGE_PLAY_GAME_CARD:
        const { cardType, cardIndex } = data;
        GameCardManager.playGameCard(currentPlayer, cardType, cardIndex);
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
        break;

      case MESSAGE_TRADE_WITH_BANK:
        const { requestedResource } = data;
        BankManager.returnToBank(this.state, currentPlayer.tradeCounts);
        TradeManager.onBankTrade(currentPlayer, requestedResource);
        break;
            
      case MESSAGE_TRADE_INCOMING_RESPONSE:
      case MESSAGE_TRADE_REQUEST:
      case MESSAGE_TRADE_REFUSE:
      case MESSAGE_TRADE_CONFIRM:
        const { isAgreed, withWho } = data;
        TradeManager.onStartEndTrade(this.state, type, currentPlayer, withWho, isAgreed);
        break;

      case MESSAGE_FINISH_TURN:
        TurnManager.finishTurn(this.state, currentPlayer, (broadcastType: string, broadcastMessage: string) => this.broadcastToAll(broadcastType, { message: broadcastMessage }));

        // // In case any player did not pick up his loot - give it to him - @TODO: Disabled in CustomizeRoom soon
        // Object
        //   .keys(this.state.players)
        //   .forEach(sessionId => {
        //     const player: Player = this.state.players[sessionId];

        //     this.broadcastToAll(MESSAGE_COLLECT_ALL_LOOT, {
        //       playerName: player.nickname,
        //       loot: player.availableLoot
        //     });
        //     player.onCollectLoot();
        //   });

        break;

      case MESSAGE_READY:
        this.onPlayerReady(client, currentPlayer);
        break;

      default:
        break;
    }
  };

  onChatMessage(sender: string, senderSessionId: string, message: string) {
    this.broadcastToAll(MESSAGE_CHAT, {
      sender,
      senderSessionId,
      message
    });
  }

  onPlayerReady(client: Client, player: Player) {
    player.isReady = !player.isReady;

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: this.state.roomTitle,
      message: `${player.nickname} is ${player.isReady ? '' : 'not'} ready`
    }, {
      except: client
    });

    if (this.activeClients >= this.state.maxClients) {
      const isAllReady = Object
        .values(this.state.players)
        .every(playerData => playerData.isReady);
        
      if (isAllReady) {
        this.state.isGameReady = true;
        this.state.isTurnOrderPhase = true;
        this.state.currentTurn = 0;

        this.broadcastToAll(MESSAGE_GAME_LOG, {
          message: 'All Players Ready'
        });

        this.broadcastToAll(MESSAGE_GAME_LOG, {
          message: 'Starting turn order determination phase'
        });
      }
    }
  }

  onDispose() {
    console.info("GameRoom -> onDispose -> onDispose");
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
};

export default GameRoom;
