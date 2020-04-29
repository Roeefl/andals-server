import { type, Schema, ArraySchema } from '@colyseus/schema';

import Wildling from './Wildling';

class ClanArea extends Schema {
  @type("string")
  clanType: string

  @type("number")
  campfires: number

  @type([Wildling])
  camps: Wildling[]

  constructor(clanType: string) {
    super();

    this.clanType = clanType;
    this.campfires = 4;
    this.camps = new ArraySchema<Wildling>();
  }
};

export default ClanArea;
