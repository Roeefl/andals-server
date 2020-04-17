"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const HexTile_1 = __importDefault(require("../schemas/HexTile"));
const hexes_1 = __importDefault(require("../tilemaps/baseGame/hexes"));
const TileManager_1 = __importDefault(require("./TileManager"));
const board_1 = require("../utils/board");
const manifest_1 = require("../manifest");
class BoardManager {
    hasSameResourceInAdjacentHexes(adjacentHexes, board, row, col, resourceType) {
        return adjacentHexes
            .filter(([hexRow, hexCol]) => hexes_1.default[hexRow][hexCol] === manifest_1.TILE_RESOURCE && (hexRow < row || (hexRow === row && hexCol < col)))
            .map(([hexRow, hexCol]) => {
            const tileIndex = board_1.absoluteIndex(hexRow, hexCol);
            const otherTile = board[tileIndex];
            return otherTile.resource === resourceType;
        })
            .some(isSameResource => isSameResource);
    }
    /**
     * Generates a board array with a total of 49 hex tiles
     * @memberof BoardManager
    **/
    baseGameBoard() {
        const board = [];
        const hextiles = lodash_1.shuffle(manifest_1.baseGameManifest.boardLayout);
        let hexTileIndex = 0;
        const hextileValues = lodash_1.shuffle(manifest_1.baseGameManifest.boardValues);
        let hextileValueIndex = 0;
        const harbors = lodash_1.shuffle(manifest_1.baseGameManifest.boardHarbors);
        let harborIndex = 0;
        for (let r = 0; r < hexes_1.default.length; r++) {
            for (let t = 0; t < hexes_1.default[r].length; t++) {
                const currentTileType = hexes_1.default[r][t];
                let currentTile = null;
                if (currentTileType === manifest_1.TILE_SPACER) {
                    currentTile = new HexTile_1.default(manifest_1.TILE_SPACER, r, t);
                }
                else if (currentTileType === manifest_1.TILE_WATER) {
                    const tileIndex = board_1.absoluteIndex(r, t);
                    if (manifest_1.baseGameManifest.harborIndices.includes(tileIndex)) {
                        const nextHarbor = harbors[harborIndex];
                        harborIndex++;
                        currentTile = new HexTile_1.default(manifest_1.TILE_WATER, r, t, nextHarbor);
                    }
                    else {
                        // Just water, no harbor
                        currentTile = new HexTile_1.default(manifest_1.TILE_WATER, r, t);
                    }
                }
                else {
                    // is a resource tile
                    const nextResource = hextiles[hexTileIndex];
                    hexTileIndex++;
                    if (nextResource === manifest_1.DESERT) {
                        currentTile = new HexTile_1.default(manifest_1.TILE_RESOURCE, r, t, manifest_1.DESERT);
                    }
                    else {
                        // const adjacentHexes = TileManager.hexTileAdjacentHexes(r, t);
                        // let isAdjacentToSameResourceHex = this.hasSameResourceInAdjacentHexes(adjacentHexes, board, r, t, nextResource);
                        // while (isAdjacentToSameResourceHex) {
                        //   nextResource = hextiles[hexTileIndex];
                        //   isAdjacentToSameResourceHex = this.hasSameResourceInAdjacentHexes(adjacentHexes, board, r, t, nextResource);
                        // }
                        const nextValue = hextileValues[hextileValueIndex];
                        hextileValueIndex++;
                        currentTile = new HexTile_1.default(manifest_1.TILE_RESOURCE, r, t, nextResource, nextValue);
                    }
                    ;
                }
                board.push(currentTile);
            }
        }
        ;
        return board;
    }
    firstMenBoard() {
        const board = [];
        const hextiles = lodash_1.shuffle(manifest_1.firstmenManifest.boardLayout);
        let hexTileIndex = 0;
        const hextileValues = lodash_1.shuffle(manifest_1.firstmenManifest.boardValues);
        let hextileValueIndex = 0;
        const harbors = lodash_1.shuffle(manifest_1.firstmenManifest.boardHarbors);
        let harborIndex = 0;
        for (let r = 0; r < hexes_1.default.length; r++) {
            for (let t = 0; t < hexes_1.default[r].length; t++) {
                const currentTileType = hexes_1.default[r][t];
                let currentTile = null;
                if (currentTileType === manifest_1.TILE_SPACER) {
                    currentTile = new HexTile_1.default(manifest_1.TILE_SPACER, r, t);
                }
                else if (currentTileType === manifest_1.TILE_WATER) {
                    const tileIndex = board_1.absoluteIndex(r, t);
                    if (manifest_1.firstmenManifest.harborIndices.includes(tileIndex)) {
                        const nextHarbor = harbors[harborIndex];
                        harborIndex++;
                        currentTile = new HexTile_1.default(manifest_1.TILE_WATER, r, t, nextHarbor);
                    }
                    else {
                        // Just water, no harbor
                        currentTile = new HexTile_1.default(manifest_1.TILE_WATER, r, t);
                    }
                }
                else {
                    // is a resource tile
                    const nextResource = hextiles[hexTileIndex];
                    hexTileIndex++;
                    if (nextResource === manifest_1.DESERT) {
                        currentTile = new HexTile_1.default(manifest_1.TILE_RESOURCE, r, t, manifest_1.DESERT);
                    }
                    else {
                        // const adjacentHexes = TileManager.hexTileAdjacentHexes(r, t);
                        // let isAdjacentToSameResourceHex = this.hasSameResourceInAdjacentHexes(adjacentHexes, board, r, t, nextResource);
                        // while (isAdjacentToSameResourceHex) {
                        //   nextResource = hextiles[hexTileIndex];
                        //   isAdjacentToSameResourceHex = this.hasSameResourceInAdjacentHexes(adjacentHexes, board, r, t, nextResource);
                        // }
                        const nextValue = hextileValues[hextileValueIndex];
                        hextileValueIndex++;
                        currentTile = new HexTile_1.default(manifest_1.TILE_RESOURCE, r, t, nextResource, nextValue);
                    }
                    ;
                }
                board.push(currentTile);
            }
        }
        ;
        return board;
    }
    robberAdjacentPlayers(state) {
        const { robberPosition } = state;
        const robberTile = state.board[robberPosition];
        const { row, col } = robberTile;
        const owners = [];
        const adjacentStructures = TileManager_1.default.hexTileAdjacentStructures(row, col);
        state.structures
            .forEach(({ row: sRow, col: sCol, ownerId }) => {
            if (!owners.includes(ownerId) && adjacentStructures.some(([iRow, iCol]) => iRow === sRow && iCol === sCol)) {
                owners.push(ownerId);
            }
        });
        return owners;
    }
}
exports.default = new BoardManager();
