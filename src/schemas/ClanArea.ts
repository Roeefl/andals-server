import { type, Schema, ArraySchema } from '@colyseus/schema';

class ClanArea extends Schema {
  @type("string")
  clanType: string

  @type("number")
  campfires: number

  @type(["string"])
  camps: string[]

  constructor(clanType: string) {
    super();

    this.clanType = clanType;
    this.campfires = 4;
    this.camps = new ArraySchema<string>();
  }
};

export default ClanArea;
