"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
class DiceRoll extends schema_1.Schema {
    constructor(dice) {
        super();
        this.dice = new schema_1.ArraySchema(...dice);
        this.value = dice.reduce((d1, d2) => d1 + d2, 0);
    }
}
__decorate([
    schema_1.type(["number"])
], DiceRoll.prototype, "dice", void 0);
__decorate([
    schema_1.type("number")
], DiceRoll.prototype, "value", void 0);
;
exports.default = DiceRoll;
