export interface BuildingCost {
  [key: string]: number
};

interface BuildingCosts {
  [key: string]: BuildingCost
};

const buildingCosts: BuildingCosts = {
  road: {
    lumber: 1,
    brick: 1,
    sheep: 0,
    ore: 0,
    wheat: 0
  },
  settlement: {
    lumber: 1,
    brick: 1,
    wheat: 1,
    sheep: 1,
    ore: 0
  },
  city: {
    wheat: 2,
    ore: 3,
    lumber: 0,
    brick: 0,
    sheep: 0
  },
  gameCard: {
    sheep: 1,
    wheat: 1,
    ore: 1,
    lumber: 0,
    brick: 0
  }
};

export default buildingCosts;
