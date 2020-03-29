import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import Building from './Building';
import Road from './Road';

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

  @type("number")
  settlements: number = 5;

  @type("number")
  cities: number = 4;

  @type("number")
  roads: number = 15;

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
  }
};

export default Player;
