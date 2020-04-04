import { type, Schema, ArraySchema } from '@colyseus/schema';

class DiceRoll extends Schema {
  @type(["number"])
  dice: Number[]

  @type("number")
  value: number

  constructor(dice: number[]) {
    super();
    
    this.dice = new ArraySchema<Number>(...dice);
    this.value = dice.reduce((d1, d2) => d1 + d2, 0);
  }
};

export default DiceRoll;
