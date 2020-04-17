"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
const Player_1 = __importDefault(require("../schemas/Player"));
const HexTile_1 = __importDefault(require("../schemas/HexTile"));
const Structure_1 = __importDefault(require("../schemas/Structure"));
const Road_1 = __importDefault(require("../schemas/Road"));
const GameCard_1 = __importDefault(require("../schemas/GameCard"));
const manifest_1 = require("../manifest");
const totalResourceCards = 19;
class GameState extends schema_1.Schema {
    constructor(manifest, board, gameCards, roomOptions) {
        super();
        this.currentTurn = -1;
        this.isDiceRolled = false;
        this.currentRound = 1;
        this.roundStarter = -1;
        this.isGameReady = false;
        this.isTurnOrderPhase = false;
        this.isSetupPhase = false;
        this.setupPhaseTurns = 0;
        this.isGameStarted = false;
        this.robberPosition = -1;
        this.players = new schema_1.MapSchema();
        this.dice = new schema_1.ArraySchema(6, 6);
        this.resourceCounts = new schema_1.MapSchema();
        this.manifest = manifest;
        const { roomTitle = 'andals.io Game Room', maxPlayers = 4, playVsBots = false, autoPickup = true, friendlyGameLog = false, enableBotReplacement = true } = roomOptions;
        this.roomTitle = roomTitle;
        this.maxClients = maxPlayers;
        this.withBots = playVsBots;
        this.autoPickupEnabled = autoPickup;
        this.friendlyGameLog = friendlyGameLog;
        this.enableBotReplacement = enableBotReplacement;
        this.board = new schema_1.ArraySchema(...board);
        // 19 Resource cards of each terrain tile
        this.resourceCounts = new schema_1.MapSchema({
            lumber: totalResourceCards,
            sheep: totalResourceCards,
            brick: totalResourceCards,
            wheat: totalResourceCards,
            ore: totalResourceCards
        });
        this.gameCards = new schema_1.ArraySchema(...gameCards);
        this.robberPosition = board.findIndex(tile => tile.resource === manifest_1.DESERT);
        this.roads = new schema_1.ArraySchema();
        this.structures = new schema_1.ArraySchema();
        const randomPortIndices = [1, Math.floor(Math.random() * 2) * 2];
        this.ports = new schema_1.ArraySchema(...randomPortIndices);
    }
}
__decorate([
    schema_1.type("number")
], GameState.prototype, "maxClients", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "withBots", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "autoPickupEnabled", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "friendlyGameLog", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "enableBotReplacement", void 0);
__decorate([
    schema_1.type("string")
], GameState.prototype, "roomTitle", void 0);
__decorate([
    schema_1.type("number")
], GameState.prototype, "currentTurn", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "isDiceRolled", void 0);
__decorate([
    schema_1.type("number")
], GameState.prototype, "currentRound", void 0);
__decorate([
    schema_1.type("number")
], GameState.prototype, "roundStarter", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "isGameReady", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "isTurnOrderPhase", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "isSetupPhase", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "setupPhaseTurns", void 0);
__decorate([
    schema_1.type("boolean")
], GameState.prototype, "isGameStarted", void 0);
__decorate([
    schema_1.type("number")
], GameState.prototype, "robberPosition", void 0);
__decorate([
    schema_1.type({ map: Player_1.default })
], GameState.prototype, "players", void 0);
__decorate([
    schema_1.type(["number"])
], GameState.prototype, "dice", void 0);
__decorate([
    schema_1.type([HexTile_1.default])
], GameState.prototype, "board", void 0);
__decorate([
    schema_1.type({ map: "number" })
], GameState.prototype, "resourceCounts", void 0);
__decorate([
    schema_1.type([GameCard_1.default])
], GameState.prototype, "gameCards", void 0);
__decorate([
    schema_1.type([Road_1.default])
], GameState.prototype, "roads", void 0);
__decorate([
    schema_1.type([Structure_1.default])
], GameState.prototype, "structures", void 0);
__decorate([
    schema_1.type(["number"])
], GameState.prototype, "ports", void 0);
;
exports.default = GameState;
