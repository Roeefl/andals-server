import { type, Schema } from '@colyseus/schema';
import { WILDLING_REGULAR, WILDLING_CLIMBER, WILDLING_GIANT } from '../specs/wildlings';

class Wildling extends Schema {
  @type("string")
  type: string

  @type("number")
  occupiesTile: number | null

  constructor(type: string = WILDLING_REGULAR) {
    super();

    this.type = type;
    this.occupiesTile = null;
  }
};

export default Wildling;
