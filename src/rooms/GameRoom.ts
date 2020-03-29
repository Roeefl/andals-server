import { Room, Client } from 'colyseus';
import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import Player from '../schemas/Player';
import Tile from '../schemas/Tile';
import Harbor from '../schemas/Harbor';
import ResourceCard from '../schemas/ResourceCard';
import GameCard from '../schemas/GameCard';
import { MESSAGE_ROOM_STATE, MESSAGE_CHAT } from '../constants';

import {
  resourceCardTypes, DESERT,
  availableInitialTileTypes, availableInitialTileValues,
  availableInitialGameCards
} from '../manifest';

const maxClients = 4;
const maxReconnectionTime = 1; // 60;

const totalTiles = 19;

const totalResourceCards = 19;

// 25 development cards consisting of 14 knight/soldier cards, 6 progress cards, and 5 victory points.
// Four building costs cards, one for each player.
// "Longest Road" and "Largest Army" award cards.
// Two dice, one red, one yellow.
// Extra harbor pieces for placement of random harbors (optional).

class State extends Schema {
  @type("number")
  currentTurn: number = -1;

  @type("boolean")
  isGameStarted: boolean = false;

  @type("number")
  robberPosition: number = -1;

  @type({ map: Player })
  players = new MapSchema<Player>();

  @type(["number"])
  dice = new ArraySchema<Number>(0, 0);

  @type([Tile])
  board: Tile[]

  @type([ResourceCard])
  resourceCards: ResourceCard[]

  @type([GameCard])
  gameCards: GameCard[]

  @type([Harbor])
  harbors: Harbor[] = new ArraySchema<Harbor>();

  constructor(board: Tile[], resourceCards: ResourceCard[], gameCards: GameCard[]) {
    super();
    
    this.board = new ArraySchema<Tile>(...board);
    this.resourceCards = new ArraySchema<ResourceCard>(...resourceCards);
    this.gameCards = new ArraySchema<GameCard>(...gameCards);
    this.robberPosition = board.findIndex(tile => tile.resource === DESERT);
  }
};

class GameRoom extends Room<State> {
  onCreate(options: any) {
    console.log("GameRoom -> onCreate -> options", options);

    const initialBoard = this.initialBoard();
    const initialResourceCards = this.initialResourceCards();
    const initialGameCards = this.initialGameCards();
    
    const gameState = new State(initialBoard, initialResourceCards, initialGameCards);
    this.setState(gameState);
  };

  initialBoard() {
    const board = [];

    let availableTileTypes: string[] = [
      ...availableInitialTileTypes
    ];

    let availableTileValues: number[] = [
      ...availableInitialTileValues
    ];

    for (let t = 0; t < totalTiles; t++) {
      const randomTypeIndex = Math.floor(Math.random() * availableTileTypes.length);
      const randomType = availableTileTypes[randomTypeIndex];

      const randomValueIndex = Math.floor(Math.random() * availableTileValues.length);
      const randomValue = randomType === DESERT
        ? 0
        : availableTileValues[randomValueIndex];

      const tile = new Tile(randomType, randomValue);

      board.push(tile);

      availableTileTypes.splice(randomTypeIndex, 1);
      availableTileValues.splice(randomValueIndex, 1);
    }

    return board;
  }

  // 19 Resource cards of each terrain tile
  initialResourceCards() {
    const allCards: ResourceCard[] = [];

    for (let r = 0; r < resourceCardTypes.length; r++) {
      const currentType = resourceCardTypes[r];

      for (let c = 0; c < totalResourceCards; c++) {
        const card = new ResourceCard(currentType);
        allCards.push(card);
      }
    }

    return allCards;
  }

  initialGameCards() {
    const cards = [];

    let availableGameCards: string[] = [
      ...availableInitialGameCards
    ];

    for (let c = 0; c < availableInitialGameCards.length; c++) {
      const randomCardIndex = Math.floor(Math.random() * availableGameCards.length);
      const randomCardType = availableGameCards[randomCardIndex];

      const card = new GameCard(randomCardType);

      cards.push(card);

      availableGameCards.splice(randomCardIndex, 1);
    }

    return cards;
  }

  // 2 Special Cards: Longest Road & Largest Army
  // 4 Building Costs Cards
  initialIfoCards() {
    return [];
  }

  onJoin(client: Client, options: any) {
    this.broadcast({
      type: MESSAGE_ROOM_STATE,
      sender: 'GameRoom',
      message: `${options.nickname || client.sessionId} has joined the room.`
    });

    this.state.players[client.sessionId] = new Player(client.sessionId, options);
  
    if (Object.keys(this.state.players).length >= maxClients)
      this.lock();
  };

  async onLeave(client: Client, isConsented: boolean) {
    // flag client as inactive for other users
    this.state.players[client.sessionId].isConnected = false;

    this.broadcast({
      type: MESSAGE_ROOM_STATE,
      sender: 'GameRoom',
      message: `${this.state.players[client.sessionId].nickname || client.sessionId} has left the room.`
    });

    try {
      // allow disconnected client to reconnect into this room until 20 seconds
      await this.allowReconnection(client, maxReconnectionTime);
      
      // client returned! let's re-activate it.
      this.state.players[client.sessionId].isConnected = true;
    } catch (e) {
      // 20 seconds expired. let's remove the client.
      delete this.state.players[client.sessionId];
    }
  };

  onMessage(client: Client, data: any) {
    const { sessionId = '' } = client;
    const { message = '' } = data;

    const player = this.state.players[client.sessionId];

    console.info(`GameRoom received message | from ${sessionId} | ${message}`);
    
    this.broadcast({
      type: MESSAGE_CHAT,
      sender: player.nickname || sessionId,
      message
    });

    if (message.command === "left") {
      player.x -= 1;
    } else if (message.command === "right") {
      player.x += 1;
    }
  };

  onDispose(){
    console.log("GameRoom -> onDispose -> onDispose");
  };
};

export default GameRoom;
