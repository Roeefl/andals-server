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

    this.wall = new ArraySchema<Guard>();

    this.wildlingTokens = new ArraySchema<WildlingToken>(
      ...wildlingTokens
    );

    this.heroCards = new ArraySchema<HeroCard>(
      ...heroCards
    );
  }

  guardsOnWallSection(sectionIndex: number) {
    return this.wall
      .filter(({ section }) => section === sectionIndex)
      .length;
  }

  onAllGuardsKilled(sectionIndex: number) {
    this.wall
      .filter(({ section }) => section === sectionIndex)
      .forEach(guard => {
        const owner: Player = this.players[guard.ownerId];
        owner.guards++;
      });

    const updatedWall: Guard[] = this.wall.filter(({ section }) => section !== sectionIndex);
    this.wall = new ArraySchema<Guard>(
      ...updatedWall
    );
  }

  collapseGuardsOnSection(sectionIndex: number, startPosition: number) {
    const updatedWall = this.wall.filter(guard => guard.section !== sectionIndex || guard.position !== startPosition);

    [1, 2, 3, 4].forEach(pos => {
      const currentGuard: Guard = updatedWall.find(guard => guard.section === sectionIndex && guard.position === startPosition + pos);
      if (currentGuard) currentGuard.position--;
    });

    return updatedWall;
  }

  onGuardKilled(sectionIndex: number, positionIndex: number = 0, isKilledByWildlings: boolean = true) {
    const killedGuard: Guard = this.wall.find(guard => guard.section === sectionIndex && guard.position === positionIndex);

    if (!killedGuard) {
      console.log("FirstMenGameState -> onGuardKilled | FATAL ERROR: killedGuard could not be found in this.wall for: ", sectionIndex, positionIndex);
      return;
    }; 

    const owner: Player = this.players[killedGuard.ownerId];
    owner.guards++;

    if (isKilledByWildlings && owner.heroPrivilege === HERO_CARD_Thoros)
      owner.allowFreeGuard = true;

    const updatedWall: Guard[] = this.collapseGuardsOnSection(sectionIndex, positionIndex);
    this.wall = new ArraySchema<Guard>(
      ...updatedWall
    );
    // console.log(this.wall.map(({ ownerId, section, position }, p) => `Wall | Position ${p} | ownerId: ${ownerId} | wallSection: ${section} position ${position}`));
  }

  onGuardRelocate(fromSection: number, fromPosition: number, toSection: number) {
    const movedGuard: Guard = this.wall.find(guard => guard.section === fromSection && guard.position === fromPosition);

    if (!movedGuard) {
      console.log("FirstMenGameState -> onGuardRelocate | FATAL ERROR: movedGuard could not be found in this.wall for: ", fromSection, fromPosition);
      return;
    }; 

    const nextAvailablePosition: number = this.guardsOnWallSection(toSection);
    const relocatedGuard: Guard = new Guard(movedGuard.ownerId, toSection, nextAvailablePosition);

    const updatedWall: Guard[] = this.collapseGuardsOnSection(fromSection, fromPosition);
    this.wall = new ArraySchema<Guard>(
      ...updatedWall,
      relocatedGuard
    );
  }
};

export default FirstMenGameState;
