import { type, Schema } from '@colyseus/schema';

interface HeroCardManifest {
  order?: number
  name: string
  isReady?: boolean
};

const manifest: { [type: string] : HeroCardManifest } = {
  JeorMormont: {
    isReady: true,
    order: 1,
    name: "Jeor Mormont"
  },
  BowenMarsh: {
    isReady: true,
    order: 2,
    name: "Bowen Marsh"
  },
  SamwellTarly: {
    order: 3,
    isReady: true,
    name: "Samwell Tarly"
  },
  OthellYarwyck: {
    isReady: true,
    order: 4,
    name: "Othell Yarwyck"
  },
  AlliserThorne: {
    isReady: true,
    order: 5,
    name: "Ser Alliser Thorne"
  },
  Melisandre: {
    order: 6,
    isReady: true,
    name: "Melisandre"
  },
  ManceRayder: {
    isReady: true,
    name: "Mance Rayder"
  },
  BenjenStark: {
    isReady: true,
    name: "Benjen Stark"
  },
  Ygritte: {
    isReady: true,
    name: "Ygritte"
  },
  Yoren: {
    isReady: true,
    name: "Yoren"
  },
  QhorinHalfhand: {
    isReady: true,
    name: "Qhorin Half-Hand"
  },
  IlynPayne: {
    isReady: true,
    name: "Ilyn Payne"
  },
  EuronGreyjoy: {
    isReady: true,
    name: "Euron Greyjoy"
  },
  TywinLannister: {
    isReady: true,
    name: "Tywin Lannister"
  },
  Thoros: {
    isReady: true,
    name: "Thoros of Myr"
  },
  StannisBaratheon: {
    isReady: true,
    name: "Stannis Baratheon"
  },
  // Littlefinger: {
  //   name: "Petyr Baelish",
  //   title: "Lord Protector of the Vale",
  //   ability: "Chaos is a Ladder",
  //   description: "You may choose any 2 players and swap their current hero cards."
  // },
  // DavosSeaworth: {
  //   name: "Davos Seaworth",
  //   title: "Admiral of the Narrow Sea",
  //   ability: ""
  // },
  // RobbStark: {
  //   name: "Robb Stark",
  //   title: "The King in the North",
  //   ability: "",
  //   description: "Rally to the King: If Tormund"
  // },
  // TheonGrejoy: {
  //   name: "Theon Greyjoy",
  //   title: "Reek",
  //   description: "What is dead may never die: "
  // }
};

export const heroCardTypes = Object.keys(manifest);
export const [
  HERO_CARD_JeorMormont,
  HERO_CARD_BowenMarsh,
  HERO_CARD_SamwellTarly,
  HERO_CARD_OthellYarwyck,
  HERO_CARD_AlliserThorne,
  HERO_CARD_Melisandre,
  HERO_CARD_ManceRayder,
  HERO_CARD_BenjenStark,
  HERO_CARD_Ygritte,
  HERO_CARD_Yoren,
  HERO_CARD_QhorinHalfhand,
  HERO_CARD_IlynPayne,
  HERO_CARD_EuronGrejoy,
  HERO_CARD_TywinLannister,
  HERO_CARD_Thoros,
  HERO_CARD_Stannis,
  // HERO_CARD_Littlefinger,
  // HERO_CARD_DavosSeaworth,
  // HERO_CARD_RobbStark,
] = heroCardTypes;

class HeroCard extends Schema {
  @type("string")
  type: string;
  
  @type("string")
  name: string;
  
  @type("number")
  order: number
  
  @type("boolean")
  wasPlayed: boolean = false

  @type("string")
  ownerId: string | null

  constructor(type: string) {
    super();
    
    this.type = type;
    this.order = manifest[type].order || 0;
    this.name = manifest[type].name;
    this.ownerId = null;
  }

  static implemented() {
    return Object
      .entries(manifest)
      .filter(([key, heroCard]) => heroCard.isReady)
      .map(([key]) => key);
  }
};

export default HeroCard;
