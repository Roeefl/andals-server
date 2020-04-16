import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';

import Player from '../schemas/Player';
import HexTile from '../schemas/HexTile';
import Structure from '../schemas/Structure';
import Road from '../schemas/Road';
import GameCard from '../schemas/GameCard';
import { DESERT } from '../manifest';
import { RoomOptions } from '../interfaces';

const totalResourceCards = 19;

class GameState extends Schema {
  @type("number")
  maxClients: number

  @type("boolean")
  withBots: boolean

  @type("boolean")
  autoPickupEnabled: boolean

  @type("boolean")
  friendlyGameLog: boolean

  @type("boolean")
  enableBotReplacement: boolean

  @type("string")
  roomTitle: string

  @type("number")
  currentTurn: number = -1;

  @type("boolean")
  isDiceRolled: boolean = false;

  @type("number")
  currentRound: number = 1;

  @type("number")
  roundStarter: number = -1;

  @type("boolean")
  isGameReady: boolean = false;

  @type("boolean")
  isTurnOrderPhase: boolean = false;

  @type("boolean")
  isSetupPhase: boolean = false;

  @type("boolean")
  setupPhaseTurns: number = 0;

  @type("boolean")
  isGameStarted: boolean = false;

  @type("number")
  robberPosition: number = -1;

  @type({ map: Player })
  players = new MapSchema<Player>();

  @type(["number"])
  dice = new ArraySchema<Number>(6, 6);

  @type([HexTile])
  board: HexTile[]

  @type({ map: "number" })
  resourceCounts = new MapSchema<Number>();

  @type([GameCard])
  gameCards: GameCard[]

  @type([Road])
  roads: Road[]

  @type([Structure])
  structures: Structure[]

  @type(["number"])
  ports: ArraySchema<number>

  constructor(board: HexTile[], gameCards: GameCard[], roomOptions: RoomOptions) {
    super();

    const {
      roomTitle = 'andals.io Game Room',
      maxPlayers = 4,
      playVsBots = false,
      autoPickup = true,
      friendlyGameLog = false,
      enableBotReplacement = true
    } = roomOptions;

    this.roomTitle = roomTitle;
    this.maxClients = maxPlayers;
    this.withBots = playVsBots;
    this.autoPickupEnabled = autoPickup;
    this.friendlyGameLog = friendlyGameLog;
    this.enableBotReplacement = enableBotReplacement;
    
    this.board = new ArraySchema<HexTile>(
      ...board
    );

    // 19 Resource cards of each terrain tile
    this.resourceCounts = new MapSchema<Number>({
      lumber: totalResourceCards,
      sheep: totalResourceCards,
      brick: totalResourceCards,
      wheat: totalResourceCards,
      ore: totalResourceCards
    });

    this.gameCards = new ArraySchema<GameCard>(...gameCards);
    this.robberPosition = board.findIndex(tile => tile.resource === DESERT);

    this.roads = new ArraySchema<Road>();
    this.structures = new ArraySchema<Structure>();

    const randomPortIndices: number[] = [1, Math.floor(Math.random() * 2) * 2]
    this.ports = new ArraySchema<number>(
      ...randomPortIndices
    );
  }
};

export default GameState;
