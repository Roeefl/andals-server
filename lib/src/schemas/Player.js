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
const GameCard_1 = __importDefault(require("../schemas/GameCard"));
const DiceRoll_1 = __importDefault(require("./DiceRoll"));
const Structure_1 = __importDefault(require("./Structure"));
const buildingCosts_1 = __importDefault(require("../buildingCosts"));
const manifest_1 = require("../manifest");
;
;
const initialHasResources = {
    road: false,
    settlement: false,
    city: false,
    gameCard: false,
    guard: false
};
;
const initialOwnedHarbors = {
    harborGeneric: false,
    lumber: false,
    sheep: false,
    brick: false,
    wheat: false,
    ore: false
};
// Four sets of wooden player pieces in four different colors
// each containing five settlements, four cities, and 15 roads.
class Player extends schema_1.Schema {
    constructor(sessionId, options, color, playerIndex) {
        super();
        this.isConnected = false;
        this.isReady = false;
        this.victoryPoints = 0;
        this.settlements = 5;
        this.cities = 4;
        this.roads = 15;
        this.guards = 8;
        this.hasPlayedGameCard = false;
        this.mustDiscardHalfDeck = false;
        this.mustMoveRobber = false;
        this.roadBuildingPhase = 0;
        this.isDeclaringMonopoly = false;
        this.tradingWith = null;
        this.pendingTrade = '';
        this.isTradeConfirmed = false;
        this.isWaitingTradeRequest = false;
        this.hasLongestRoad = false;
        this.hasLargestArmy = false;
        this.lastStructureBuilt = null;
        const { nickname = 'John Doe' } = options;
        // Disabled until enabling color distinction between players
        // color = '#214013'
        // } = options;
        // const randomInt = Math.floor(Math.random() * 9999);
        this.nickname = nickname;
        this.playerSessionId = sessionId;
        this.playerIndex = playerIndex;
        this.isConnected = true;
        this.gameCards = new schema_1.ArraySchema();
        this.rolls = new schema_1.ArraySchema();
        this.color = color;
        this.resourceCounts = new schema_1.MapSchema(Object.assign({}, manifest_1.initialResourceCounts));
        this.availableLoot = new schema_1.MapSchema(Object.assign({}, manifest_1.initialResourceCounts));
        this.tradeCounts = new schema_1.MapSchema(Object.assign({}, manifest_1.initialResourceCounts));
        this.hasResources = new schema_1.MapSchema(Object.assign({}, initialHasResources));
        this.allowStealingFrom = new schema_1.ArraySchema();
        this.ownedHarbors = new schema_1.MapSchema(Object.assign({}, initialOwnedHarbors));
        this.isBot = false;
    }
    restore(fromBot) {
        this.gameCards = fromBot.gameCards;
        this.rolls = fromBot.rolls;
        this.resourceCounts = fromBot.resourceCounts;
        this.availableLoot = fromBot.availableLoot;
        this.tradeCounts = fromBot.tradeCounts;
        this.hasResources = fromBot.hasResources;
        this.allowStealingFrom = fromBot.allowStealingFrom;
        this.ownedHarbors = fromBot.ownedHarbors;
    }
    get knights() {
        return this.gameCards.filter(({ type }) => type === manifest_1.CARD_KNIGHT).length;
    }
    get totalAvailableLoot() {
        const counts = Object.values(this.availableLoot);
        return counts.reduce((d1, d2) => d1 + d2, 0);
    }
    get totalResourceCounts() {
        const counts = Object.values(this.resourceCounts);
        return counts.reduce((d1, d2) => d1 + d2, 0);
    }
    initializeSetupPhase() {
        this.hasResources = new schema_1.MapSchema({
            road: false,
            settlement: true,
            city: false,
            gameCard: false,
            guard: false
        });
    }
    onPurchase(type, isSetupPhase = false, isEndSetupPhase = false) {
        if (type === manifest_1.PURCHASE_ROAD) {
            this.roads--;
        }
        else if (type === manifest_1.PURCHASE_SETTLEMENT) {
            this.settlements--;
            this.victoryPoints++;
        }
        else if (type === manifest_1.PURCHASE_CITY) {
            this.cities--;
            this.victoryPoints++;
        }
        else if (type === manifest_1.PURCHASE_GUARD) {
            this.guards--;
        }
        if (isSetupPhase) {
            if (type === manifest_1.PURCHASE_SETTLEMENT) {
                this.hasResources = new schema_1.MapSchema({
                    road: true,
                    settlement: false,
                    city: false,
                    gameCard: false,
                    guard: false
                });
                return;
            }
            this.hasResources = new schema_1.MapSchema(Object.assign({}, initialHasResources));
            return;
        }
        ;
        if (!isEndSetupPhase) {
            const costs = buildingCosts_1.default[type];
            const updatedResourceCounts = manifest_1.resourceCardTypes.reduce((acc, name) => {
                acc[name] = this.resourceCounts[name] - costs[name];
                return acc;
            }, {});
            this.resourceCounts = new schema_1.MapSchema(Object.assign({}, updatedResourceCounts));
        }
        this.updateHasResources();
    }
    onPurchaseCard(purchasedCard) {
        const updatedCards = [
            ...this.gameCards,
            purchasedCard
        ];
        this.gameCards = new schema_1.ArraySchema(...updatedCards);
        this.onPurchase(manifest_1.PURCHASE_GAME_CARD);
        if (purchasedCard.type = manifest_1.CARD_VICTORY_POINT)
            this.victoryPoints++;
    }
    updateHasResources() {
        const updatedHasResources = manifest_1.firstmenManifest.purchaseTypes.reduce((acc, purchaseType) => {
            acc[purchaseType] = Object
                .entries(this.resourceCounts)
                .every(([resource, value]) => value >= buildingCosts_1.default[purchaseType][resource]);
            return acc;
        }, {});
        this.hasResources = new schema_1.MapSchema(Object.assign({}, updatedHasResources));
    }
    saveLastStructure(structure) {
        this.lastStructureBuilt = new Structure_1.default(this.playerSessionId, structure.type, structure.row, structure.col);
    }
    // Object
    //   .values(this.state.players)
    //   .forEach(player => player.giveInitialResources());
    // giveInitialResources() {
    //   if (!this.lastStructureBuilt) return;
    //   const { type, row, col } = this.lastStructureBuilt; // @TODO: Use this
    //   this.onPurchase('NONE', false, true);
    // }
    onCollectLoot() {
        const updatedResourceCounts = manifest_1.resourceCardTypes.reduce((acc, name) => {
            acc[name] = this.resourceCounts[name] + this.availableLoot[name];
            return acc;
        }, {});
        this.resourceCounts = new schema_1.MapSchema(Object.assign({}, updatedResourceCounts));
        const updatedAvailableLoot = Object.assign({}, manifest_1.initialResourceCounts);
        this.availableLoot = new schema_1.MapSchema(Object.assign({}, updatedAvailableLoot));
        this.updateHasResources();
    }
    updateTradeCounts(resource, isRemove = false) {
        this.resourceCounts = new schema_1.MapSchema(Object.assign(Object.assign({}, this.resourceCounts), { [resource]: this.resourceCounts[resource] + (isRemove ? 1 : -1) }));
        this.tradeCounts = new schema_1.MapSchema(Object.assign(Object.assign({}, this.tradeCounts), { [resource]: this.tradeCounts[resource] + (isRemove ? -1 : 1) }));
    }
    resetTradeCounts() {
        this.tradeCounts = new schema_1.MapSchema(Object.assign({}, manifest_1.initialResourceCounts));
    }
    resetTradeStatus() {
        this.pendingTrade = '';
        this.isWaitingTradeRequest = false;
    }
    cancelTrade() {
        const updatedResourceCounts = manifest_1.resourceCardTypes.reduce((acc, name) => {
            acc[name] = this.resourceCounts[name] + this.tradeCounts[name];
            return acc;
        }, {});
        this.resourceCounts = new schema_1.MapSchema(Object.assign({}, updatedResourceCounts));
        this.resetTradeCounts();
        this.resetTradeStatus();
        this.tradingWith = null;
    }
    performTrade(otherPlayerTradeCounts) {
        const updatedResourceCounts = manifest_1.resourceCardTypes.reduce((acc, name) => {
            acc[name] = this.resourceCounts[name] + otherPlayerTradeCounts[name];
            return acc;
        }, {});
        this.resourceCounts = new schema_1.MapSchema(Object.assign({}, updatedResourceCounts));
        this.updateHasResources();
    }
    discardResources(discardedCounts = {}) {
        const updatedResourceCounts = manifest_1.resourceCardTypes.reduce((acc, name) => {
            acc[name] = this.resourceCounts[name] - discardedCounts[name];
            return acc;
        }, {});
        this.resourceCounts = new schema_1.MapSchema(Object.assign({}, updatedResourceCounts));
    }
    addResource(resource) {
        this.resourceCounts = new schema_1.MapSchema(Object.assign(Object.assign({}, this.resourceCounts), { [resource]: this.resourceCounts[resource] + 1 }));
    }
    stolenResource(resource) {
        this.resourceCounts = new schema_1.MapSchema(Object.assign(Object.assign({}, this.resourceCounts), { [resource]: this.resourceCounts[resource] - 1 }));
    }
    advanceRoadBuildingPhase() {
        this.roadBuildingPhase++;
        if (this.roadBuildingPhase === 3) {
            this.roadBuildingPhase = 0;
        }
    }
    gaveAllOfResourceType(resource) {
        this.resourceCounts = new schema_1.MapSchema(Object.assign(Object.assign({}, this.resourceCounts), { [resource]: 0 }));
        this.updateHasResources();
    }
    receiveHarborPrivileges(harborType) {
        const updatedHarbors = Object.assign(Object.assign({}, this.ownedHarbors), { [harborType]: true });
        this.ownedHarbors = new schema_1.MapSchema(Object.assign({}, updatedHarbors));
    }
}
__decorate([
    schema_1.type("string")
], Player.prototype, "playerSessionId", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "isBot", void 0);
__decorate([
    schema_1.type("number")
], Player.prototype, "playerIndex", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "nickname", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "color", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "isConnected", void 0);
__decorate([
    schema_1.type([DiceRoll_1.default])
], Player.prototype, "rolls", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "isReady", void 0);
__decorate([
    schema_1.type("number")
], Player.prototype, "victoryPoints", void 0);
__decorate([
    schema_1.type("number")
], Player.prototype, "settlements", void 0);
__decorate([
    schema_1.type("number")
], Player.prototype, "cities", void 0);
__decorate([
    schema_1.type("number")
], Player.prototype, "roads", void 0);
__decorate([
    schema_1.type("number")
], Player.prototype, "guards", void 0);
__decorate([
    schema_1.type([GameCard_1.default])
], Player.prototype, "gameCards", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "hasPlayedGameCard", void 0);
__decorate([
    schema_1.type({ map: "number" })
], Player.prototype, "resourceCounts", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "mustDiscardHalfDeck", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "mustMoveRobber", void 0);
__decorate([
    schema_1.type("number")
], Player.prototype, "roadBuildingPhase", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "isDeclaringMonopoly", void 0);
__decorate([
    schema_1.type(["string"])
], Player.prototype, "allowStealingFrom", void 0);
__decorate([
    schema_1.type({ map: "boolean" })
], Player.prototype, "ownedHarbors", void 0);
__decorate([
    schema_1.type({ map: "number" })
], Player.prototype, "availableLoot", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "tradingWith", void 0);
__decorate([
    schema_1.type({ map: "number" })
], Player.prototype, "tradeCounts", void 0);
__decorate([
    schema_1.type("string")
], Player.prototype, "pendingTrade", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "isTradeConfirmed", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "isWaitingTradeRequest", void 0);
__decorate([
    schema_1.type({ map: "boolean" })
], Player.prototype, "hasResources", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "hasLongestRoad", void 0);
__decorate([
    schema_1.type("boolean")
], Player.prototype, "hasLargestArmy", void 0);
__decorate([
    schema_1.type(Structure_1.default)
], Player.prototype, "lastStructureBuilt", void 0);
;
exports.default = Player;
