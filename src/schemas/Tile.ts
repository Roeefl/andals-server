import { type, Schema } from '@colyseus/schema';
import { LUMBER, BRICK, SHEEP, WHEAT, ORE, DESERT } from '../manifest';

class Tile extends Schema {
  @type("string")
  resource: string = DESERT;

  @type("number")
  value: number = 0;

  constructor(resource: string, value: number) {
    super();

    this.resource = resource;
    this.value = value;
  }
};

export default Tile;
