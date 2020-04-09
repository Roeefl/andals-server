import { type, Schema } from '@colyseus/schema';
// import { TILE_SPACER, LUMBER, BRICK, SHEEP, WHEAT, ORE, DESERT } from '../manifest';

class HexTile extends Schema {
  @type("string")
  type: string

  @type("number")
  row: number

  @type("number")
  col: number

  @type("string")
  resource: string

  @type("number")
  value: number

  constructor(type: string, row: number, col: number, resource: string = '', value: number = 0) {
    super();

    this.type = type;
    this.row = row;
    this.col = col;
    this.resource = resource;
    this.value = value;
  }
};

export default HexTile;
