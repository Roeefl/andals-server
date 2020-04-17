"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("@colyseus/schema");
class Structure extends schema_1.Schema {
    constructor(ownerId, type, row, col) {
        super();
        this.ownerId = ownerId;
        this.type = type;
        this.row = row;
        this.col = col;
    }
}
__decorate([
    schema_1.type("string")
], Structure.prototype, "type", void 0);
__decorate([
    schema_1.type("string")
], Structure.prototype, "ownerId", void 0);
__decorate([
    schema_1.type("number")
], Structure.prototype, "row", void 0);
__decorate([
    schema_1.type("number")
], Structure.prototype, "col", void 0);
;
exports.default = Structure;