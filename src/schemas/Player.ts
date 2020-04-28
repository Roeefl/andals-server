import { type, Schema, ArraySchema, MapSchema } from '@colyseus/schema';
import GameCard from '../schemas/GameCard';
import DiceRoll from './DiceRoll';
import Structure from './Structure';
import GameBot from './GameBot';
import HeroCard from './HeroCard';

import buildingCosts, { totalResourceTypesRequired } from '../specs/buildingCosts';
import {
  firstmenManifest,
  resourceCardTypes,
  CARD_KNIGHT, CARD_VICTORY_POINT,
  PURCHASE_SETTLEMENT, PURCHASE_GAME_CARD, PURCHASE_CITY,
  initialResourceCounts,
  HARBOR_GENERIC,
  baseGameManifest
} from '../manifest';

import { Loot, BuildingCost, FlexiblePurchase } from '../interfaces';

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
  gameCard: false,
  guard: false
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

interface PluralPurchaseTypes {
  [key: string]: string
};

export const pluralTypes: PluralPurchaseTypes = {
  road: 'roads',
  settlement: 'settlements',
  city: 'cities',
  guard: 'guards',
  gameCard: 'gameCards'
};

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

  @type("number")
  guards: number = 7;

  @type([GameCard])
  gameCards: GameCard[];

  @type("boolean")
  hasPlayedGameCard: boolean = false

  @type("boolean")
  isVisiblePurchaseGameCard: boolean = false;
 
  @type({ map: "number" })
  resourceCounts: MapSchema<Number> // Loot
  
  @type("boolean")
  mustDiscardHalfDeck: boolean = false
  
  @type("boolean")
  mustMoveRobber: boolean = false
  
  @type("number")
  allowFreeRoads: number = 0

  @type("boolean")
  allowFreeGuard: boolean = false

  @type("boolean")
  allowGuardRelocate: boolean = false

  @type("boolean")
  isDeclaringMonopoly: boolean = false

  @type(["string"])
  allowStealingFrom: string[]

  @type("boolean")
  isVisibleSteal = false

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

  @type("string")
  flexiblePurchase: string | null

  @type("boolean")
  hasLongestRoad: boolean = false;

  @type("boolean")
  hasLargestArmy: boolean = false;

  @type(Structure)
  lastStructureBuilt: Structure | null = null;

  @type(HeroCard)
  currentHeroCard: HeroCard

  @type("boolean")
  hasPlayedHeroCard: boolean = false;

  @type("string")
  heroPrivilege: string | null = null;

  @type("boolean")
  swappingHeroCard: boolean = false;

  @type("boolean")
  allowDirectTrade: boolean = false;

  @type("number")
  bankTradeRate: number
  
  @type("boolean")
  allowRemoveRoad: boolean = false;

  @type("string")
  allowKill: string | null = null;

  @type("boolean")
  allowCollectAll: boolean = true;

  constructor(sessionId: string, options: PlayerOptions, color: string, playerIndex: number, bankTradeRate: number = baseGameManifest.bankTradeRate) {
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

    this.ownedHarbors = new MapSchema<Boolean>({
      ...initialOwnedHarbors
    });

    this.isBot = false;
    this.bankTradeRate = bankTradeRate;
    this.flexiblePurchase = null;
  }

  restore(fromBot: GameBot) {
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
    return this.gameCards.filter(({ type }) => type === CARD_KNIGHT).length;
  }

  get totalAvailableLoot() {
    const counts: number[] = Object.values(this.availableLoot);
    return counts.reduce((d1, d2) => d1 + d2, 0);
  }

  get totalResourceCounts() {
    const counts: number[] = Object.values(this.resourceCounts);
    return counts.reduce((d1, d2) => d1 + d2, 0);
  }

  initializeSetupPhase() {
    this.hasResources = new MapSchema<Boolean>({
      road: false,
      settlement: true,
      city: false,
      gameCard: false,
      guard: false
    });
  }

  initialGuardSetupPhase() {
    this.hasResources = new MapSchema<Boolean>({
      road: false,
      settlement: false,
      city: false,
      gameCard: false,
      guard: true
    });
  }

  onPurchase(type: string, isSetupPhase: boolean = false, dontUpdateResourceCounts: boolean = false, flexiblePurchase?: FlexiblePurchase) {
    if (type !== PURCHASE_GAME_CARD) {
      const typePlural: string = pluralTypes[type];
      this[typePlural]--;
    }

    if ([PURCHASE_SETTLEMENT, PURCHASE_CITY].includes(type))
      this.victoryPoints++;

    if (isSetupPhase) {
      if (type === PURCHASE_SETTLEMENT) {
        this.hasResources = new MapSchema<Boolean>({
          road: true,
          settlement: false,
          city: false,
          gameCard: false,
          guard: false
        });

        return;
      }

      this.hasResources = new MapSchema<Boolean>({
        ...initialHasResources
      });
      return;
    };

    if (dontUpdateResourceCounts) {
      this.updateHasResources();
      return;
    };
    
    const costs: BuildingCost = buildingCosts[type];

    const updatedResourceCounts = resourceCardTypes.reduce((acc, name) => {
      acc[name] = this.resourceCounts[name] - costs[name];
      return acc;
    }, {} as BuildingCost);

    const { swapWhich, swapWith } = flexiblePurchase || {};
    console.log("onPurchase -> swapWhich", swapWhich)
    console.log("onPurchase -> swapWith", swapWith)

    if (swapWhich && swapWith) {
      updatedResourceCounts[swapWhich]++;
      updatedResourceCounts[swapWith]--;
    }
    console.log("onPurchase -> updatedResourceCounts", updatedResourceCounts)

    this.resourceCounts = new MapSchema<Number>({
      ...updatedResourceCounts
    });
    this.updateHasResources();
  }

  onPurchaseGameCard(purchasedCard: GameCard) {
    const updatedCards = [
      ...this.gameCards,
      purchasedCard
    ];
    
    this.gameCards = new ArraySchema<GameCard>(
      ...updatedCards
    );

    this.onPurchase(PURCHASE_GAME_CARD);

    if (purchasedCard.type === CARD_VICTORY_POINT)
      this.victoryPoints++;
  }

  onReturnGameCard(gameCardIndex: number) {
    const updatedGameCards = [
      ...this.gameCards
    ].filter((card, index) => index !== gameCardIndex);
    
    this.gameCards = new ArraySchema<GameCard>(
      ...updatedGameCards
    );
  }

  updateHasResources() {
    const updatedHasResources = firstmenManifest.purchaseTypes.reduce((acc, purchaseType) => {
      acc[purchaseType] = Object
        .entries(this.resourceCounts)
        .every(([resource, value]) => {
          const purchaseTypePlural: string = pluralTypes[purchaseType];
          const availablePieces = this[purchaseTypePlural];
          
          return (
            value >= buildingCosts[purchaseType][resource] &&
            (purchaseType === PURCHASE_GAME_CARD || availablePieces > 0)
          );
        });

      return acc;
    }, {} as HasResources);

    this.hasResources = new MapSchema<Boolean>({
      ...updatedHasResources
    });
  }

  saveLastStructure(structure: Structure) {
    this.lastStructureBuilt = new Structure(this.playerSessionId, structure.type, structure.row, structure.col);
  }

  onCollectSingleResoruceLoot(resource: string) {
    if (!resource) return;

    this.resourceCounts = new MapSchema<Number>({
      ...this.resourceCounts,
      [resource]: this.resourceCounts[resource] + this.availableLoot[resource]
    });

    this.availableLoot = new MapSchema<Number>({
      ...this.availableLoot,
      [resource]: 0
    });

    this.updateHasResources(); 
  }

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
    };

    this.ownedHarbors = new MapSchema<Boolean>({
      ...updatedHarbors
    });

    if (harborType === HARBOR_GENERIC)
      this.bankTradeRate = 3;
  }

  eligibleResourceTypesForPurchase(purchaseType: string) {
    return Object
      .entries(this.resourceCounts)
      .map(([resource, value]) => value >= buildingCosts[purchaseType][resource])
      .length;
  }

  allowFlexiblePurchase(purchaseType: string) {
    const hasEnough: boolean = this.eligibleResourceTypesForPurchase(purchaseType) >= totalResourceTypesRequired(purchaseType) - 1;

    this.hasResources = new MapSchema<Boolean>({
      ...this.hasResources,
      [purchaseType]: hasEnough
    });
  }
};

export default Player;