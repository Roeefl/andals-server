import { type, Schema } from '@colyseus/schema';

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

  @type("string")
  occupiedBy: string | null

  constructor(type: string, row: number, col: number, resource: string = '', value: number = 0) {
    super();

    this.type = type;
    this.row = row;
    this.col = col;
    this.resource = resource;
    this.value = value;
    this.occupiedBy = null;
  }
};

export default HexTile;
