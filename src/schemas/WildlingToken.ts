import { type, Schema } from '@colyseus/schema';

class WildlingToken extends Schema {
  @type("string")
  wildlingType: string

  @type("string")
  clanType: string

  constructor(wildlingType: string, clanType: string) {
    super();

    this.wildlingType = wildlingType;
    this.clanType = clanType;
  }
};

export default WildlingToken;
