import { BuildingCosts } from '../interfaces';

const buildingCosts: BuildingCosts = {
  road: {
    lumber: 1,
    brick: 1,
    sheep: 0,
    wheat: 0,
    ore: 0
  },
  settlement: {
    lumber: 1,
    brick: 1,
    sheep: 1,
    wheat: 1,
    ore: 0
  },
  city: {
    lumber: 0,
    brick: 0,
    sheep: 0,
    wheat: 2,
    ore: 3
  },
  gameCard: {
    lumber: 0,
    brick: 0,
    sheep: 1,
    wheat: 1,
    ore: 1,
  },
  guard: {
    lumber: 1,
    brick: 1,
    sheep: 1,
    wheat: 0,
    ore: 0
  }
};

export function totalResourceTypesRequired(purchaseType: string) {
  return Object
    .values(buildingCosts[purchaseType])
    .filter(value => value > 0)
    .length;
};

export default buildingCosts;
