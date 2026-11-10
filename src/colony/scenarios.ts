/**
 * Colony scenarios: each paints walls and food onto a fresh ColonySim. All
 * layout is plain arithmetic (no PRNG), so a scenario is the same map for
 * every seed; the seed only drives the ants.
 */

import type { ColonySim, Scenario } from "./sim";

export const SCENARIOS: Scenario[] = [
  {
    id: "forage",
    name: "Foraging trails",
    blurb:
      "One colony, three food patches at different distances. Scouts find food, returning ants lay a trail, and the trail recruits more ants: watch the nearest patch get stripped first, then the trail re-route.",
    width: 240,
    height: 150,
    nests: [{ x: 120, y: 75 }],
    antsPerColony: 160,
    build(sim: ColonySim): void {
      sim.paintFood(160, 50, 6, 14);
      sim.paintFood(52, 100, 8, 14);
      sim.paintFood(205, 122, 9, 16);
    },
  },
  {
    id: "bridge",
    name: "Double bridge",
    blurb:
      "Deneubourg's 1990 experiment: the nest and an endless food source are joined by a short branch and a long one. Ants on the short branch finish round trips sooner, so its trail is reinforced faster and the colony converges on it, with no ant ever comparing the two.",
    width: 200,
    height: 130,
    nests: [{ x: 28, y: 62 }],
    antsPerColony: 150,
    params: { foodRegrow: 0, wander: 0.18 },
    build(sim: ColonySim): void {
      sim.fillWalls(1, 1, sim.w - 2, sim.h - 2);
      sim.carve([[28, 62]], 13);
      sim.carve([[172, 62]], 13);
      // Short branch (upper) and long branch (lower detour).
      sim.carve([[40, 58], [66, 40], [134, 40], [160, 58]], 3);
      sim.carve([[40, 68], [52, 104], [100, 120], [148, 104], [160, 68]], 3);
      sim.paintFood(178, 62, 5, 50);
      sim.endlessFood = true;
    },
  },
  {
    id: "rivals",
    name: "Two rival colonies",
    blurb:
      "Two nests share one rich patch in the middle. Foragers that meet fight and mark the spot with alarm pheromone; alarm draws soldiers, and a colony under attack raises more of them. The fallen become food.",
    width: 240,
    height: 150,
    nests: [
      { x: 44, y: 75 },
      { x: 196, y: 75 },
    ],
    antsPerColony: 130,
    build(sim: ColonySim): void {
      sim.paintFood(120, 75, 10, 18);
      sim.paintFood(70, 28, 5, 12);
      sim.paintFood(170, 122, 5, 12);
      sim.fillWalls(118, 20, 122, 52);
      sim.fillWalls(118, 98, 122, 130);
    },
  },
  {
    id: "war",
    name: "Four-way war",
    blurb:
      "Four colonies in the corners of a walled arena with scattered food. Territories form along trail networks, borders shift as soldiers are raised, and colonies that lose their income starve.",
    width: 260,
    height: 170,
    nests: [
      { x: 36, y: 34 },
      { x: 224, y: 34 },
      { x: 36, y: 136 },
      { x: 224, y: 136 },
    ],
    antsPerColony: 100,
    params: { foodRegrow: 8 },
    build(sim: ColonySim): void {
      sim.paintFood(130, 85, 11, 18);
      sim.paintFood(130, 26, 5, 12);
      sim.paintFood(130, 144, 5, 12);
      sim.paintFood(30, 85, 5, 12);
      sim.paintFood(230, 85, 5, 12);
      sim.fillWalls(84, 58, 88, 112);
      sim.fillWalls(172, 58, 176, 112);
      sim.fillWalls(104, 50, 156, 53);
      sim.fillWalls(104, 117, 156, 120);
    },
  },
  {
    id: "maze",
    name: "Maze",
    blurb:
      "Food sits at the far end of a serpentine maze. Random search finds it eventually; after that the pheromone trail is the colony's memory of the route, and dead ends stop being visited.",
    width: 170,
    height: 110,
    nests: [{ x: 24, y: 24 }],
    antsPerColony: 180,
    store: 300,
    params: { foodRegrow: 0, evaporation: 0.002 },
    build(sim: ColonySim): void {
      sim.fillWalls(54, 1, 57, 78);
      sim.fillWalls(112, 32, 115, sim.h - 2);
      sim.fillWalls(76, 50, 96, 53);
      sim.fillWalls(20, 62, 36, 65);
      sim.paintFood(146, 22, 8, 40);
    },
  },
];

export function scenarioById(id: string): Scenario {
  for (const s of SCENARIOS) if (s.id === id) return s;
  return SCENARIOS[0];
}
