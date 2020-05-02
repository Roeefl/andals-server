const FCG = require('fantasy-content-generator');
const delay = require('delay');

import { minBy } from 'lodash';

import GameState from '../game/GameState';
import Player, { PlayerOptions } from './Player';
import Structure from './Structure';
import TileManager, { ValidStructurePosition, ValidHextile } from '../game/TileManager';
import { generateSessionId } from '../utils/sessionId';
import { absoluteIndex } from '../utils/board';

import { ROOM_TYPE_FIRST_MEN } from '../specs/roomTypes';

import {
  PURCHASE_ROAD,
  PURCHASE_SETTLEMENT,
  PURCHASE_CITY,
  resourceCardTypes,
  LUMBER
} from '../manifest';

import { Loot, ResourceToSteal } from '../interfaces';
import FirstMenGameState from '../north/FirstMenGameState';

import { wallSectionsCount } from '../specs/wall';

const WILDLING_DICE_MAX = 10;

class GameBot extends Player {
  constructor(color: string, playerIndex: number, replacing?: Player) {
    const sessionId = replacing
      ? replacing.playerSessionId
      : generateSessionId();
    
    const nickname = replacing
      ? `${replacing.nickname} (BOT)`
      : GameBot.generateName();

    const options: PlayerOptions = {
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

  async think(time: number = 1000) {
    await delay(time);
  }

  static async rollDice(roomType: string) {
    await delay(500);

    const randomDice1 = Math.floor(Math.random() * 6) + 1;
    const randomDice2 = Math.floor(Math.random() * 6) + 1;

    const dice = [randomDice1, randomDice2];

    if (roomType === ROOM_TYPE_FIRST_MEN) {
      const wildlingDice = Math.floor(Math.random() * WILDLING_DICE_MAX) + 1;
      dice.push(wildlingDice);
    };

    return dice;
  }

  static async validSettlement(state: GameState, botSessionId: string) {
    await delay(1500);

    const bestSettlement: ValidStructurePosition = TileManager.bestSettlement(state, botSessionId);
    
    if (!bestSettlement) return null;
    return {
      structureType: PURCHASE_SETTLEMENT,
      row: bestSettlement.row,
      col: bestSettlement.col
    };
  }

  static async validRoad(state: GameState, currentBot: Player) {
    await delay(1500);

    const validRoads: ValidStructurePosition[] = TileManager.validRoads(state, currentBot);
    if (!validRoads.length) return null;

    const randomIndex = Math.floor(Math.random() * validRoads.length);
    const road: ValidStructurePosition = validRoads[randomIndex];

    return {
      structureType: PURCHASE_ROAD,
      row: road.row,
      col: road.col
    };
  }

  static async validCity(state: GameState, botSessionId: string) {
    await delay(1500);

    const validCities: Structure[] = state.structures
      .filter(structure => !!structure && structure.ownerId === botSessionId);

    if (!validCities.length) return null;

    const randomIndex = Math.floor(Math.random() * validCities.length);
    const city: Structure = validCities[randomIndex];

    return {
      structureType: PURCHASE_CITY,
      row: city.row,
      col: city.col
    };
  }

  static async validGuard(state: FirstMenGameState, botSessionId: string) {
    await delay(1000);
    
    const guardsOnEachSection = Array(wallSectionsCount).fill(0)
      .map((x, sectionIndex) => ({
        sectionIndex,
        guardsCount: state.guardsOnWallSection(sectionIndex)
      }));

    const best = minBy(
      guardsOnEachSection,
      section => section.guardsCount
    );

    return {
      section: best.sectionIndex,
      position: best.guardsCount
    };
  }

  static async desiredRobberTile(state: GameState, botSessionId: string) {
    await delay(1500);
    
    const { row, col } = TileManager.bestRobberHextile(state, botSessionId);
    return absoluteIndex(state.manifest.tilemap, row, col);
  }

  stealCard(state: GameState, fromWho: number = 0): ResourceToSteal | null {
    if (this.allowStealingFrom.length <= fromWho)
      return null;

    const stealFrom: string = this.allowStealingFrom[fromWho];
    const owner: Player = state.players[stealFrom];
    
    const validResources = Object
      .entries(owner.resourceCounts)
      .filter(([resource, value]) => value > 0);

    if (!validResources.length)
      return this.stealCard(state, fromWho + 1);

    const randomResourceIndex = Math.floor(Math.random() * validResources.length);
    const [resource, value] = validResources[randomResourceIndex];
    
    return {
      stealFrom,
      resource
    };
  }

  discardedCounts() {
    return resourceCardTypes.reduce((acc, name, index) => {
      const methodName = index % 2 === 0 ? 'floor' : 'ceil';
      acc[name] = Math[methodName](this.resourceCounts[name] / 2);
      return acc;
    }, {} as Loot);
  }
  
  // @TODO: sometime
  playCard() {

  }

  bestResource(resourceCounts: Loot) {
    const highestResource = {
      resource: LUMBER,
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

    if (!highestResource.value) return null;
    return highestResource;
  }

  async bestAddedTradeResource() {
    await delay(500);
    return this.bestResource(this.resourceCounts);
  }

  async bestRemovedTradeResource() {
    await delay(500);
    return this.bestResource(this.tradeCounts);
  }
};

export default GameBot;
