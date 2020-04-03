import { type, Schema } from '@colyseus/schema';

class Structure extends Schema {
  @type("string")
  type: string

  @type("string")
  ownerId: string

  @type("number")
  row: number

  @type("number")
  col: number

  constructor(ownerId: string, type: string, row: number, col: number) {
    super();
    
    this.ownerId = ownerId;
    this.type = type;
    this.row = row;
    this.col = col;
  }
};

export default Structure;
