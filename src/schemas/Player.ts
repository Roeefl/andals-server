import { type, Schema, ArraySchema, MapSchema } from '@colyseus/schema';
import GameCard from '../schemas/GameCard';
import DiceRoll from './DiceRoll';
import Structure from './Structure';
import buildingCosts, { BuildingCost } from '../buildingCosts';
import { purchaseTypes, resourceCardTypes, PURCHASE_SETTLEMENT, PURCHASE_CARD, PURCHASE_CITY, initialAvailableLoot, initialAvailablResourceCounts, Loot, PURCHASE_ROAD } from '../manifest';

interface PlayerOptions {
  nickname: string
  color: string
};

interface HasResources {
  [key: string]: boolean
};

const initialHasResources: HasResources = {
  road: false,
  settlement: false,
  city: false,
  gameCard: false
};

// Four sets of wooden player pieces in four different colors
// each containing five settlements, four cities, and 15 roads.
class Player extends Schema {
  @type("string")
  playerSessionId: string

  @type("string")
  nickname: string

  @type("string")
  color: string

  @type("boolean")
  isConnected: boolean = false;

  @type([DiceRoll])
  rolls: DiceRoll[]

  @type("boolean")
  isReady: boolean = false;

  @type("number")
  settlements: number = 5;

  @type("number")
  cities: number = 4;

  @type("number")
  roads: number = 15;

  @type([GameCard])
  gameCards: GameCard[];

  @type({ map: "number" })
  resourceCounts: MapSchema<Number> // Loot

  @type({ map: "number" })
  availableLoot: MapSchema<Number> // Loot

  @type({ map: "boolean" })
  hasResources: MapSchema<Boolean> 

  @type("boolean")
  hasLongestRoad: boolean = false;

  @type("boolean")
  hasLargestArmy: boolean = false;

  @type(Structure)
  lastStructureBuilt: Structure | null = null;

  constructor(sessionId: string, options: PlayerOptions, color: string) {
    super();
    
    const { nickname = 'John Doe' } = options;
      // Disabled until enabling color distinction between players
      // color = '#214013'
    // } = options;
    
    const randomInt = Math.floor(Math.random() * 9999);
    this.nickname = `${nickname} ${randomInt}`;

    this.playerSessionId = sessionId;
    this.isConnected = true;
    this.gameCards = new ArraySchema<GameCard>();
    this.rolls = new ArraySchema<DiceRoll>();

    this.color = color;

    this.resourceCounts = new MapSchema<Number>({
      ...initialAvailablResourceCounts
    });

    this.availableLoot = new MapSchema<Number>({
      ...initialAvailableLoot
    });

    this.hasResources = new MapSchema<Boolean>(initialHasResources);
  }

  initializeSetupPhase() {
    this.hasResources = new MapSchema<Boolean>({
      road: false,
      settlement: true,
      city: false,
      gameCard: false
    });
  }

  onPurchase(type: string, isSetupPhase: boolean = false, isEndSetupPhase: boolean = false) {
    if (type === PURCHASE_ROAD) {
      this.roads = this.roads - 1;
    } else if (type === PURCHASE_SETTLEMENT) {
      this.settlements = this.settlements - 1;
    } else {
      this.cities = this.cities - 1;
    }

    if (isSetupPhase) {
      if (type === PURCHASE_SETTLEMENT) {
        this.hasResources = new MapSchema<Boolean>({
          road: true,
          settlement: false,
          city: false,
          gameCard: false
        });

        return;
      }

      this.hasResources = new MapSchema<Boolean>(initialHasResources);
      return;
    };

    if (!isEndSetupPhase) {
      const costs: BuildingCost = buildingCosts[type];

      const updatedResourceCounts = resourceCardTypes.reduce((acc, name) => {
        acc[name] = this.resourceCounts[name] - costs[name];
        return acc;
      }, {} as BuildingCost);

      this.resourceCounts = new MapSchema<Number>(updatedResourceCounts);
    }

    const updatedHasResources = purchaseTypes.reduce((acc, purchaseType) => {
      acc[purchaseType] = Object
        .entries(this.resourceCounts)
        .every(([resource, value]) => value >= buildingCosts[purchaseType][resource])

      return acc;
    }, {} as HasResources);

    this.hasResources = new MapSchema<Boolean>(updatedHasResources);
  }

  saveLastStructure(structure: Structure) {
    this.lastStructureBuilt = new Structure(this.playerSessionId, structure.type, structure.row, structure.col);
  }

  // Object
  //   .values(this.state.players)
  //   .forEach(player => player.giveInitialResources());
  // giveInitialResources() {
  //   if (!this.lastStructureBuilt) return;
  //   const { type, row, col } = this.lastStructureBuilt; // @TODO: Use this

  //   this.resourceCounts = new MapSchema<Number>({
  //     lumber: 3,
  //     sheep: 3,
  //     brick: 3,
  //     wheat: 3,
  //     ore: 3
  //   });

  //   this.onPurchase('NONE', false, true);
  // }

  onCollectLoot() {
    const updatedResourceCounts = resourceCardTypes.reduce((acc, name) => {
      acc[name] = this.resourceCounts[name] + this.availableLoot[name];
      return acc;
    }, {} as BuildingCost);
    this.resourceCounts = new MapSchema<Number>(updatedResourceCounts);

    const updatedAvailableLoot: Loot = {
      ...initialAvailableLoot
    };
    this.availableLoot = new MapSchema<Number>(updatedAvailableLoot);
  }
};

export default Player;