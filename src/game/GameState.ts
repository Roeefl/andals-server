import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';

import Player from '../schemas/Player';
import HexTile from '../schemas/HexTile';
import Structure from '../schemas/Structure';
import Road from '../schemas/Road';
import GameCard from '../schemas/GameCard';
import { DESERT } from '../manifest';

const totalResourceCards = 19;

class GameState extends Schema {
  @type("number")
  maxClients: number

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
  dice = new ArraySchema<Number>(0, 0);

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

  constructor(roomTitle: string, board: HexTile[], gameCards: GameCard[]) {
    super();

    this.roomTitle = roomTitle;
    
    this.board = new ArraySchema<HexTile>(...board);

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

    this.maxClients = 2; // @TODO: ENable in Creating Room Settings
  }
};

export default GameState;