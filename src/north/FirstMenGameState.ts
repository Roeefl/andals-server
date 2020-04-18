import { type, MapSchema, ArraySchema } from '@colyseus/schema';
import GameState from '../game/GameState';

import HexTile from '../schemas/HexTile';
import GameCard from '../schemas/GameCard';
import ClanCamps from '../schemas/ClanCamps';
import ClanClearing from '../schemas/ClanClearing';
import Guard from '../schemas/Guard';

import { GameManifest, RoomOptions, WildlingCounts } from '../interfaces';
import { initialSpawnWildlingCounts, clanNames } from '../specs/wildlings';

class FirstMenGameState extends GameState {
  @type("number")
  wallBreaches

  @type({ map: "number" })
  spawnCounts: WildlingCounts

  @type({ map: ClanCamps })
  clanCamps: MapSchema<ClanCamps>

  @type({ map: ClanClearing })
  clanClearings: MapSchema<ClanClearing>

  @type([Guard])
  wall: Guard[]

  constructor(manifest: GameManifest, board: HexTile[], gameCards: GameCard[], roomOptions: RoomOptions) {
    super(manifest, board, gameCards, roomOptions);

    this.wallBreaches = 0;

    this.spawnCounts = new MapSchema<Number>({
      ...initialSpawnWildlingCounts
    });

    const initialClanCamps = clanNames
      .reduce((acc, name) => {
        acc[name] = new ClanCamps(name);
        return acc;
      }, {});

    this.clanCamps = new MapSchema<ClanCamps>({
      ...initialClanCamps
    });

    const initialClanClearings = clanNames
      .reduce((acc, name) => {
        acc[name] = new ClanClearing(name);
        return acc;
      }, {});

    this.clanClearings = new MapSchema<ClanClearing>({
      ...initialClanClearings
    });

    const initialWall = new Array(20).fill(new Guard(null, -1, -1));
    this.wall = new ArraySchema<Guard>(
      ...initialWall
    );
  }
};

export default FirstMenGameState;

