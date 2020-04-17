"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
const colyseus_1 = require("colyseus");
const Player_1 = __importDefault(require("../schemas/Player"));
const GameBot_1 = __importDefault(require("../schemas/GameBot"));
const GameState_1 = __importDefault(require("../game/GameState"));
const BoardManager_1 = __importDefault(require("../game/BoardManager"));
const PurchaseManager_1 = __importDefault(require("../game/PurchaseManager"));
const BankManager_1 = __importDefault(require("../game/BankManager"));
const TurnManager_1 = __importDefault(require("../game/TurnManager"));
const GameCardManager_1 = __importDefault(require("../game/GameCardManager"));
const TradeManager_1 = __importDefault(require("../game/TradeManager"));
const DiceManager_1 = __importDefault(require("../game/DiceManager"));
const constants_1 = require("../constants");
const manifest_1 = require("../manifest");
const maxReconnectionTime = 5 * 60;
class BaseGame extends colyseus_1.Room {
    get activeClients() {
        return Object
            .keys(this.state.players)
            .length;
    }
    get allPlayers() {
        const players = Object.values(this.state.players);
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
    onCreate(roomOptions) {
        console.info("BaseGame | onCreate | roomOptions: ", roomOptions);
        const board = BoardManager_1.default.baseGameBoard();
        const gameCards = GameCardManager_1.default.shuffled();
        const gameState = new GameState_1.default(manifest_1.baseGameManifest, board, gameCards, roomOptions);
        this.setState(gameState);
        this.populateWithBotsIfNeeded(roomOptions);
    }
    ;
    populateWithBotsIfNeeded(roomOptions) {
        const { playVsBots = false, maxPlayers = 4 } = roomOptions;
        if (!playVsBots)
            return;
        for (let b = 1; b < maxPlayers; b++) {
            const color = manifest_1.playerColors[this.activeClients];
            const addedBot = new GameBot_1.default(color, this.activeClients);
            this.state.players[addedBot.playerSessionId] = addedBot;
            this.onPlayerReady(addedBot);
        }
        this.lock();
    }
    broadcastToAll(type, data = {}) {
        this.broadcast(Object.assign({ sender: this.state.roomTitle, type }, data));
    }
    onJoin(client, options) {
        const color = manifest_1.playerColors[this.activeClients];
        const addedPlayer = new Player_1.default(client.sessionId, options, color, this.activeClients);
        this.state.players[client.sessionId] = addedPlayer;
        this.broadcast({
            type: constants_1.MESSAGE_GAME_LOG,
            sender: this.state.roomTitle,
            message: `${addedPlayer.nickname || client.sessionId} has joined the room.`
        }, {
            except: client
        });
        if (this.activeClients >= this.state.maxClients)
            this.lock();
    }
    ;
    onLeave(client, isConsented) {
        return __awaiter(this, void 0, void 0, function* () {
            const { enableBotReplacement } = this.state;
            // flag client as inactive for other users
            const currentPlayer = this.state.players[client.sessionId];
            currentPlayer.isConnected = false;
            this.broadcast({
                type: constants_1.MESSAGE_GAME_LOG,
                sender: this.state.roomTitle,
                message: `${currentPlayer.nickname || client.sessionId} has left the room and is replaced by a bot.`
            }, {
                except: client
            });
            const replacementBot = new GameBot_1.default('', 0, currentPlayer);
            if (enableBotReplacement) {
                this.state.players[client.sessionId] = replacementBot;
                if (replacementBot.playerIndex === this.state.currentTurn)
                    this.advanceBot(replacementBot);
            }
            try {
                // allow disconnected client to reconnect into this room 
                yield this.allowReconnection(client, maxReconnectionTime);
                // client returned! let's re-activate it.
                if (enableBotReplacement) {
                    const options = {
                        nickname: currentPlayer.nickname
                    };
                    this.state.players[client.sessionId] = new Player_1.default(replacementBot.playerSessionId, options, replacementBot.color, replacementBot.playerIndex);
                    this.state.players[client.sessionId].restore(replacementBot);
                }
                else {
                    this.state.players[client.sessionId].isConnected = true;
                    this.broadcast({
                        type: constants_1.MESSAGE_GAME_LOG,
                        sender: this.state.roomTitle,
                        message: `${currentPlayer.nickname || client.sessionId} has reconnected!`
                    });
                }
            }
            catch (e) {
                if (enableBotReplacement)
                    // Final rename to a full bot name...
                    replacementBot.nickname = GameBot_1.default.generateName();
                else
                    // 20 seconds expired. let's remove the client.
                    delete this.state.players[client.sessionId];
            }
            finally {
                if (enableBotReplacement)
                    replacementBot.nickname = GameBot_1.default.generateName();
                else
                    delete this.state.players[client.sessionId];
            }
        });
    }
    ;
    onMessage(client, data) {
        const { type = constants_1.MESSAGE_GAME_ACTION } = data;
        const currentPlayer = this.state.players[client.sessionId];
        this.onGameAction(currentPlayer, type, data);
    }
    ;
    onGameAction(currentPlayer, type, data = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (type) {
                case constants_1.MESSAGE_CHAT:
                    const { message = ' ' } = data;
                    this.onChatMessage(currentPlayer, message);
                    break;
                case constants_1.MESSAGE_ROLL_DICE:
                    const { dice = [3, 3] } = data;
                    DiceManager_1.default.onDiceRoll(this.state, dice, currentPlayer);
                    this.broadcastToAll(constants_1.MESSAGE_ROLL_DICE, {
                        playerName: currentPlayer.nickname,
                        dice
                    });
                    if (this.state.isGameStarted)
                        this.allBotsCollectLoot();
                    break;
                case constants_1.MESSAGE_COLLECT_ALL_LOOT:
                    this.broadcastToAll(constants_1.MESSAGE_COLLECT_ALL_LOOT, {
                        playerName: currentPlayer.nickname,
                        loot: currentPlayer.availableLoot
                    });
                    BankManager_1.default.onPlayerCollectAllLoot(currentPlayer);
                    break;
                case constants_1.MESSAGE_DISCARD_HALF_DECK:
                    const { discardedCounts = {} } = data;
                    this.broadcastToAll(constants_1.MESSAGE_DISCARD_HALF_DECK, {
                        playerName: currentPlayer.nickname,
                        discardedCounts
                    });
                    currentPlayer.discardResources(discardedCounts);
                    currentPlayer.mustDiscardHalfDeck = false;
                    BankManager_1.default.returnToBank(this.state, discardedCounts);
                    break;
                case constants_1.MESSAGE_MOVE_ROBBER:
                    const { tile = 0 } = data;
                    this.state.robberPosition = tile;
                    currentPlayer.mustMoveRobber = false;
                    const allowStealingFrom = BoardManager_1.default.robberAdjacentPlayers(this.state);
                    currentPlayer.allowStealingFrom = new schema_1.ArraySchema(...allowStealingFrom);
                    break;
                case constants_1.MESSAGE_STEAL_CARD:
                    TradeManager_1.default.onStealCard(this.state, currentPlayer, data.stealFrom, data.resource);
                    break;
                case constants_1.MESSAGE_PLACE_ROAD:
                    PurchaseManager_1.default.onPurchaseRoad(this.state, data, currentPlayer.playerSessionId);
                    BankManager_1.default.onBankPayment(this.state, manifest_1.PURCHASE_ROAD);
                    if (currentPlayer.roadBuildingPhase > 0) {
                        currentPlayer.advanceRoadBuildingPhase();
                    }
                    this.broadcastToAll(constants_1.MESSAGE_GAME_LOG, {
                        message: `${currentPlayer.nickname} built a road`
                    });
                    break;
                case constants_1.MESSAGE_PLACE_STRUCTURE:
                    const { structureType = manifest_1.PURCHASE_SETTLEMENT } = data;
                    PurchaseManager_1.default.onPurchaseStructure(this.state, data, currentPlayer.playerSessionId, structureType);
                    BankManager_1.default.onBankPayment(this.state, structureType);
                    this.evaluateVictoryStatus();
                    this.broadcastToAll(constants_1.MESSAGE_GAME_LOG, {
                        message: `${currentPlayer.nickname} built a ${structureType}`
                    });
                    break;
                case constants_1.MESSAGE_PLACE_GUARD:
                    this.broadcastToAll(constants_1.MESSAGE_GAME_LOG, {
                        message: `${currentPlayer.nickname} placed a Guard`
                    });
                    break;
                case constants_1.MESSAGE_PURCHASE_GAME_CARD:
                    PurchaseManager_1.default.onPurchaseGameCard(this.state, currentPlayer.playerSessionId);
                    BankManager_1.default.onBankPayment(this.state, manifest_1.PURCHASE_GAME_CARD);
                    this.evaluateVictoryStatus();
                    this.broadcastToAll(constants_1.MESSAGE_GAME_LOG, {
                        message: `${currentPlayer.nickname} purchased a development card`
                    });
                    break;
                case constants_1.MESSAGE_PLAY_GAME_CARD:
                    const { cardType, cardIndex } = data;
                    GameCardManager_1.default.playGameCard(currentPlayer, cardType, cardIndex);
                    this.onPlayKnightCard(currentPlayer);
                    this.evaluateVictoryStatus();
                    break;
                case constants_1.MESSAGE_SELECT_MONOPOLY_RESOURCE:
                    currentPlayer.isDeclaringMonopoly = false;
                    const { selectedResource } = data;
                    TradeManager_1.default.onMonopoly(this.state, currentPlayer, selectedResource);
                    break;
                case constants_1.MESSAGE_TRADE_ADD_CARD:
                case constants_1.MESSAGE_TRADE_REMOVE_CARD:
                    const { resource } = data;
                    TradeManager_1.default.onUpdateTrade(this.state, currentPlayer, resource, type === constants_1.MESSAGE_TRADE_REMOVE_CARD);
                    if (currentPlayer.tradingWith)
                        this.botsAdjustTrade(currentPlayer.tradingWith, type);
                    break;
                case constants_1.MESSAGE_TRADE_WITH_BANK:
                    const { requestedResource } = data;
                    BankManager_1.default.returnToBank(this.state, currentPlayer.tradeCounts);
                    TradeManager_1.default.onBankTrade(currentPlayer, requestedResource);
                    break;
                case constants_1.MESSAGE_TRADE_REQUEST:
                case constants_1.MESSAGE_TRADE_START_AGREED:
                case constants_1.MESSAGE_TRADE_REFUSE:
                case constants_1.MESSAGE_TRADE_CONFIRM:
                    const { isAgreed, withWho } = data;
                    TradeManager_1.default.onStartEndTrade(this.state, type, currentPlayer, withWho, isAgreed);
                    if (type === constants_1.MESSAGE_TRADE_REQUEST && withWho) {
                        const maybeBot = this.state.players[withWho];
                        if (maybeBot.isBot)
                            this.onGameAction(maybeBot, constants_1.MESSAGE_TRADE_START_AGREED, { isAgreed: true });
                    }
                    break;
                case constants_1.MESSAGE_FINISH_TURN:
                    TurnManager_1.default.finishTurn(this.state, currentPlayer, (broadcastType, broadcastMessage) => this.broadcastToAll(broadcastType, { message: broadcastMessage }));
                    yield this.advanceBot(this.currentPlayer);
                    // In case any player did not pick up his loot - give it to him 
                    if (this.state.autoPickupEnabled)
                        this.autoPickupLoot();
                    break;
                case constants_1.MESSAGE_READY:
                    this.onPlayerReady(currentPlayer);
                    break;
                default:
                    break;
            }
        });
    }
    autoPickupLoot() {
        this.allPlayers
            .filter(player => player.totalAvailableLoot > 0)
            .forEach(player => {
            this.broadcastToAll(constants_1.MESSAGE_COLLECT_ALL_LOOT, {
                playerName: player.nickname,
                loot: player.availableLoot
            });
            player.onCollectLoot();
        });
    }
    advanceBot(currentBot) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!currentBot.isBot)
                return;
            if (this.state.isTurnOrderPhase) {
                const botDice = yield GameBot_1.default.rollDice();
                this.onGameAction(currentBot, constants_1.MESSAGE_ROLL_DICE, { dice: botDice });
                this.onGameAction(currentBot, constants_1.MESSAGE_FINISH_TURN);
                return;
            }
            if (this.state.isSetupPhase) {
                const settlement = yield GameBot_1.default.validSettlement(this.state, currentBot.playerSessionId);
                this.onGameAction(currentBot, constants_1.MESSAGE_PLACE_STRUCTURE, settlement);
                const road = yield GameBot_1.default.validRoad(this.state, currentBot);
                this.onGameAction(currentBot, constants_1.MESSAGE_PLACE_ROAD, road);
                this.onGameAction(currentBot, constants_1.MESSAGE_FINISH_TURN);
                // end of setup phase - all bots need to collect game-starting loot
                // if (this.state.setupPhaseTurns === this.state.maxClients * 2 - 1) {
                //   this.allBotsCollectLoot();
                // }
                return;
            }
            const botDice = yield GameBot_1.default.rollDice();
            this.onGameAction(currentBot, constants_1.MESSAGE_ROLL_DICE, { dice: botDice });
            if (currentBot.mustMoveRobber) {
                const tile = yield GameBot_1.default.desiredRobberTile(this.state, currentBot.playerSessionId);
                this.onGameAction(currentBot, constants_1.MESSAGE_MOVE_ROBBER, { tile });
            }
            if (currentBot.mustDiscardHalfDeck) {
                const discardedCounts = currentBot.discardedCounts();
                this.onGameAction(currentBot, constants_1.MESSAGE_DISCARD_HALF_DECK, { discardedCounts });
            }
            if (currentBot.allowStealingFrom.length) {
                const stealData = currentBot.stealCard(this.state);
                this.onGameAction(currentBot, constants_1.MESSAGE_STEAL_CARD, stealData);
            }
            if (currentBot.hasResources.guard) {
                const guard = yield GameBot_1.default.validGuard(this.state, currentBot.playerSessionId);
                if (guard)
                    this.onGameAction(currentBot, constants_1.MESSAGE_PLACE_GUARD, guard);
            }
            if (currentBot.hasResources.city) {
                const city = yield GameBot_1.default.validCity(this.state, currentBot.playerSessionId);
                if (city)
                    this.onGameAction(currentBot, constants_1.MESSAGE_PLACE_STRUCTURE, city);
            }
            if (currentBot.hasResources.gameCard) {
                this.onGameAction(currentBot, constants_1.MESSAGE_PURCHASE_GAME_CARD);
            }
            if (currentBot.hasResources.settlement) {
                const settlement = yield GameBot_1.default.validSettlement(this.state, currentBot.playerSessionId);
                if (settlement)
                    this.onGameAction(currentBot, constants_1.MESSAGE_PLACE_STRUCTURE, settlement);
            }
            if (currentBot.hasResources.road) {
                const road = yield GameBot_1.default.validRoad(this.state, currentBot);
                if (road)
                    this.onGameAction(currentBot, constants_1.MESSAGE_PLACE_ROAD, road);
            }
            this.onGameAction(currentBot, constants_1.MESSAGE_FINISH_TURN);
        });
    }
    allBotsCollectLoot() {
        const allBots = this.allBots;
        allBots
            .filter(bot => bot.totalAvailableLoot > 0)
            .forEach(bot => this.onGameAction(bot, constants_1.MESSAGE_COLLECT_ALL_LOOT));
    }
    botsAdjustTrade(tradingWith, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradingBot = this.state.players[tradingWith];
            if (!tradingBot.isBot)
                return;
            const selectedResource = type === constants_1.MESSAGE_TRADE_ADD_CARD
                ? yield tradingBot.bestAddedTradeResource()
                : yield tradingBot.bestRemovedTradeResource();
            if (!selectedResource)
                return;
            this.onGameAction(tradingBot, type, selectedResource);
            this.onGameAction(tradingBot, constants_1.MESSAGE_TRADE_CONFIRM);
        });
    }
    onChatMessage(sender, message) {
        this.broadcastToAll(constants_1.MESSAGE_CHAT, {
            sender: sender.nickname,
            senderSessionId: sender.playerSessionId,
            message
        });
    }
    onPlayerReady(player) {
        return __awaiter(this, void 0, void 0, function* () {
            player.isReady = !player.isReady;
            this.broadcast({
                type: constants_1.MESSAGE_GAME_LOG,
                sender: this.state.roomTitle,
                message: `${player.nickname} is ${player.isReady ? '' : 'not'} ready`
            });
            // }, {
            // except: client
            // });
            if (this.activeClients < this.state.maxClients)
                return;
            const isAllReady = Object
                .values(this.state.players)
                .every(playerData => playerData.isReady);
            if (!isAllReady)
                return;
            // All players are ready - initialize turn Order phase
            this.broadcastToAll(constants_1.MESSAGE_GAME_LOG, {
                message: 'All Players Ready'
            });
            this.broadcastToAll(constants_1.MESSAGE_GAME_LOG, {
                message: 'Starting turn order determination phase'
            });
            this.state.isGameReady = true;
            this.state.isTurnOrderPhase = true;
            this.state.currentTurn = 0;
            if (!this.state.withBots)
                return;
            // Game has bots
            const bots = this.allBots;
            if (!bots.length)
                return;
            const [firstBot] = bots;
            if (firstBot.playerIndex !== 0)
                return;
            yield this.advanceBot(firstBot);
        });
    }
    onDispose() {
        console.info("BaseGame -> onDispose -> onDispose");
    }
    ;
    evaluateVictoryStatus() {
        Object
            .keys(this.state.players)
            .forEach(sessionId => {
            const player = this.state.players[sessionId];
            if (player.victoryPoints >= 10) {
                this.broadcastToAll(constants_1.MESSAGE_GAME_VICTORY, {
                    playerName: player.nickname
                });
            }
        });
    }
    onPlayKnightCard(currentPlayer) {
        if (currentPlayer.knights < 3)
            return;
        const otherPlayerKnights = Object
            .keys(this.state.players)
            .map(sessionId => {
            const player = this.state.players[sessionId];
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
                const player = this.state.players[sessionId];
                player.hasLargestArmy = false;
            });
            currentPlayer.hasLargestArmy = true;
        }
    }
}
;
exports.default = BaseGame;
