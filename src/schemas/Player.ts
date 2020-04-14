import { type, Schema, ArraySchema, MapSchema } from '@colyseus/schema';
import GameCard from '../schemas/GameCard';
import DiceRoll from './DiceRoll';
import Structure from './Structure';

import buildingCosts, { BuildingCost } from '../buildingCosts';
import {
  purchaseTypes,
  resourceCardTypes,
  CARD_KNIGHT, CARD_VICTORY_POINT,
  PURCHASE_ROAD, PURCHASE_SETTLEMENT, PURCHASE_GAME_CARD, PURCHASE_CITY,
  initialResourceCounts,
  Loot
} from '../manifest';

export interface PlayerOptions {
  nickname: string
  color?: string
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

interface OwnedHarbors {
  [key: string]: boolean
};

const initialOwnedHarbors: OwnedHarbors = {
  harborGeneric: false,
  lumber: false,
  sheep: false,
  brick: false,
  wheat: false,
  ore: false
};

// Four sets of wooden player pieces in four different colors
// each containing five settlements, four cities, and 15 roads.
class Player extends Schema {
  @type("string")
  playerSessionId: string

  @type("boolean")
  isBot: boolean

  @type("number")
  playerIndex: number

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
  victoryPoints: number = 0;

  @type("number")
  settlements: number = 5;

  @type("number")
  cities: number = 4;

  @type("number")
  roads: number = 15;

  @type([GameCard])
  gameCards: GameCard[];

  @type("boolean")
  hasPlayedGameCard: boolean = false
  
  @type({ map: "number" })
  resourceCounts: MapSchema<Number> // Loot
  
  @type("boolean")
  mustDiscardHalfDeck: boolean = false
  
  @type("boolean")
  mustMoveRobber: boolean = false
  
  @type("number")
  roadBuildingPhase: number = 0

  @type("boolean")
  isDeclaringMonopoly: boolean = false

  @type(["string"])
  allowStealingFrom: string[]

  @type({ map: "boolean" })
  ownedHarbors: OwnedHarbors

  @type({ map: "number" })
  availableLoot: MapSchema<Number> // Loot

  @type("string")
  tradingWith: string | null = null

  @type({ map: "number" })
  tradeCounts: Loot

  @type("string")
  pendingTrade: string = ''

  @type("boolean")
  isTradeConfirmed: boolean = false

  @type("boolean")
  isWaitingTradeRequest: boolean = false

  @type({ map: "boolean" })
  hasResources: MapSchema<Boolean> 

  @type("boolean")
  hasLongestRoad: boolean = false;

  @type("boolean")
  hasLargestArmy: boolean = false;

  @type(Structure)
  lastStructureBuilt: Structure | null = null;

  constructor(sessionId: string, options: PlayerOptions, color: string, playerIndex: number) {
    super();
    
    const { nickname = 'John Doe' } = options;
    // Disabled until enabling color distinction between players
    // color = '#214013'
    // } = options;
    
    // const randomInt = Math.floor(Math.random() * 9999);
    this.nickname = nickname;

    this.playerSessionId = sessionId;
    this.playerIndex = playerIndex;
    this.isConnected = true;

    this.gameCards = new ArraySchema<GameCard>();
    
    this.rolls = new ArraySchema<DiceRoll>();
    
    this.color = color;
    
    this.resourceCounts = new MapSchema<Number>({
      ...initialResourceCounts
    });
    
    this.availableLoot = new MapSchema<Number>({
      ...initialResourceCounts
    });
    
    this.tradeCounts = new MapSchema<Number>({
      ...initialResourceCounts
    });
    
    this.hasResources = new MapSchema<Boolean>({
      ...initialHasResources
    });
    
    this.allowStealingFrom = new ArraySchema<string>();

    this.hasResources = new MapSchema<Boolean>({
      ...initialHasResources
    });

    this.ownedHarbors = new MapSchema<Boolean>({
      ...initialOwnedHarbors
    });

    this.isBot = false;
  }

  get knights() {
    return this.gameCards.filter(({ type }) => type === CARD_KNIGHT).length;
  }

  totalResourceCounts() {
    const counts: number[] = Object.values(this.resourceCounts);
    return counts.reduce((d1, d2) => d1 + d2, 0);
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
      this.roads--;
    } else if (type === PURCHASE_SETTLEMENT) {
      this.settlements--;
      this.victoryPoints++;
    } else if (type === PURCHASE_CITY) {
      this.cities--;
      this.victoryPoints++;
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

      this.hasResources = new MapSchema<Boolean>({
        ...initialHasResources
      });
      return;
    };

    if (!isEndSetupPhase) {
      const costs: BuildingCost = buildingCosts[type];

      const updatedResourceCounts = resourceCardTypes.reduce((acc, name) => {
        acc[name] = this.resourceCounts[name] - costs[name];
        return acc;
      }, {} as BuildingCost);

      this.resourceCounts = new MapSchema<Number>({
        ...updatedResourceCounts
      });
    }

    this.updateHasResources();
  }

  onPurchaseCard(purchasedCard: GameCard) {
    const updatedCards = [
      ...this.gameCards,
      purchasedCard
    ];
    
    this.gameCards = new ArraySchema<GameCard>(
      ...updatedCards
    );

    this.onPurchase(PURCHASE_GAME_CARD);

    if (purchasedCard.type = CARD_VICTORY_POINT)
      this.victoryPoints++;
  }

  updateHasResources() {
    const updatedHasResources = purchaseTypes.reduce((acc, purchaseType) => {
      acc[purchaseType] = Object
        .entries(this.resourceCounts)
        .every(([resource, value]) => value >= buildingCosts[purchaseType][resource]);

      return acc;
    }, {} as HasResources);

    this.hasResources = new MapSchema<Boolean>({
      ...updatedHasResources
    });
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

  //   this.onPurchase('NONE', false, true);
  // }

  onCollectLoot() {
    const updatedResourceCounts = resourceCardTypes.reduce((acc, name) => {
      acc[name] = this.resourceCounts[name] + this.availableLoot[name];
      return acc;
    }, {} as BuildingCost);
    
    this.resourceCounts = new MapSchema<Number>({
      ...updatedResourceCounts
    });

    const updatedAvailableLoot: Loot = {
      ...initialResourceCounts
    };
    this.availableLoot = new MapSchema<Number>({
      ...updatedAvailableLoot
    });

    this.updateHasResources(); 
  }

  updateTradeCounts(resource: string, isRemove: boolean = false) {
    this.resourceCounts = new MapSchema<Number>({
      ...this.resourceCounts,
      [resource]: this.resourceCounts[resource] + (isRemove ? 1 : -1)
    });

    this.tradeCounts = new MapSchema<Number>({
      ...this.tradeCounts,
      [resource]: this.tradeCounts[resource] + (isRemove ? -1 : 1)
    });
  }

  resetTradeCounts() {
    this.tradeCounts = new MapSchema<Number>({
      ...initialResourceCounts
    });
  }

  resetTradeStatus() {
    this.pendingTrade = '';
    this.isWaitingTradeRequest = false;
  }

  cancelTrade() {
    const updatedResourceCounts = resourceCardTypes.reduce((acc, name) => {
      acc[name] = this.resourceCounts[name] + this.tradeCounts[name];
      return acc;
    }, {} as BuildingCost);
    
    this.resourceCounts = new MapSchema<Number>({
      ...updatedResourceCounts
    });

    this.resetTradeCounts();
    this.resetTradeStatus();
    this.tradingWith = null; 
  }

  performTrade(otherPlayerTradeCounts: Loot) {
    const updatedResourceCounts = resourceCardTypes.reduce((acc, name) => {
      acc[name] = this.resourceCounts[name] + otherPlayerTradeCounts[name];
      return acc;
    }, {} as BuildingCost);
    
    this.resourceCounts = new MapSchema<Number>({
      ...updatedResourceCounts
    });

    this.updateHasResources();
  }

  discardResources(discardedCounts: Loot = {}) {
    const updatedResourceCounts = resourceCardTypes.reduce((acc, name) => {
      acc[name] = this.resourceCounts[name] - discardedCounts[name];
      return acc;
    }, {} as BuildingCost);
    
    this.resourceCounts = new MapSchema<Number>({
      ...updatedResourceCounts
    });
  }

  addResource(resource: string) {
    this.resourceCounts = new MapSchema<Number>({
      ...this.resourceCounts,
      [resource]: this.resourceCounts[resource] + 1
    });
  }

  stolenResource(resource: string) {
    this.resourceCounts = new MapSchema<Number>({
      ...this.resourceCounts,
      [resource]: this.resourceCounts[resource] - 1
    });
  }

  advanceRoadBuildingPhase() {
    this.roadBuildingPhase++;

    if (this.roadBuildingPhase === 3) {
      this.roadBuildingPhase = 0;
    }
  }

  gaveAllOfResourceType(resource: string) {
    this.resourceCounts = new MapSchema<Number>({
      ...this.resourceCounts,
      [resource]: 0
    });

    this.updateHasResources();
  }

  receiveHarborPrivileges(harborType: string) {
    const updatedHarbors: OwnedHarbors = {
      ...this.ownedHarbors,
      [harborType]: true
    } ;


    this.ownedHarbors = new MapSchema<Boolean>({
      ...updatedHarbors
    });
  }
};

export default Player;