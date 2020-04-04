import { Room, Client } from 'colyseus';
import { type, Schema, MapSchema, ArraySchema } from '@colyseus/schema';
import Player from '../schemas/Player';
import HexTile from '../schemas/HexTile';
import Structure from '../schemas/Structure';
import Road from '../schemas/Road';
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
  DESERT,
  availableInitialTileTypes, availableInitialTileValues,
  availableInitialGameCards,
  availableInitialHarborTypes, harborIndices,
  PURCHASE_SETTLEMENT, PURCHASE_ROAD, PURCHASE_CITY,
  playerColors,
  initialAvailableLoot,
  Loot, AvailableLoot
} from '../manifest';

import hexTileMap from '../tilemaps/hexes';
// import initialStructureTileMap from '../tilemaps/structures';

const ROOM_NAME = 'GameRoom';

const MAX_CLIENTS: number = 2;
const LAST_PLAYER: number = MAX_CLIENTS - 1;
const maxReconnectionTime = 1; // 60;
const totalResourceCards = 19;

class State extends Schema {
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
  }
};

class GameRoom extends Room<State> {
  onCreate(options: any) {
    console.info("GameRoom -> onCreate -> options", options);
    const { roomTitle = 'firstmen.io game room' } = options;

    const initialBoard = this.initialBoard();
    const initialGameCards = this.initialGameCards();
    
    const gameState = new State(roomTitle , initialBoard, initialGameCards);
    this.setState(gameState);
  };

  // Total of 49 tiles
  initialBoard() {
    const board: HexTile[] = [];

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
          const tile = new HexTile(TILE_SPACER, r, t);
          board.push(tile);
        } else if (currentTile === TILE_WATER) {
          const tileIndex: number = r * 7 + t;

          if (harborIndices.includes(tileIndex)) {
            const randomTypeIndex =  Math.floor(Math.random() * availableHarborTypes.length);
            const randomType = availableHarborTypes[randomTypeIndex];

            const tile = new HexTile(TILE_WATER, r, t, randomType);
            board.push(tile);       

            availableHarborTypes.splice(randomTypeIndex, 1);
          } else { // Just water, no harbor
            const waterTile = new HexTile(TILE_WATER, r, t);
            board.push(waterTile);  
          }
        } else {
          // === TILE_RESOURCE
          const randomTypeIndex = Math.floor(Math.random() * availableTileTypes.length);
          const randomType = availableTileTypes[randomTypeIndex];

          let tile = null;
          if (randomType === DESERT) {
            tile = new HexTile(TILE_RESOURCE, r, t, randomType, 0);
          } else {
            const randomValueIndex = Math.floor(Math.random() * availableTileValues.length);
            const randomValue = availableTileValues[randomValueIndex];

            tile = new HexTile(TILE_RESOURCE, r, t, randomType, randomValue);
            availableTileValues.splice(randomValueIndex, 1);
          };

          availableTileTypes.splice(randomTypeIndex, 1);
          board.push(tile);
        }
      }
    }

    return board;
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

  get activeClients() {
    return Object
      .keys(this.state.players)
      .length;
  }

  onJoin(client: Client, options: any) {
    const color = playerColors[this.activeClients];
    const addedPlayer = new Player(client.sessionId, options, color);
    
    this.state.players[client.sessionId] = addedPlayer;
    
    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${addedPlayer.nickname || client.sessionId} has joined the room.`
    }, {
      except: client
    });
  
    if (this.activeClients >= MAX_CLIENTS)
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
        this.onChatMessage(player.nickname ,sessionId, message);
        break;

      case MESSAGE_ROLL_DICE:
        this.onDiceRoll(data, player);
        break;

      case MESSAGE_PLACE_ROAD:
        this.onPurchaseRoad(data, client.sessionId, player.nickname);
        break;

      case MESSAGE_PLACE_STRUCTURE:
        this.onPurchaseStructure(data, client.sessionId, player.nickname, PURCHASE_SETTLEMENT); //@TODO: ALlow city as well.
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

  onChatMessage(sender: string, senderSessionId: string, message: string) {
    this.broadcast({
      type: MESSAGE_CHAT,
      sender,
      senderSessionId,
      message
    });
  }

  onDiceRoll(data: any, player: Player) {
    const { dice = [3, 3] } = data;
    this.state.dice = new ArraySchema<Number>(...dice);
    this.state.isDiceRolled = true;

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
    
    if (this.state.isGameStarted) this.setResourcesLoot(roll.value);
  }

  setResourcesLoot(diceTotal: number) {
    const updatedLoot = Object
      .keys(this.state.players)
      .reduce((acc, ownerId) => {
        acc[ownerId] = {
          ...initialAvailableLoot
        };

        return acc;
      }, {} as AvailableLoot);
      
    
    // Game started - round 1 or higher - allocate resources from stash to players according to hexes state
    this.state.board
      .filter(({ type, resource }, index) => type === TILE_RESOURCE && !!resource && resource !== DESERT && index !== this.state.robberPosition)
      .filter(({ value }) => value === diceTotal)
      // 18 Resource-type tiles left to loop over
      .forEach(({ resource, row: tileRow, col: tileCol }) => {
        console.log("GameRoom -> setResourcesLoot -> resource row col", resource, tileRow, tileCol)

        const tileStructureIndices = [
          [tileRow, tileCol * 2], [tileRow, tileCol * 2 + 1], [tileRow, tileCol * 2 + 2], // top-left, top, top-right
          [tileRow + 1, tileCol * 2 + 1], [tileRow + 1, tileCol * 2 + 2], [tileRow + 1, tileCol * 2 + 3], // bottom-left, bottom, bottom-right
        ];
        console.log("GameRoom -> setResourcesLoot -> tileStructureIndices", tileStructureIndices)

        this.state.structures
          .forEach(({ row, col, ownerId, type }) => {
          console.log("GameRoom -> setResourcesLoot -> row", row, col, ownerId, type )
            if (!!resource && tileStructureIndices.some(([sRow, sCol]) => sRow === row && sCol === col)) {
              const addedValue = type === PURCHASE_CITY ? 2 : 1;
              console.log("GameRoom -> setResourcesLoot -> addedValue", addedValue)
              updatedLoot[ownerId][resource] += addedValue;
            }
          });
      });

      console.log("GameRoom -> setResourcesLoot -> final updatedLoot", updatedLoot)


    Object
      .entries(this.state.players)
      .forEach(([sessionId, player]) => {
        const playerUpdatedLoot = updatedLoot[sessionId];
        console.log("GameRoom -> playerUpdatedLoot", playerUpdatedLoot)

        player.availableLoot = new MapSchema<Number>({
          ...playerUpdatedLoot
        });

        console.log('player available loot: ', player.availableLoot);
      });
  }

  onPurchaseStructure(data: any, ownerId: string, nickname: string, type: string = PURCHASE_SETTLEMENT) {
    const { row, col } = data;

    const structure = new Structure(ownerId, type, row, col);
    
    const updatedStructures = [
      ...this.state.structures,
      structure
    ];
    
    this.state.structures = new ArraySchema<Structure>(
      ...updatedStructures
    );

   const owner: Player = this.state.players[ownerId];
   owner.onPurchase(type, this.state.isSetupPhase);
   owner.saveLastStructure(structure);

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${nickname} built a settlement`
    });
  }

  onPurchaseRoad(data: any, ownerId: string, nickname: string) {
    const { row, col } = data;

    const road = new Road(ownerId, row, col);

    const updatedRoads = [
      ...this.state.roads,
      road
    ];
    
    this.state.roads = new ArraySchema<Road>(
      ...updatedRoads
    );

    const owner: Player = this.state.players[ownerId];
    owner.onPurchase(PURCHASE_ROAD, this.state.isSetupPhase);

    this.broadcast({
      type: MESSAGE_GAME_LOG,
      sender: ROOM_NAME,
      message: `${nickname} built a road`
    });
  }

  initializeSetupPhase() {
    Object
      .values(this.state.players)
      .forEach(player => player.initializeSetupPhase());
  }

  initializeFirstRoundStart() {
    Object
      .values(this.state.players)
      .forEach(player => player.giveInitialResources());

    // player.giveResources(this.state.structures, this.state.dice);
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

    this.state.isDiceRolled = false;

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

      this.initializeSetupPhase();

      this.broadcast({
        type: MESSAGE_GAME_LOG,
        sender: ROOM_NAME,
        message: 'Turn determination phase finished.'
      });

      this.broadcast({
        type: MESSAGE_GAME_LOG,
        sender: ROOM_NAME,
        message: 'Setup phase is starting.'
      });

      this.broadcast({
        type: MESSAGE_GAME_LOG,
        sender: ROOM_NAME,
        message: `${nickname} is first to play`
      });

      return;
    }

    if (isSetupPhase) {
      player.initializeSetupPhase();

      if (setupPhaseTurns === LAST_PLAYER) {
        // Give last player in the round another turn
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
        this.initializeFirstRoundStart();

        this.broadcast({
          type: MESSAGE_GAME_LOG,
          sender: ROOM_NAME,
          message: 'Setup phase is complete. Game started!'
        });
        
        return;
      }

      if (setupPhaseTurns > LAST_PLAYER) {
        // Reverse turn order until the end of setup phase
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

    if (!this.state.isTurnOrderPhase)
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

    if (this.activeClients >= MAX_CLIENTS) {
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
    console.info("GameRoom -> onDispose -> onDispose");
  };
};

export default GameRoom;
