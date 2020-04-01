import { type, Schema } from '@colyseus/schema';
// import { TILE_SPACER, LUMBER, BRICK, SHEEP, WHEAT, ORE, DESERT } from '../manifest';

class Tile extends Schema {
  @type("string")
  type: string

  @type("string")
  resource: string | null

  @type("number")
  value: number

  constructor(type: string, resource: string | null = null, value: number = 0) {
    super();

    this.type = type;
    this.resource = resource;
    this.value = value;
  }
};

export default Tile;
