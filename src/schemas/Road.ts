import { type, Schema } from '@colyseus/schema';

class Road extends Schema {
  @type("string")
  ownerId: string

  @type("number")
  row: number

  @type("number")
  col: number


  constructor(ownerId: string, row: number, col: number) {
    super();
    
    this.ownerId = ownerId;
    this.row = row;
    this.col = col;
  }
};


export default Road;

