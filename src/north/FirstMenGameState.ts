import { type, MapSchema, ArraySchema } from '@colyseus/schema';
import GameState from '../game/GameState';

import HexTile from '../schemas/HexTile';
import GameCard from '../schemas/GameCard';
import ClanArea from '../schemas/ClanArea';
import WildlingClearing from '../schemas/WildlingClearing';
import Guard from '../schemas/Guard';
import HeroCard from '../schemas/HeroCard';
import WildlingToken from '../schemas/WildlingToken';
import Player from '../schemas/Player';

import { GameManifest, RoomOptions, WildlingCounts, ClanAreaManifest } from '../interfaces';
import { initialSpawnWildlingCounts, clanNames, clearings } from '../specs/wildlings';
import { wallSectionsCount, wallSectionSize } from '../specs/wall';

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

    this.bankTradeStandardRate = 3;

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
      .map(({ trails, clans }, index) => new WildlingClearing(index, trails, clans));

    this.wildlingClearings = new ArraySchema<WildlingClearing>(
      ...initialClearings
    );

    const initialWall = new Array(wallSectionsCount * wallSectionSize)
      .fill(new Guard(null, -1, -1));
    
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

  wallSection(sectionIndex: number): Guard[] {
    return this.wall.slice(sectionIndex * wallSectionSize, sectionIndex * wallSectionSize + 5);
  }

  get wallSections(): Guard[][] {
    return Array(wallSectionsCount)
      .fill(0)
      .map((section, s) => this.wallSection(s));
  }

  guardsOnWallSection(sectionIndex: number) {
    return this.wallSection(sectionIndex)
      .filter(({ ownerId }) => !!ownerId)
      .length;
  }

  onGuardKilled(sectionIndex: number) {
    const killedGuardIndex: number = sectionIndex * wallSectionSize;

    const killedGuard: Guard = this.wall[killedGuardIndex];
    if (!killedGuard.ownerId) return;

    const owner: Player = this.players[killedGuard.ownerId];
    owner.guards++;

    const updatedWall = [
      ...this.wall
    ];
    updatedWall[killedGuardIndex] = new Guard(null, -1, -1);

    for (let g = 1; g < wallSectionSize; g++) {
      updatedWall[killedGuardIndex + g - 1] = updatedWall[killedGuardIndex + g];
    };

    updatedWall[killedGuardIndex + wallSectionSize - 1] = new Guard(null, -1, -1);

    this.wall = new ArraySchema<Guard>(
      ...updatedWall
    );
  }
};

export default FirstMenGameState;

