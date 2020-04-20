import { type, Schema } from '@colyseus/schema';

interface HeroCardManifest {
  order?: number
  name: string
  title: string
  description?: string
};

export const manifest: { [type: string] : HeroCardManifest } = {
  JeorMormont: {
    order: 1,
    name: "Jeor Mormont",
    title: "Lord Commander of the Night's Watch",
    description: "Forced Trade: Demand 1 resource card each from up to 2 players. The cards must be of the same resource type. For each resource card you receive, give the respective player 1 resource card of your choice in return."
  },
  BowenMarsh: {
    order: 2,
    name: "Bowen Marsh",
    title: "Lord Steward of the Night's Watch",
    description: "1:1 Trade: You may trade a single resource card at a rate of 1:1 with the supply." 
  },
  SamwellTarly: {
    order: 3,
    name: "Samwell Tarly",
    title: "Steward",
    description: "No Income = 1 Free Resource: If, after resolving any production roll (not a “7”), you receive no resource cards, take any 1 resource card of your choice from the supply. Take your resource card before any other hero card is used."
  },
  OthellYarwyck: {
    order: 4,
    name: "Othell Yarwyck",
    title: "Master Builder of the Night's Watch",
    description: "Redirect your Road: Remove 1 of your roads from the board and rebuild it for free at a different legal location. The road you remove must only be connected on 1 of its 2 ends to your pieces. Ignore opponents’ pieces when checking connections."
  },
  AlliserThorne: {
    order: 5,
    name: "Ser Alliser Thorne",
    title: "Master at Arms of the Night's Watch",
    description: "Easy to Build Guard: When you build a guard, substitute 1 of the 3 resources with any 1 other resource of your choice."
  },
  Melisandre: {
    order: 6,
    name: "Melisandre",
    title: "Red Priestess of R'hllor",
    description: "Manipulate Development Cards: One time on your turn, when you buy a development card, substitute 1 of the 3 resources with any 1 other resource of your choice. Choose your development card from the 3 top cards of the deck, then reshuffle the deck."
  },
  ManceRayder: {
    name: "Mance Rayder",
    title: "King Beyond the Wall",
    description: "Take 1 Resource from a Leader: After resolving your production roll, look at the hand of resource cards of 1 opponent who has more victory points than you and take 1 resource card of your choice."
  },
  BenjenStark: {
    name: "Benjen Stark",
    title: "First Ranger",
    description: "Remove 1 Wildling North of the Wall: Remove 1 wildling from a clearing or a camp, return it to the Frostfangs. If you remove a wildling from a camp and there are more wildlings in the camps farther from the clearings than the wildling you removed, move them each 1 camp closer to the clearings. Then, reveal a wildling token from the pool and place it accordingly. You can do this before or after your own production roll."
  },
  Ygirtte: {
    name: "Ygritte",
    title: "Freefolk Spearwife",
    description: "Remove 1 Wildling from the Gift: Choose 1 wildling in the Gift and return it to the Frostfangs. You can do this before or after your own production roll."
  },
  Yoren: {
    name: "Yoren",
    title: "Wandering Crow",
    description: "Patrol Card Becomes a Guard: When you build, discard 1 Ranger Patrol card that you have already played and build a guard for free. You can do this before or after your own production roll."
  },
  QhorinHalfHand: {
    name: "Qhorin Half-Hand",
    title: "Ranger",
    description: "Chase Tormund North: You may move Tormund back to his camp. You receive 1 resource of the type produced by the land that Tormund left. You can do this before or after your own production roll."
  }
};

export const heroCardTypes = Object.keys(manifest);
export const [JeorMormont, BowenMarsh, SamwellTarly, OthellYarwyck, AlliserThorne, Melisandre, ManceRayder, BenjenStark, Ygirtte, Yoren, QhorinHalfHand] = heroCardTypes;

class HeroCard extends Schema {
  @type("string")
  type: string;

  @type("string")
  name: string;

  @type("number")
  order: number

  @type("string")
  title: string

  @type("string")
  description: string

  @type("boolean")
  wasPlayed: boolean = false

  @type("string")
  ownerId: string | null

  constructor(type: string) {
    super();
    
    this.type = type;
    this.order = manifest[type].order || 0;
    this.name = manifest[type].name;
    this.title = manifest[type].title;
    this.description = manifest[type].description || '';
    this.ownerId = null;
  }
};

export default HeroCard;