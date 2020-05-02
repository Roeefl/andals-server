import { type, MapSchema, ArraySchema } from '@colyseus/schema';
import GameState from '../game/GameState';

import HexTile from '../schemas/HexTile';
import GameCard from '../schemas/GameCard';
import ClanArea from '../schemas/ClanArea';
import WildlingClearing from '../schemas/WildlingClearing';
import Guard from '../schemas/Guard';
import HeroCard, { HERO_CARD_Thoros } from '../schemas/HeroCard';
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
  
  get wallSections(): Guard[][] {
    return Array(wallSectionsCount)
      .fill(0)
      .map((section, s) => this.wallSection(s));
  }
  
  wallSection(sectionIndex: number): Guard[] {
    return this.wall.slice(sectionIndex * wallSectionSize, sectionIndex * wallSectionSize + 5);
  }

  guardsOnWallSection(sectionIndex: number) {
    return this.wallSection(sectionIndex)
      .filter(({ ownerId }) => !!ownerId)
      .length;
  }

  onAllGuardsKilled(sectionIndex: number) {
    const updatedWall: Guard[] = [
      ...this.wall
    ];

    for (let g = (wallSectionSize * sectionIndex); g < (wallSectionSize * (sectionIndex + 1)); g++) {
      const currentGuard = this.wall[g];

      const owner: Player = this.players[currentGuard.ownerId];
      owner.guards++;

      updatedWall[g] = new Guard(null, -1, -1);
    };

    this.wall = new ArraySchema<Guard>(
      ...updatedWall
    );
  }

  onGuardKilled(sectionIndex: number, position: number = 0, isKilledByWildlings: boolean = true) {
    const killedGuardIndex: number = (sectionIndex * wallSectionSize) + position;

    const killedGuard: Guard = this.wall[killedGuardIndex];
    if (!killedGuard.ownerId) return;

    const owner: Player = this.players[killedGuard.ownerId];
    owner.guards++;

    if (isKilledByWildlings && owner.heroPrivilege === HERO_CARD_Thoros) {
      owner.allowFreeGuard = true;
    };

    const updatedWall: Guard[] = [
      ...this.wall
    ];

    for (let g = 1; g < (wallSectionSize - position); g++) {
      updatedWall[killedGuardIndex + g - 1] = updatedWall[killedGuardIndex + g];
    };

    updatedWall[killedGuardIndex + wallSectionSize - 1] = new Guard(null, -1, -1);

    this.wall = new ArraySchema<Guard>(
      ...updatedWall
    );

    console.log(this.wall.map(({ ownerId, wallSection, position }, p) => `Wall | Position ${p} | ownerId: ${ownerId} | wallSection: ${wallSection} position ${position}`));
  }

  onGuardRelocate(fromSection: number, fromPosition: number, toSection: number) {
    const guardIndex: number = (fromSection * wallSectionSize) + fromPosition;

    const movedGuard: Guard = this.wall[guardIndex];
    if (!movedGuard.ownerId) return;

    const updatedWall = [
      ...this.wall
    ];

    updatedWall[guardIndex] = new Guard(null, -1, -1);
    for (let g = 1; g < (wallSectionSize - fromPosition); g++) {
      updatedWall[guardIndex + g - 1] = updatedWall[guardIndex + g];
    };
    updatedWall[guardIndex + wallSectionSize - 1] = new Guard(null, -1, -1);

    const guardsOnToSection: number = this.guardsOnWallSection(toSection);
    updatedWall[toSection * wallSectionSize + guardsOnToSection] = movedGuard;

    this.wall = new ArraySchema<Guard>(
      ...updatedWall
    );
  }
};

export default FirstMenGameState;
