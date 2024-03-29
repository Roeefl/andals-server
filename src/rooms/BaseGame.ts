import { Room, Client } from 'colyseus';
import Player from '../schemas/Player';
import GameBot from '../schemas/GameBot';

import GameState from '../game/GameState';
import FirstMenGameState from '../north/FirstMenGameState';
import BoardManager from '../game/BoardManager';
import PurchaseManager from '../game/PurchaseManager';
import BankManager from '../game/BankManager';
import TurnManager from '../game/TurnManager';
import GameCardManager from '../game/GameCardManager';
import TradeManager from '../game/TradeManager';
import DiceManager from '../game/DiceManager';
import WildlingManager from '../game/WildlingManager';
import HeroCardManager from '../game/HeroCardManager';

import BroadcastService from '../services/broadcast';

import {
  MESSAGE_GAME_LOG,
  MESSAGE_CHAT,
  MESSAGE_GAME_ACTION,
  MESSAGE_READY,
  MESSAGE_ROLL_DICE,
  MESSAGE_COLLECT_ALL_LOOT,
  MESSAGE_COLLECT_RESOURCE_LOOT,
  MESSAGE_DISCARD_HALF_DECK,
  MESSAGE_FINISH_TURN,
  MESSAGE_PLACE_ROAD,
  MESSAGE_REMOVE_ROAD,
  MESSAGE_PLACE_STRUCTURE,
  MESSAGE_PURCHASE_GAME_CARD,
  MESSAGE_PLAY_GAME_CARD,
  MESSAGE_SELECT_MONOPOLY_RESOURCE,
  MESSAGE_MOVE_ROBBER,
  MESSAGE_STEAL_CARD,
  MESSAGE_GAME_VICTORY,
  MESSAGE_TRADE_WITH_BANK,
  MESSAGE_TRADE_REQUEST_RESOURCE,
  MESSAGE_TRADE_REQUEST_RESOURCE_RESPOND,
  MESSAGE_TRADE_REQUEST,
  MESSAGE_TRADE_START_AGREED,
  MESSAGE_TRADE_ADD_CARD,
  MESSAGE_TRADE_REMOVE_CARD,
  MESSAGE_TRADE_AGREE,
  MESSAGE_TRADE_CONFIRM,
  MESSAGE_TRADE_REFUSE,
  MESSAGE_PLACE_GUARD,
  MESSAGE_PLAY_HERO_CARD,
  MESSAGE_SWAPPED_HERO_CARD,
} from '../constants';

import {
  baseGameManifest,
  PURCHASE_ROAD,
  PURCHASE_SETTLEMENT,
  PURCHASE_GAME_CARD,
  playerColors,
  PURCHASE_GUARD,
  PURCHASE_CITY,
  CARD_KNIGHT
} from '../manifest';

import { RoomOptions, Loot, FlexiblePurchase } from '../interfaces';
import { ROOM_TYPE_FIRST_MEN } from '../specs/roomTypes';

const maxReconnectionTime = 5 * 60;

class BaseGame extends Room<GameState> {
  broadcastService: BroadcastService
  turnManager: TurnManager
  wildlingManager: WildlingManager

  get activeClients() {
    return Object
      .keys(this.state.players)
      .length;
  }

  get allBots(): GameBot[] {
    return Object
      .values(this.state.players)
      .filter(player => player.isBot);
  }

  get currentTurnPlayer() {
    const { currentTurn } = this.state;
    return this.state.allPlayers[currentTurn];
  }

  onCreate(roomOptions: RoomOptions) {
    console.info("BaseGame | onCreate | roomOptions: ", roomOptions);

    this.setMetadata({ roomTitle: roomOptions.roomTitle });

    this.broadcastService = new BroadcastService(this, roomOptions.roomTitle);
    this.turnManager = new TurnManager(this.broadcastService);
    this.wildlingManager = new WildlingManager(this.broadcastService);

    const board = BoardManager.baseGameBoard();
    const gameCards = GameCardManager.initialShuffledDeck();
    
    const gameState = new GameState(baseGameManifest, board, gameCards, roomOptions);
    this.setState(gameState);

    this.populateWithBotsIfNeeded(roomOptions);
  };

  populateWithBotsIfNeeded(roomOptions: RoomOptions) {
    const {
      playVsBots = false,
      maxPlayers = 4
    } = roomOptions;

    if (!playVsBots) return;

    for (let b = 1; b < maxPlayers; b++) {
      const color = playerColors[this.activeClients];
      const addedBot = new GameBot(color, this.activeClients);
      
      this.state.players[addedBot.playerSessionId] = addedBot;
      this.onPlayerReady(addedBot);
    }

    this.lock();
  }

  onJoin(client: Client, options: any) {
    this.onPlayerJoin(client.sessionId, options)
  }
  
  onPlayerJoin(clientSessionId: string, options: any) {
    const color = options.color || playerColors[this.activeClients];
    const addedPlayer = new Player(clientSessionId, options, color, this.activeClients, this.state.manifest.bankTradeRate);
    this.state.players[clientSessionId] = addedPlayer;
  
    this.broadcastService.broadcast(MESSAGE_GAME_LOG, {
      sender: this.state.roomTitle,
      message: `${addedPlayer.nickname || clientSessionId} has joined the room.`
    });

    if (this.activeClients >= this.state.maxClients)
      this.lock();
  };

  async onLeave(client: Client, isConsented: boolean) {
    if (this.activeClients < this.state.maxClients)
      this.unlock();

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
          nickname: currentPlayer.nickname,
          avatar: currentPlayer.avatar
        };
        
        this.state.players[client.sessionId] = new Player(replacementBot.playerSessionId, options, replacementBot.color, replacementBot.playerIndex, this.state.manifest.bankTradeRate);
        this.state.players[client.sessionId].restore(replacementBot);
      } else {
        this.state.players[client.sessionId].isConnected = true;
        
        this.broadcast({
          type: MESSAGE_GAME_LOG,
          sender: this.state.roomTitle,
          message: `${currentPlayer.nickname || client.sessionId} has reconnected!`
        }, {
          except: client
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
        const { dice = [3, 3, 10] } = data;
        const isRobbing = DiceManager.onDiceRoll(this.state, dice, currentPlayer);

        this.broadcastService.broadcast(MESSAGE_ROLL_DICE, {
          senderSessionId: currentPlayer.playerSessionId,
          playerName: currentPlayer.nickname,
          playerColor: currentPlayer.color,
          dice
        }, (this.state.isGameStarted && dice.length >=2 && (dice[0] + dice[1] === 7)));
        
        if (this.state.isGameStarted)
          this.allBotsCollectLoot();

        if (isRobbing)
          this.allBotsRobbed();
        break;

      case MESSAGE_COLLECT_ALL_LOOT:
        this.broadcastService.broadcast(MESSAGE_COLLECT_ALL_LOOT, {
          playerSessionId: currentPlayer.playerSessionId,
          playerName: currentPlayer.nickname,
          playerColor: currentPlayer.color,
          loot: currentPlayer.availableLoot
        });

        currentPlayer.onCollectLoot();
        break;

      case MESSAGE_COLLECT_RESOURCE_LOOT:
        this.broadcastService.broadcast(MESSAGE_COLLECT_RESOURCE_LOOT, {
          playerSessionId: currentPlayer.playerSessionId,
          playerName: currentPlayer.nickname,
          playerColor: currentPlayer.color,
          resource: data.resource
        });

        currentPlayer.onCollectSingleResoruceLoot(data.resource);
        break;

      case MESSAGE_DISCARD_HALF_DECK:
        const { discardedCounts = {} } = data;

        this.broadcastService.broadcast(MESSAGE_DISCARD_HALF_DECK, {
          playerName: currentPlayer.nickname,
          playerColor: currentPlayer.color,
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
        
        if (currentPlayer.activeGameCard === CARD_KNIGHT)
          currentPlayer.activeGameCard = null;

        this.broadcastService.broadcast(MESSAGE_GAME_LOG, {
          message: `${currentPlayer.nickname} has moved the Robber`
        });

        const allowStealingFrom: string[] = BoardManager.robberAdjacentPlayers(this.state);
        TradeManager.allowStealingFrom(this.state, currentPlayer, allowStealingFrom);
        break;

      case MESSAGE_STEAL_CARD:
        const stolenResource = TradeManager.onStealCard(this.state, currentPlayer, data.stealFrom, data.resource);

        if (!data.giveBack) {
          const stoleFrom = this.state.players[data.stealFrom];
          
          if (stoleFrom) {
            this.broadcastService.broadcast(MESSAGE_STEAL_CARD, {
              playerSessionId: currentPlayer.playerSessionId,
              playerName: currentPlayer.nickname,
              playerColor: currentPlayer.color,
              stoleFrom: stoleFrom.nickname,
              stolenResource
            });
          }
        }
        break;

      case MESSAGE_PLACE_ROAD:
        PurchaseManager.onPurchaseRoad(this.state, data, currentPlayer.playerSessionId);
        
        if (!currentPlayer.allowFreeRoads) {
          BankManager.onBankPayment(this.state, PURCHASE_ROAD);
        }
        else {
          currentPlayer.allowFreeRoads--;
          
          if (currentPlayer.allowFreeRoads === 0)
            currentPlayer.activeGameCard = null;
        }

        this.broadcastService.broadcast(MESSAGE_PLACE_STRUCTURE, {
          playerName: currentPlayer.nickname,
          message: 'has built a road',
          playerColor: currentPlayer.color
        });
        break;

      case MESSAGE_REMOVE_ROAD:
        PurchaseManager.onRemoveRoad(this.state, data, currentPlayer.playerSessionId);

        this.broadcastService.broadcast(MESSAGE_PLACE_STRUCTURE, {
          playerName: currentPlayer.nickname,
          message: 'has removed a road'
        });

        currentPlayer.allowRemoveRoad = false;
        break;

      case MESSAGE_PLACE_STRUCTURE:
        const { structureType = PURCHASE_SETTLEMENT } = data;
        PurchaseManager.onPurchaseStructure(this.state, data, currentPlayer.playerSessionId, structureType);
        BankManager.onBankPayment(this.state, structureType);
        this.evaluateVictoryStatus();

        currentPlayer.flexiblePurchase = null;

        this.broadcastService.broadcast(MESSAGE_PLACE_STRUCTURE, {
          playerName: currentPlayer.nickname,
          message: `has built a ${structureType}`,
          playerColor: currentPlayer.color,
          notify: `${structureType}Placed`
        }, this.state.isGameStarted);
        break;

      case MESSAGE_PURCHASE_GAME_CARD:
        const { selectedCardIndex } = data;

        PurchaseManager.onPurchaseGameCard(this.state, currentPlayer.playerSessionId, selectedCardIndex);
        BankManager.onBankPayment(this.state, PURCHASE_GAME_CARD);

        this.evaluateVictoryStatus();

        this.broadcastService.broadcast(MESSAGE_GAME_LOG, {
          message: `${currentPlayer.nickname} purchased a development card`
        }, this.state.isGameStarted);

        break;

      case MESSAGE_PLAY_GAME_CARD:
        const { cardType, cardIndex } = data;
        console.log("onGameAction -> MESSAGE_PLAY_GAME_CARD", cardType, cardIndex)

        GameCardManager.playGameCard(currentPlayer, cardType, cardIndex);

        if (cardType === CARD_KNIGHT)
          this.onPlayKnightCard(currentPlayer);
        
        this.evaluateVictoryStatus();

        this.broadcastService.broadcast(MESSAGE_PLAY_GAME_CARD, {
          playerName: currentPlayer.nickname,
          playerColor: currentPlayer.color,
          cardType
        }, true);

        break;

      case MESSAGE_SELECT_MONOPOLY_RESOURCE:
        currentPlayer.isDeclaringMonopoly = false;
        currentPlayer.activeGameCard = null;

        const { selectedResource } = data;
        TradeManager.onMonopoly(this.state, currentPlayer, selectedResource);
        break;
        
      case MESSAGE_TRADE_ADD_CARD:
      case MESSAGE_TRADE_REMOVE_CARD:
        const { resource } = data;
        TradeManager.onUpdateTrade(this.state, currentPlayer, resource, type === MESSAGE_TRADE_REMOVE_CARD);
        
        if (currentPlayer.tradingWith)
          this.botsAdjustTrade(currentPlayer, currentPlayer.tradingWith, type);

        break;

      case MESSAGE_TRADE_WITH_BANK:
      case MESSAGE_TRADE_REQUEST_RESOURCE:
        const { requestedResource } = data;

        if (type === MESSAGE_TRADE_WITH_BANK) {
          BankManager.returnToBank(this.state, currentPlayer.tradeCounts);
          TradeManager.onBankTrade(currentPlayer, requestedResource);
        }

        if (type === MESSAGE_TRADE_REQUEST_RESOURCE) {
          if (currentPlayer.tradingWith) {
            currentPlayer.requestingResource = requestedResource;
            break;
          }

          this.broadcastService.broadcast(MESSAGE_TRADE_REQUEST_RESOURCE, {
            sender: currentPlayer.nickname,
            senderSessionId: currentPlayer.playerSessionId,
            requestedResource
          });

          this.onBotsRespondToTradeRequest(requestedResource);
        }
        break;

      case MESSAGE_TRADE_REQUEST_RESOURCE_RESPOND:
        const { offeredResource } = data;
        
        if (data.isAgreed) {
          TradeManager.facilitateTrade(currentPlayer, this.currentTurnPlayer, true, offeredResource);

          this.broadcastService.broadcast(MESSAGE_TRADE_REQUEST_RESOURCE_RESPOND, {
            isTradeStarted: true
          });
        } else {
          this.broadcastService.broadcast(MESSAGE_TRADE_REQUEST_RESOURCE_RESPOND, {
            whoRefused: currentPlayer.playerSessionId
          });
        }
        break;
            
      case MESSAGE_TRADE_REQUEST:
      case MESSAGE_TRADE_START_AGREED:
      case MESSAGE_TRADE_REFUSE:
      case MESSAGE_TRADE_CONFIRM:
      case MESSAGE_TRADE_AGREE:
        const { isAgreed, withWho } = data;

        if (type === MESSAGE_TRADE_CONFIRM) {
          const otherPlayer: Player = this.state.players[currentPlayer.tradingWith];

          this.broadcastService.broadcast(MESSAGE_TRADE_CONFIRM, {
            player1: currentPlayer.nickname,
            player2: otherPlayer.nickname
          }, true);
        }

        TradeManager.onStartEndTrade(this.state, type, currentPlayer, withWho, isAgreed);

        if (type === MESSAGE_TRADE_REQUEST && withWho) {
          const maybeBot: Player = this.state.players[withWho];

          if (maybeBot.isBot)
           this.onGameAction(maybeBot, MESSAGE_TRADE_START_AGREED, { isAgreed: true });
        }
        break;

      case MESSAGE_FINISH_TURN:
        this.turnManager.finishTurn(this.state, currentPlayer);
        
        if (this.currentTurnPlayer.isBot) {
          await this.advanceBot(this.currentTurnPlayer as GameBot);
        }
        break;

      case MESSAGE_PLACE_GUARD:
        const {
          section = 0,
          position = 0,
          swapWhich,
          swapWith
        } = data;

        this.onGuardPurchase(currentPlayer, section, position, { swapWhich, swapWith });
        currentPlayer.flexiblePurchase = null;
        break;

      case MESSAGE_READY:
        this.onPlayerReady(currentPlayer);
        break;

      default:
        break;
    }
  }

  onBotsRespondToTradeRequest(requestedResource: string) {
    const botWithRequestedResource: GameBot = this.allBots.find(bot => bot.resourceCounts[requestedResource] > 0);
    
    if (botWithRequestedResource) {
      this.onGameAction(botWithRequestedResource, MESSAGE_TRADE_REQUEST_RESOURCE_RESPOND, { offeredResource: requestedResource, isAgreed: true });
    }

    // === Other bots ===

    const botsWithoutRequestedResource: GameBot[] = this.allBots.filter(bot => !bot.resourceCounts[requestedResource]);

    botsWithoutRequestedResource.forEach(bot => {
      this.onGameAction(bot, MESSAGE_TRADE_REQUEST_RESOURCE_RESPOND, { isAgreed: false });
    })
  }

  onGuardPurchase(currentPlayer: Player, section: number, position: number, flexiblePurchase: FlexiblePurchase) {
    PurchaseManager.onPurchaseGuard(this.state as FirstMenGameState, currentPlayer.playerSessionId, section, position, flexiblePurchase, currentPlayer.allowFreeGuard);

    if (!currentPlayer.allowFreeGuard)
      BankManager.onBankPayment(this.state, PURCHASE_GUARD, flexiblePurchase);

    this.evaluateVictoryStatus();
  
    this.broadcastService.broadcast(MESSAGE_PLACE_GUARD, {
      message: `${currentPlayer.nickname} has placed a Guard on the wall`
    });

    currentPlayer.allowFreeGuard = false;
  }

  async advanceBot(currentBot: GameBot) {
    if (!currentBot.isBot) return;

    /** TURN ORDER PHASE */
    if (this.state.isTurnOrderPhase) {
      const botDice: number[] = await GameBot.rollDice(this.state.roomType);
      this.onGameAction(currentBot, MESSAGE_ROLL_DICE, { dice: botDice });

      this.onGameAction(currentBot, MESSAGE_FINISH_TURN);
      return;
    }
    
    /** SETUP PHASE */
    if (this.state.isSetupPhase) {
      if (this.state.setupPhaseTurns > this.state.maxClients * 2 - 1) {
        // in Guard placement round
        const guard = await GameBot.validGuard(this.state as FirstMenGameState, currentBot);
        
        this.onGameAction(currentBot, MESSAGE_PLACE_GUARD, guard);
        this.onGameAction(currentBot, MESSAGE_FINISH_TURN);

        return;
      }

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

    while (currentBot.tradingWith) {
      await currentBot.think(1500);
    }

    /** REGULAR TURN */
    await currentBot.think(1000);

    const botDice: number[] = await GameBot.rollDice(this.state.roomType);
    this.onGameAction(currentBot, MESSAGE_ROLL_DICE, { dice: botDice });
    
    const wildlingDice: number = botDice[2];
    this.wildlingManager.wildlingsAdvance(this.state as FirstMenGameState, wildlingDice);

    await currentBot.think(1000);

    /** Do not advance as long as any other player still has not discarded his deck (on robber) */
    const otherPlayers: Player[] = this.state.otherPlayers(currentBot);
    let anyPlayerStillDiscarding = otherPlayers.some(player => player.mustDiscardHalfDeck);
    while (anyPlayerStillDiscarding) {
      await currentBot.think(2000);
      anyPlayerStillDiscarding = otherPlayers.some(player => player.mustDiscardHalfDeck);
    }

    /** FORCED GAME ACTIONS */
    if (currentBot.mustMoveRobber) {
      await currentBot.think(1000);
      const tile = await GameBot.desiredRobberTile(this.state, currentBot.playerSessionId);
      this.onGameAction(currentBot, MESSAGE_MOVE_ROBBER, { tile });
    }

    if (currentBot.mustDiscardHalfDeck) {
      await currentBot.think(1000);
      const discardedCounts: Loot = currentBot.discardedCounts();
      this.onGameAction(currentBot, MESSAGE_DISCARD_HALF_DECK, { discardedCounts });
    }
  
    if (currentBot.allowStealingFrom.length) {
      await currentBot.think(1000);
      const stealData = currentBot.stealCard(this.state);
      
      if (stealData)
        this.onGameAction(currentBot, MESSAGE_STEAL_CARD, stealData);
    }

    /** HERO CARD CHECK */
    if (currentBot.currentHeroCard.wasPlayed) {
      HeroCardManager.swapPlayerHeroCard(this.state as FirstMenGameState, currentBot);
      
      this.broadcastService.broadcast(MESSAGE_SWAPPED_HERO_CARD, {
        playerName: currentBot.nickname,
        playerColor: currentBot.color,
        newHeroCardType: currentBot.currentHeroCard.type
      });
      
      this.wildlingManager.onTokensRevealed(this.state as FirstMenGameState, 1);
    }

    /** PURCHASEABLES IN PRIORITY ORDER */
    if (currentBot.hasResources.city) {
      const city = await GameBot.validCity(this.state, currentBot.playerSessionId);

      if (city) {
        this.onGameAction(currentBot, MESSAGE_PLACE_STRUCTURE, city);

        if (this.state.isGameStarted && this.state.roomType === ROOM_TYPE_FIRST_MEN)
          this.wildlingManager.onBotPurchase(this.state as FirstMenGameState, PURCHASE_CITY);
      }
    }

    if (currentBot.hasResources.settlement) {
      const settlement = await GameBot.validSettlement(this.state, currentBot.playerSessionId);

      if (settlement) {
        this.onGameAction(currentBot, MESSAGE_PLACE_STRUCTURE, settlement);

        if (this.state.isGameStarted && this.state.roomType === ROOM_TYPE_FIRST_MEN)
        this.wildlingManager.onBotPurchase(this.state as FirstMenGameState, PURCHASE_SETTLEMENT);
      }
    }

    if (currentBot.hasResources.guard) {
      const guard = await GameBot.validGuard(this.state as FirstMenGameState, currentBot);

      if (guard)
        this.onGameAction(currentBot, MESSAGE_PLACE_GUARD, guard);
    }

    if (currentBot.hasResources.gameCard) {
      this.onGameAction(currentBot, MESSAGE_PURCHASE_GAME_CARD);

      if (this.state.isGameStarted && this.state.roomType === ROOM_TYPE_FIRST_MEN)
      this.wildlingManager.onBotPurchase(this.state as FirstMenGameState, PURCHASE_GAME_CARD);
    }

    if (currentBot.hasResources.road) {
      const road = await GameBot.validRoad(this.state, currentBot);
      if (road)
        this.onGameAction(currentBot, MESSAGE_PLACE_ROAD, road);
    }

    if (!currentBot.hasPlayedHeroCard) {
      const shouldPlayHero = Math.floor(Math.random() * 4);

      if (shouldPlayHero === 0)
        this.onBotPlayHeroCard(currentBot);
    }

    // const missingResourceForPurchase = currentBot.missingResourceForPurchase();
    // if (missingResourceForPurchase) {
    //   this.onGameAction(currentBot, MESSAGE_TRADE_REQUEST_RESOURCE, { requestedResource: missingResourceForPurchase.missingResource });
    //   this.advanceBot(currentBot);
    // }

    this.onGameAction(currentBot, MESSAGE_FINISH_TURN);
  }

  onBotPlayHeroCard(currentBot: GameBot) {
    const { type: heroType } = currentBot.currentHeroCard;

    this.broadcastService.broadcast(MESSAGE_PLAY_HERO_CARD, {
      playerName: currentBot.nickname,
      playerColor: currentBot.color,
      heroCardType: currentBot.currentHeroCard.type
    }, true);
    
    HeroCardManager.playHeroCard(this.state as FirstMenGameState, currentBot, heroType);
  }

  allBotsCollectLoot() {
    this.allBots
      .filter(bot => bot.totalAvailableLoot > 0)
      .forEach(bot => this.onGameAction(bot, MESSAGE_COLLECT_ALL_LOOT));
  }

  allBotsRobbed() {
    console.log("allBotsRobbed -> allBotsRobbed")
    this.allBots
      .filter(bot => bot.totalResourceCounts > 7)
      .forEach(currentBot => {
        console.log("allBotsRobbed -> currentBot", currentBot.totalResourceCounts)
        const discardedCounts: Loot = currentBot.discardedCounts();
        this.onGameAction(currentBot, MESSAGE_DISCARD_HALF_DECK, { discardedCounts });
      });
  }

  async botsAdjustTrade(tradingPlayer: Player, tradingWith: string, type: string) {
    const tradingBot: GameBot = this.state.players[tradingWith];
    if (!tradingBot.isBot) return;

    if (tradingPlayer.totalTradeCounts === tradingBot.totalTradeCounts) {
      this.onGameAction(tradingBot, MESSAGE_TRADE_AGREE);
      return;
    };

    const selectedResource = type === MESSAGE_TRADE_ADD_CARD
      ? await tradingBot.bestAddedTradeResource()
      : await tradingBot.bestRemovedTradeResource();
      
    if (!selectedResource) return;
    
    this.onGameAction(tradingBot, type, selectedResource);
    this.onGameAction(tradingBot, MESSAGE_TRADE_AGREE);
  }

  onChatMessage(sender: Player, message: string) {
    this.broadcastService.broadcast(MESSAGE_CHAT, {
      sender: sender.nickname,
      senderSessionId: sender.playerSessionId,
      message
    });
  }

  async onPlayerReady(player: Player) {
    player.isReady = !player.isReady;

    this.broadcastService.broadcast(MESSAGE_GAME_LOG, {
      sender: this.state.roomTitle,
      message: `${player.nickname} is ${player.isReady ? '' : 'not'} ready`
    });

    if (this.activeClients < this.state.maxClients) return;

    const isAllReady = Object
      .values(this.state.players)
      .every(playerData => playerData.isReady);
      
    if (!isAllReady) return;

    // All players are ready - initialize turn Order phase
    this.broadcastService.broadcast(MESSAGE_GAME_LOG, {
      message: 'All Players Ready'
    });

    this.broadcastService.broadcast(MESSAGE_GAME_LOG, {
      message: 'Starting turn order phase',
      notify: 'isTurnOrder'
    }, true);

    this.state.isGameReady = true;
    this.state.isTurnOrderPhase = true;
    this.state.currentTurn = 0;

    if (!this.state.withBots) return;

    // Game has bots
    if (!this.allBots.length) return;

    const [firstBot] = this.allBots;
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
          this.broadcastService.broadcast(MESSAGE_GAME_VICTORY, {
            playerName: player.nickname,
            playerColor: player.color,
          }, true);

          this.state.isVictory = true;
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
