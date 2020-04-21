import { type, MapSchema, ArraySchema } from '@colyseus/schema';
import GameState from '../game/GameState';

import HexTile from '../schemas/HexTile';
import GameCard from '../schemas/GameCard';
import ClanArea from '../schemas/ClanArea';
import WildlingClearing from '../schemas/WildlingClearing';
import Guard from '../schemas/Guard';
import HeroCard from '../schemas/HeroCard';
import WildlingToken from '../schemas/WildlingToken';

import { GameManifest, RoomOptions, WildlingCounts, ClanAreaManifest } from '../interfaces';
import { initialSpawnWildlingCounts, clanNames, clearings } from '../specs/wildlings';

class FirstMenGameState extends GameState {
  @type("number")
  wallBreaches

  @type({ map: "number" })
  spawnCounts: WildlingCounts

  @type({ map: ClanArea })
  clanAreas: MapSchema<ClanArea>

  @type([WildlingClearing])
  wildlingClearings: WildlingClearing[]

  @type([Guard])
  wall: Guard[]

  @type([HeroCard])
  heroCards: HeroCard[]

  @type([WildlingToken])
  wildlingTokens: WildlingToken[]

  constructor(manifest: GameManifest, board: HexTile[], gameCards: GameCard[], roomOptions: RoomOptions, wildlingTokens: WildlingToken[], heroCards: HeroCard[]) {
    super(manifest, board, gameCards, roomOptions);

    this.wallBreaches = 0;

    this.spawnCounts = new MapSchema<Number>({
      ...initialSpawnWildlingCounts
    });

    const initialClanAreas: ClanAreaManifest = clanNames
      .reduce((acc, name) => {
        acc[name] = new ClanArea(name);
        return acc;
      }, {} as ClanAreaManifest);

    this.clanAreas = new MapSchema<ClanArea>({
      ...initialClanAreas
    });

    const initialClearings = clearings
      .map(({ trails, clans }) => new WildlingClearing(trails, clans));

    this.wildlingClearings = new ArraySchema<WildlingClearing>(
      ...initialClearings
    );

    const initialWall = new Array(20).fill(new Guard(null, -1, -1));
    this.wall = new ArraySchema<Guard>(
      ...initialWall
    );

    this.wildlingTokens = new ArraySchema<WildlingToken>(
      ...wildlingTokens
    );

    this.heroCards = new ArraySchema<HeroCard>(
      ...heroCards
    );
  }
};

export default FirstMenGameState;

