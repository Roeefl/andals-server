"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hexes_1 = __importDefault(require("../tilemaps/baseGame/hexes"));
const structures_1 = __importDefault(require("../tilemaps/baseGame/structures"));
const roads_1 = __importDefault(require("../tilemaps/baseGame/roads"));
const manifest_1 = require("../manifest");
;
class TileManager {
    hexTileAdjacentHexes(row, col) {
        // top-left, top-right, left, right, bottom-left, bottom-right
        return [
            [row - 1, col - 1], [row - 1, col],
            [row, col - 1], [row, col + 1],
            [row + 1, col - 1], [row + 1, col]
        ].filter(([hexRow, hexCol]) => hexRow >= 0 && hexRow < hexes_1.default.length && hexCol >= 0 && hexCol <= hexes_1.default[0].length);
    }
    hexTileAdjacentStructures(row, col) {
        // offset by +2 for EVEN rows only
        const colOffset = row % 2 === 0 ? 2 : 0;
        // top-left, top, top-right, bottom-left, bottom, bottom-right
        return [
            [row, col * 2],
            [row, col * 2 + 1],
            [row, col * 2 + 2],
            [row + 1, col * 2 - 1 + colOffset],
            [row + 1, col * 2 + colOffset],
            [row + 1, col * 2 + 1 + colOffset]
        ];
    }
    harborAdjacentStructures(ports = [0, 1], row, col) {
        const adjacentStructures = this.hexTileAdjacentStructures(row, col)
            .filter(([sRow, sCol]) => sRow >= 0 && sRow < structures_1.default.length && !!structures_1.default[sRow][sCol]);
        const [firstPortIndex, secondPortIndex] = ports;
        return adjacentStructures.length > 2
            ? [
                adjacentStructures[firstPortIndex],
                adjacentStructures[secondPortIndex]
            ]
            : adjacentStructures;
    }
    harborAdjacentToStructure(board, row, col, ports = [0, 1]) {
        return board
            .filter(({ type, resource }) => type === manifest_1.TILE_WATER && !!resource)
            .find(({ row: tileRow, col: tileCol }) => {
            const adjacentStructures = this.harborAdjacentStructures(ports, tileRow, tileCol);
            return adjacentStructures.some(([structureRow, structureCol]) => structureRow === row && structureCol === col);
        });
    }
    adjacentStructuresToStructure(tileType, row, col) {
        // offset by +2 for EVEN rows only
        const colOffset = row % 2 === 0 ? 2 : 0;
        // If structure tile type is 'TOP', push tile directly above it
        // If structure tile type it 'TOP-LEFT', push tile directly below it
        const thirdAdjacentTile = (tileType === 1)
            ? [row - 1, col - 1 + colOffset]
            : [row + 1, col - 1 + colOffset];
        return [
            [row, col],
            [row, col - 1], [row, col + 1],
            thirdAdjacentTile
        ];
    }
    ;
    isValidSettlement(state, ownerId, row, col) {
        if (!structures_1.default[row][col])
            return false;
        if (!state.isSetupPhase) {
            const isAdjacentToOwnedRoad = state.roads
                .filter(road => !!road && road.ownerId && road.ownerId === ownerId)
                .map(({ row: roadRow, col: roadCol }) => {
                const roadTile = roads_1.default[roadRow][roadCol];
                if (!roadTile)
                    return false;
                let allowedStructures = [];
                switch (roadTile) {
                    case 1:
                    case 2:
                        allowedStructures = [[Math.floor(roadRow / 2), roadCol], [Math.floor(roadRow / 2), roadCol + 1]];
                        break;
                    case 3:
                        allowedStructures = [[Math.floor(roadRow / 2), roadCol], [Math.ceil(roadRow / 2), roadCol - 1]];
                        break;
                }
                return allowedStructures.some(([itemRow, itemCol]) => itemRow === row && itemCol === col);
            });
            if (isAdjacentToOwnedRoad.every(allowed => !allowed))
                return false;
        }
        // Not allowed to place structure on ports on setup round
        if (state.isSetupPhase && this.harborAdjacentToStructure(state.board, row, col, state.ports))
            return false;
        const isAdjacentToActiveStructures = state.structures
            .filter(structure => !!structure && !!structure.ownerId)
            .map(({ row: structureRow, col: structureCol }) => {
            const structureTile = structures_1.default[structureRow][structureCol]; // 'hide' === 0,'top' === 1, 'top-left' === 2
            if (!structureTile)
                return false;
            const adjacentStructureTiles = this.adjacentStructuresToStructure(structureTile, structureRow, structureCol);
            return adjacentStructureTiles.some(([tileRow, tileCol]) => tileRow === row && tileCol === col);
        });
        return isAdjacentToActiveStructures.every(isAdjacent => !isAdjacent);
    }
    ;
    isValidRoad(state, owner, row, col) {
        if (!roads_1.default[row][col])
            return false;
        // Already owns this road...
        if (state.roads.find(road => !!road && road.ownerId === owner.playerSessionId && road.row === row && road.col === col))
            return false;
        const isAllowedPerStructure = state.structures
            .filter(structure => !state.isSetupPhase || !owner.lastStructureBuilt || (!!structure && structure.row === owner.lastStructureBuilt.row && structure.col === owner.lastStructureBuilt.col))
            .filter(structure => !!structure && structure.ownerId && structure.ownerId === owner.playerSessionId)
            .map(({ row: structureRow, col: structureCol }) => {
            const structureTile = structures_1.default[structureRow][structureCol]; // 'hide' === 0,'top' === 1, 'top-left' === 2
            if (!structureTile)
                return false;
            let intersections = [[structureRow * 2, structureCol - 1], [structureRow * 2, structureCol]];
            const colOffset = structureRow % 2 === 0 ? 2 : 0;
            if (structureTile === 1) { // 'top' ?
                intersections = [
                    ...intersections,
                    [structureRow * 2 - 1, structureCol],
                    [structureRow * 2 - 1, structureCol - 1 + colOffset]
                ];
            }
            else {
                intersections = [
                    ...intersections,
                    [structureRow * 2 + 1, structureCol - 1],
                    [structureRow * 2 + 1, structureCol]
                ];
            }
            return intersections.some(([iRow, iCol]) => iRow === row && iCol === col);
        });
        // During setup phase -- only allow if adjacent to the last structure built
        if (state.isSetupPhase)
            return isAllowedPerStructure.some(allowed => allowed);
        const isAllowedPerRoad = state.roads
            .filter(road => !!road && road.ownerId && road.ownerId === owner.playerSessionId)
            .map(({ row: roadRow, col: roadCol }) => {
            // 0: 'hide', 1: 'top-left', 2: 'top-right', 3: 'left'
            const roadTile = roads_1.default[roadRow][roadCol];
            if (!roadTile)
                return false;
            let intersections = [];
            // offset by +2 for EVEN rows only
            let colOffset = 0;
            switch (roadTile) {
                // road: [6, 6], type: 1 || intersecting roads: [6, 5], [6, 7], [5, 6], [7, 6]
                case 1:
                    colOffset = roadRow % 2 === 0 ? -2 : 0;
                    intersections = [[roadRow, roadCol - 1], [roadRow, roadCol + 1], [roadRow - 1, roadCol + colOffset], [roadRow - 1, roadCol + 1 + colOffset], [roadRow + 1, roadCol]];
                    break;
                // road: [6, 7], type: 2 || intersecting roads: [6, 6], [6, 8], [5, 5], [7, 7]
                case 2:
                    colOffset = roadRow % 2 === 0 ? 1 : 0;
                    intersections = [[roadRow, roadCol - 1], [roadRow, roadCol + 1], [roadRow - 1, roadCol - 1 + colOffset], [roadRow + 1, roadCol], [roadRow + 1, roadCol + 1]];
                    break;
                // road: [7, 7], type: 3 || intersecting roads: [6, 6], [6, 7], [8, 5], [8, 6]
                case 3:
                    colOffset = (roadRow <= 3 || roadRow >= 10) ? -2 : 0;
                    intersections = [[roadRow - 1, roadCol], [roadRow - 1, roadCol - 1], [roadRow + 1, roadCol + colOffset], [roadRow + 1, roadCol + 1 + colOffset]];
                    break;
            }
            return intersections.some(([iRow, iCol]) => iRow === row && iCol === col);
        });
        return isAllowedPerStructure.some(allowed => allowed) || isAllowedPerRoad.some(allowed => allowed);
    }
    ;
    validSettlements(state, ownerId) {
        const allValidSettlements = [];
        structures_1.default
            .forEach((row, rowIndex) => {
            row.forEach((s, colIndex) => {
                if (this.isValidSettlement(state, ownerId, rowIndex, colIndex)) {
                    const settlement = { row: rowIndex, col: colIndex };
                    allValidSettlements.push(settlement);
                }
            });
        });
        return allValidSettlements;
    }
    ;
    validRoads(state, player) {
        const allValidRoads = [];
        roads_1.default
            .forEach((row, rowIndex) => {
            row.forEach((s, colIndex) => {
                if (this.isValidRoad(state, player, rowIndex, colIndex)) {
                    const road = { row: rowIndex, col: colIndex };
                    allValidRoads.push(road);
                }
            });
        });
        return allValidRoads;
    }
    bestRobberHextile(state, botSessionId) {
        let bestHextile = {
            row: 0,
            col: 0,
            population: 0
        };
        state.board
            .filter(({ type, resource }, index) => type === manifest_1.TILE_RESOURCE && !!resource && resource !== manifest_1.DESERT && index !== state.robberPosition)
            .forEach(({ row: tileRow, col: tileCol }) => {
            const adjacentStructures = this.hexTileAdjacentStructures(tileRow, tileCol);
            const population = state.structures
                .filter(({ ownerId, row, col }) => ownerId !== botSessionId && adjacentStructures.some(([sRow, sCol]) => sRow === row && sCol === col))
                .length;
            if (population > bestHextile.population) {
                bestHextile = {
                    row: tileRow,
                    col: tileCol,
                    population
                };
            }
        });
        return bestHextile;
    }
}
exports.default = new TileManager();