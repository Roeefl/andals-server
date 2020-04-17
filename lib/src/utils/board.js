"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hexes_1 = __importDefault(require("../tilemaps/baseGame/hexes"));
function absoluteIndex(row, col) {
    return row * hexes_1.default.length + col;
}
exports.absoluteIndex = absoluteIndex;
;
