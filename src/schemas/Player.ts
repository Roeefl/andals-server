import { type, Schema, ArraySchema } from '@colyseus/schema';
import ResourceCard from './ResourceCard';
import GameCard from '../schemas/GameCard';
import DiceRoll from './DiceRoll';

interface PlayerOptions {
  nickname: string
  color: string
}

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

  @type([ResourceCard])
  resourceCards: ResourceCard[];

  @type([GameCard])
  gameCards: GameCard[];

  @type("boolean")
  hasLongestRoad: boolean = false;

  @type("boolean")
  hasLargestArmy: boolean = false;

  constructor(sessionId: string, options: PlayerOptions) {
    super();
    
    const {
      nickname = 'John Doe',
      color = '#214013'
    } = options;

    this.playerSessionId = sessionId;
    this.isConnected = true;
    this.nickname = nickname;
    this.color = color;
    this.resourceCards = new ArraySchema<ResourceCard>();
    this.gameCards = new ArraySchema<GameCard>();
    this.rolls = new ArraySchema<DiceRoll>();
  }
};

export default Player;
