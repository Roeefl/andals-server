import { type, Schema, ArraySchema } from '@colyseus/schema';

class ClanCamps extends Schema {
  @type("string")
  clanType: string

  @type(["string"])
  camps: string[]

  constructor(clanType: string) {
    super();

    this.clanType = clanType;
    this.camps = new ArraySchema<string>();
  }
};

export default ClanCamps;
