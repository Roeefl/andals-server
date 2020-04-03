import { Room, Client } from 'colyseus';
import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import Player from '../schemas/Player';
import Tile from '../schemas/Tile';
import Structure from '../schemas/Structure';
import Road from '../schemas/Road';
import ResourceCard from '../schemas/ResourceCard';
import GameCard from '../schemas/GameCard';
import DiceRoll from '../schemas/DiceRoll';

import {
  MESSAGE_GAME_LOG,
  MESSAGE_CHAT,
  MESSAGE_GAME_ACTION,
  MESSAGE_READY,
  MESSAGE_ROLL_DICE,
  MESSAGE_FINISH_TURN,
  MESSAGE_PLACE_ROAD,
  MESSAGE_PLACE_STRUCTURE
} from '../constants';

import {
  TILE_RESOURCE, TILE_WATER, TILE_SPACER,
  resourceCardTypes, DESERT,
  availableInitialTileTypes, availableInitialTileValues,
  availableInitialGameCards,
  availableInitialHarborTypes, harborIndices,
  STRUCTURE_SETTLEMENT, STRUCTURE_CITY
} from '../manifest';

import hexTileMap from '../tilemaps/hexes';
// import initialStructureTileMap from '../tilemaps/structures';

const ROOM_NAME = 'GameRoom';

const MAX_CLIENTS: number = 2;
const LAST_PLAYER: number = MAX_CLIENTS - 1;
const maxReconnectionTime = 1; // 60;

const totalResourceCards = 19;
class State extends Schema {
  @type("number")
  currentTurn: number = -1;

  @type("number")
  currentRound: number = 0;

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

  @type([Tile])
  board: Tile[]

  @type([ResourceCard])
  resourceCards: ResourceCard[]

  @type([GameCard])
  gameCards: GameCard[]

  @type([Road])
  roads: Road[]

  @type([Structure])
  structures: Structure[]

  constructor(board: Tile[], resourceCards: ResourceCard[], gameCards: GameCard[]) {
    super();
    
    this.board = new ArraySchema<Tile>(...board);

    this.resourceCards = new ArraySchema<ResourceCard>(...resourceCards);
    this.gameCards = new ArraySchema<GameCard>(...gameCards);
    this.robberPosition = board.findIndex(tile => tile.resource === DESERT);

    this.roads = new ArraySchema<Road>();
    this.structures = new ArraySchema<Structure>();
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

  // Total of 49 tiles
  initialBoard() {
    const board: Tile[] = [];

    let availableTileTypes: string[] = [
      ...availableInitialTileTypes
    ];

    let availableTileValues: number[] = [
      ...availableInitialTileValues
    ];

    let availableHarborTypes: string[] = [
      ...availableInitialHarborTypes
    ];

    for (let r = 0; r < hexTileMap.length; r++) {
      for (let t = 0; t < hexTileMap[r].length; t++) {
        const currentTile = hexTileMap[r][t];

        if (currentTile === TILE_SPACER) {
          const tile = new Tile(TILE_SPACER);
          board.push(tile);
        } else if (currentTile === TILE_WATER) {
          const tileIndex: number = r * 7 + t;

          if (harborIndices.includes(tileIndex)) {
            const randomTypeIndex =  Math.floor(Math.random() * availableHarborTypes.length);
            const randomType = availableHarborTypes[randomTypeIndex];

            const tile = new Tile(TILE_WATER, randomType);
            board.push(tile);       

            availableHarborTypes.splice(randomTypeIndex, 1);
          } else { // Just water, no harbor
            const waterTile = new Tile(TILE_WATER);
            board.push(waterTile);  
          }
        } else {
          // === TILE_RESOURCE
          const randomTypeIndex = Math.floor(Math.random() * availableTileTypes.length);
          const randomType = availableTileTypes[randomTypeIndex];
    
          const randomValueIndex = Math.floor(Math.random() * availableTileValues.length);
          const randomValue = randomType === DESERT
            ? 0
            : availableTileValues[randomValueIndex];

          const tile = new Tile(TILE_RESOURCE, randomType, randomValue);
          board.push(tile);

          availableTileTypes.splice(randomTypeIndex, 1);
          availableTileValues.splice(randomValueIndex, 1);
        }
      }
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

  onJoin(client: Client, options: any) {
    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${options.nickname || client.sessionId} has joined the room.`
    }, {
      except: client
    });

    this.state.players[client.sessionId] = new Player(client.sessionId, options);
  
    if (Object.keys(this.state.players).length >= MAX_CLIENTS)
      this.lock();
  };

  async onLeave(client: Client, isConsented: boolean) {
    // flag client as inactive for other users
    this.state.players[client.sessionId].isConnected = false;

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${this.state.players[client.sessionId].nickname || client.sessionId} has left the room.`
    }, {
      except: client
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

    const {
      type = MESSAGE_GAME_ACTION,
      message = ''
    } = data;

    const player: Player = this.state.players[client.sessionId];

    // console.info(`GameRoom received message | from ${sessionId} | ${message}`);

    switch (type) {
      case MESSAGE_CHAT:
        this.onChatMessage(player.nickname || sessionId, message);
        break;

      case MESSAGE_ROLL_DICE:
        this.onDiceRoll(data, player);
        break;

      case MESSAGE_PLACE_ROAD:
        this.onPlacingRoad(data, client.sessionId, player.nickname);
        break;

      case MESSAGE_PLACE_STRUCTURE:
        this.onPlacingStructure(data, client.sessionId, player.nickname);
        break;

      case MESSAGE_FINISH_TURN:
        this.onTurnFinish(player);
        break;

      case MESSAGE_READY:
        this.onPlayerReady(client, player);
        break;


      default:
        break;
    }
  };

  onChatMessage(sender: string, message: string) {
    this.broadcast({
      type: MESSAGE_CHAT,
      sender,
      message
    });
  }

  onDiceRoll(data: any, player: Player) {
    const { dice = [3, 3] } = data;
    this.state.dice = new ArraySchema<Number>(...dice);

    const roll = new DiceRoll(dice);

    const updatedRolls = [
      ...player.rolls,
      roll
    ];

    player.rolls = new ArraySchema<DiceRoll>(...updatedRolls);

    this.broadcast({
      type: MESSAGE_ROLL_DICE,
      sender: ROOM_NAME,
      playerName: player.nickname,
      dice
    });
  }

  onPlacingStructure(data: any, ownerId: string, nickname: string) {
    const { row, col } = data;

    const structure = new Structure(ownerId, STRUCTURE_SETTLEMENT, row, col);
    
    const updatedStructures = [
      ...this.state.structures,
      structure
    ];
    
    this.state.structures = new ArraySchema<Structure>(
      ...updatedStructures
    );

    const { resourceCounts } = this.state.players[ownerId];

    this.state.players[ownerId].resourceCounts = new MapSchema<Number>({
      ...resourceCounts,
      lumber: resourceCounts.lumber - 1, 
      brick: resourceCounts.brick - 1,
      wheat: resourceCounts.wheat - 1,
      sheep: resourceCounts.sheep - 1
    });

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${nickname} built a settlement`
    });
  }

  onPlacingRoad(data: any, ownerId: string, nickname: string) {
    const { row, col } = data;

    const road = new Road(ownerId, row, col);

    const updatedRoads = [
      ...this.state.roads,
      road
    ];
    
    this.state.roads = new ArraySchema<Road>(
      ...updatedRoads
    );

    const { resourceCounts } = this.state.players[ownerId];

    this.state.players[ownerId].resourceCounts = new MapSchema<Number>({
      ...resourceCounts,
      lumber: resourceCounts.lumber - 1, 
      brick: resourceCounts.brick - 1
    });

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${nickname} built a road`
    });
  }

  onTurnFinish(player: Player) {
    const {
      isSetupPhase,
      isTurnOrderPhase,
      roundStarter,
      currentTurn,
      setupPhaseTurns,
      currentRound
    } = this.state;

    const isEndOfTurnOrderPhase: Boolean = currentTurn === LAST_PLAYER;
    if (isTurnOrderPhase && isEndOfTurnOrderPhase) {
      this.state.isTurnOrderPhase = false;
      
      const initialRolls = Object
        .values(this.state.players)
        .map((player: Player, playerIndex: number) => ({
          playerIndex,
          nickname: player.nickname,
          initialRoll: player.rolls[0].value
        }));

      const sortedInitialRolls = initialRolls
        .sort((a, b) => a.initialRoll <= b.initialRoll ? 1 : -1);
        
      const { playerIndex, nickname } = sortedInitialRolls[0];
      
      this.state.currentTurn = playerIndex;
      this.state.roundStarter = playerIndex;
      this.state.isSetupPhase = true;

      this.broadcast({
        type: MESSAGE_GAME_LOG,
        sender: ROOM_NAME,
        message: `Turn determination phase finished.`
      });

      this.broadcast({
        type: MESSAGE_GAME_LOG,
        sender: ROOM_NAME,
        message: `Setup phase is starting. ${nickname} is first to play`
      });

      return;
    }

    if (isSetupPhase) {
      if (setupPhaseTurns === LAST_PLAYER) {
        // Give last player in the round another turn and reverse turn order until end of setup phase
        this.state.setupPhaseTurns++;

        this.broadcast({
          type: MESSAGE_GAME_LOG,
          sender: ROOM_NAME,
          message: `${player.nickname} is last in the setup phase and plays a double turn`
        });
        
        return;
      }

      if (setupPhaseTurns === (MAX_CLIENTS * 2 - 1)) {
        // END OF SETUP PHASE
        this.state.currentTurn = this.state.roundStarter;
        this.state.isSetupPhase = false;
        this.state.isGameStarted = true;

        this.broadcast({
          type: MESSAGE_GAME_LOG,
          sender: ROOM_NAME,
          message: 'Setup phase is complete. Game started!'
        });
        
        return;
      }

      if (setupPhaseTurns > LAST_PLAYER) {
        // Reverse turn order phase
        this.state.currentTurn = (currentTurn - 1) % MAX_CLIENTS;
        if (this.state.currentTurn < 0)
          this.state.currentTurn = MAX_CLIENTS - 1;

        this.state.setupPhaseTurns++;

        this.finishTurnBroadcast(player);
        return;
      }

      this.state.currentTurn = (currentTurn + 1) % MAX_CLIENTS;
      this.state.setupPhaseTurns++;
      this.finishTurnBroadcast(player);
      return;
    }
     
    // Not turn order phase - round consists of MAX_CLIENTS turns
    this.state.currentTurn = (currentTurn + 1) % MAX_CLIENTS;
    const isEndOfRound: Boolean = currentTurn === roundStarter;

    this.finishTurnBroadcast(player);
    if (isEndOfRound) {
      this.broadcast({
        type: MESSAGE_GAME_LOG,
        sender: ROOM_NAME,
        message: `Round ${currentRound} complete. Starting Round ${currentRound + 1}`
      });

      this.state.currentRound++;
    }
  }

  finishTurnBroadcast(player: Player) {
    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${player.nickname} finished his turn`
    });
  }

  onPlayerReady(client: Client, player: Player) {
    player.isReady = !player.isReady;

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${player.nickname} is ${player.isReady ? '' : 'not'} ready`
    }, {
      except: client
    });

    const activeClients: number = Object.keys(this.state.players).length;

    if (activeClients >= MAX_CLIENTS) {
      const isAllReady = Object
        .values(this.state.players)
        .every(playerData => playerData.isReady);
        
      if (isAllReady) {
        this.state.isGameReady = true;
        this.state.isTurnOrderPhase = true;
        this.state.currentTurn = 0;

        this.broadcast({
          type: MESSAGE_GAME_LOG,
          sender: ROOM_NAME,
          message: 'All Players Ready'
        });

        this.broadcast({
          type: MESSAGE_GAME_LOG,
          sender: ROOM_NAME,
          message: 'Starting turn order determination phase'
        });
      }
    }
  }

  onDispose() {
    console.log("GameRoom -> onDispose -> onDispose");
  };
};

export default GameRoom;
