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
const FCG = require('fantasy-content-generator');
const delay = require('delay');
const Player_1 = __importDefault(require("./Player"));
const TileManager_1 = __importDefault(require("../game/TileManager"));
const sessionId_1 = require("../utils/sessionId");
const board_1 = require("../utils/board");
const manifest_1 = require("../manifest");
class GameBot extends Player_1.default {
    constructor(color, playerIndex, replacing) {
        const sessionId = replacing
            ? replacing.playerSessionId
            : sessionId_1.generateSessionId();
        const nickname = replacing
            ? `${replacing.nickname} (BOT)`
            : GameBot.generateName();
        const options = {
            nickname
        };
        const botColor = replacing
            ? replacing.color
            : color;
        const botIndex = replacing
            ? replacing.playerIndex
            : playerIndex;
        super(sessionId, options, botColor, botIndex);
        this.isBot = true;
        if (replacing) {
            this.gameCards = replacing.gameCards;
            this.rolls = replacing.rolls;
            this.resourceCounts = replacing.resourceCounts;
            this.availableLoot = replacing.availableLoot;
            this.tradeCounts = replacing.tradeCounts;
            this.hasResources = replacing.hasResources;
            this.allowStealingFrom = replacing.allowStealingFrom;
            this.ownedHarbors = replacing.ownedHarbors;
        }
    }
    static generateName() {
        const generate = FCG.NPCs.generate();
        return generate.nameObject.name;
    }
    static rollDice() {
        return __awaiter(this, void 0, void 0, function* () {
            yield delay(500);
            const randomDice1 = Math.floor(Math.random() * 6) + 1;
            const randomDice2 = Math.floor(Math.random() * 6) + 1;
            return [
                randomDice1,
                randomDice2
            ];
        });
    }
    static validSettlement(state, botSessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield delay(1500);
            const validSettlements = TileManager_1.default.validSettlements(state, botSessionId);
            if (!validSettlements.length)
                return null;
            const randomIndex = Math.floor(Math.random() * validSettlements.length);
            const settlement = validSettlements[randomIndex];
            return {
                structureType: manifest_1.PURCHASE_SETTLEMENT,
                row: settlement.row,
                col: settlement.col
            };
        });
    }
    static validRoad(state, currentBot) {
        return __awaiter(this, void 0, void 0, function* () {
            yield delay(1500);
            const validRoads = TileManager_1.default.validRoads(state, currentBot);
            if (!validRoads.length)
                return null;
            const randomIndex = Math.floor(Math.random() * validRoads.length);
            const road = validRoads[randomIndex];
            return {
                structureType: manifest_1.PURCHASE_ROAD,
                row: road.row,
                col: road.col
            };
        });
    }
    static validCity(state, botSessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield delay(1500);
            const validCities = state.structures
                .filter(structure => !!structure && structure.ownerId === botSessionId);
            if (!validCities.length)
                return null;
            const randomIndex = Math.floor(Math.random() * validCities.length);
            const city = validCities[randomIndex];
            return {
                structureType: manifest_1.PURCHASE_CITY,
                row: city.row,
                col: city.col
            };
        });
    }
    static validGuard(state, botSessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield delay(1000);
            return null;
        });
    }
    static desiredRobberTile(state, botSessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield delay(1500);
            const { row, col } = TileManager_1.default.bestRobberHextile(state, botSessionId);
            return board_1.absoluteIndex(row, col);
        });
    }
    stealCard(state) {
        const randomIndex = Math.floor(Math.random() * this.allowStealingFrom.length);
        const stealFrom = this.allowStealingFrom[randomIndex];
        const owner = state.players[stealFrom];
        const validResources = Object
            .entries(owner.resourceCounts)
            .filter(([resource, value]) => value > 0);
        const randomResourceIndex = Math.floor(Math.random() * validResources.length);
        const [resource, value] = validResources[randomResourceIndex];
        return {
            stealFrom,
            resource
        };
    }
    discardedCounts() {
        return manifest_1.resourceCardTypes.reduce((acc, name, index) => {
            const methodName = index % 2 === 0 ? 'floor' : 'ceil';
            acc[name] = Math[methodName](this.resourceCounts[name] / 2);
            return acc;
        }, {});
    }
    // @TODO: sometime
    playCard() {
    }
    bestResource(resourceCounts) {
        const highestResource = {
            resource: manifest_1.LUMBER,
            value: 0
        };
        Object
            .entries(resourceCounts)
            .forEach(([resource, value]) => {
            if (value > highestResource.value) {
                highestResource.resource = resource;
                highestResource.value = value;
            }
        });
        if (!highestResource.value)
            return null;
        return highestResource;
    }
    bestAddedTradeResource() {
        return __awaiter(this, void 0, void 0, function* () {
            yield delay(500);
            return this.bestResource(this.resourceCounts);
        });
    }
    bestRemovedTradeResource() {
        return __awaiter(this, void 0, void 0, function* () {
            yield delay(500);
            return this.bestResource(this.tradeCounts);
        });
    }
}
;
exports.default = GameBot;
