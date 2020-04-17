"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
;
const manifest = {
    // A "Knight" card allows a player to move the robber to any spot on the board
    // and then gets to take a card from any player that has a settlement or city on the blocked resource.
    knight: {
        title: 'knight',
        description: 'A fiercesome Knight'
    },
    // A "Victory Point" card automatically gives the player one victory point.
    victoryPoint: {
        title: 'Victory Point',
        description: 'Forward, to Victory!'
    },
    // A "Road Building" card allows a player to place two roads on the board.
    roadBuilding: {
        title: 'Road Building',
        description: 'Pull this card to build 2 roads anywhere'
    },
    // A "Year of Plenty" card gives a player any two resource cards.
    yearOfPlenty: {
        title: 'Year of Plenty',
        description: 'You get good shit'
    },
    // After a player plays the "Monopoly" card, that player announces one type of resource.
    // Every player must then give that player all of that type of resource card(s) in their hand.
    monopoly: {
        title: 'Monopoly',
        description: 'Ask others for their stuff'
    }
};
class GameCard extends schema_1.Schema {
    constructor(type) {
        super();
        this.wasPlayed = false;
        this.type = type;
        this.title = manifest[type].title;
        this.description = manifest[type].description;
    }
}
__decorate([
    schema_1.type("string")
], GameCard.prototype, "type", void 0);
__decorate([
    schema_1.type("string")
], GameCard.prototype, "title", void 0);
__decorate([
    schema_1.type("string")
], GameCard.prototype, "description", void 0);
__decorate([
    schema_1.type("boolean")
], GameCard.prototype, "wasPlayed", void 0);
;
exports.default = GameCard;
