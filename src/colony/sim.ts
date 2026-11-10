/**
 * Ant-colony simulation: the "many simple agents, shared memory" sibling of
 * Langton's ant. Where a turmite writes colors onto the grid it walks, these
 * ants write pheromones, and the colony's behavior (trails, recruitment,
 * shortest paths, wars) emerges from that shared, evaporating memory.
 *
 * Model, per tick:
 *   - Ants are continuous agents: position (in cells), heading, angular
 *     velocity. Three forward sensors sample a pheromone field; the ant
 *     steers toward the strongest sample with a turn-rate limit, inertia and
 *     random wander, and bounces off walls.
 *   - Searching ants lay a HOME pheromone, strongest near the nest; ants
 *     carrying food lay a TRAIL pheromone, strongest near the food. Each
 *     follows the other kind, which is what closes the foraging loop.
 *   - Fields evaporate and diffuse, so unused trails fade and short paths
 *     (reinforced more often) win over long ones.
 *   - Castes: workers forage, scouts wander far and follow trails loosely,
 *     soldiers follow the colony's ALARM pheromone toward fights.
 *   - Colony economy: delivered food is stored at the nest, ants eat from the
 *     store, and the store pays for new ants. Ants die of starvation, old age
 *     or combat; the corpse becomes food.
 *   - Caste allocation is adaptive: recent fighting raises the share of
 *     soldiers among new ants, a low food income raises the share of scouts.
 *
 * Everything draws from one seeded PRNG in a fixed order, so a (scenario,
 * seed) pair replays identically on a given JavaScript engine. (Unlike the
 * integer-only turmite engine this uses floating-point trigonometry, so
 * bit-identical results across different engines are not guaranteed.)
 */

import { mulberry32 } from "../engine/prng";

export const CASTE_WORKER = 0;
export const CASTE_SCOUT = 1;
export const CASTE_SOLDIER = 2;
export const CASTE_NAMES = ["workers", "scouts", "soldiers"] as const;

export const STATE_SEARCH = 0;
export const STATE_CARRY = 1;
export const STATE_RETURN = 2;

export const MAX_COLONIES = 4;
export const MAX_ANTS = 4096;
export const POP_CAP = 700;

export interface ColonyParams {
  /** Fraction of trail pheromone lost per tick (home pheromone loses half as much). */
  evaporation: number;
  /** 0..0.5: share of each cell's pheromone spread to its 4 neighbors per field pass. */
  diffusion: number;
  /** Random heading noise, radians per tick. */
  wander: number;
  /** New food patches per 10,000 ticks. */
  foodRegrow: number;
  /** Multiplier on combat damage; 0 makes rival colonies ignore each other. */
  aggression: number;
}

export const DEFAULT_PARAMS: ColonyParams = {
  evaporation: 0.004,
  diffusion: 0.12,
  wander: 0.22,
  foodRegrow: 4,
  aggression: 1,
};

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
  readonly width: number;
  readonly height: number;
  readonly nests: ReadonlyArray<{ x: number; y: number }>;
  readonly antsPerColony: number;
  /** Food in each nest store at the start (default 20). */
  readonly store?: number;
  readonly params?: Partial<ColonyParams>;
  /** Paint walls and food onto a fresh simulation. */
  build(sim: ColonySim): void;
}

export interface ColonyState {
  nestX: number;
  nestY: number;
  /** Food in the nest store. */
  store: number;
  delivered: number;
  born: number;
  starved: number;
  killed: number;
  aged: number;
  /** Decaying measure of recent fighting; drives soldier production. */
  threat: number;
  /** Decaying measure of recent deliveries; low income drives scout production. */
  income: number;
  /** Live ants per caste, refreshed every tick. */
  pop: [number, number, number];
}

const SENSE_DIST = 3.2;
const SENSE_ANGLE = 0.6;
const TURN = 0.35;
const NEST_RADIUS = 3.5;
const NEST_HOMING = 9;
const FIELD_INTERVAL = 4;
const MAX_PHEROMONE = 12;
const ALARM_EVAPORATION = 0.03;
const STRENGTH_DECAY = 0.995;
const ANT_COST = 5;
const MEAL = 0.25;
const SPAWN_INTERVAL = 6;
const SOLDIER_LEASH = 70;

const SPEED = [0.55, 0.75, 0.5];
const FOLLOW = [1, 0.35, 0.8];
const WANDER_MUL = [1, 2.4, 1.3];
const MAX_HP = [10, 6, 30];
const DAMAGE = [1, 0.6, 4];
const MAX_ENERGY = [3000, 3600, 3000];

export class ColonySim {
  readonly w: number;
  readonly h: number;
  readonly seed: number;
  readonly params: ColonyParams;
  readonly colonies: ColonyState[] = [];
  /** 1 where a cell is solid. The outer border is always wall. */
  readonly walls: Uint8Array;
  /** Food units per cell. */
  readonly food: Uint16Array;
  /** Per-colony pheromone fields, each w*h. */
  readonly home: Float32Array[] = [];
  readonly trail: Float32Array[] = [];
  readonly alarm: Float32Array[] = [];
  /** When set, food cells painted by the scenario never run out. */
  endlessFood = false;

  tick = 0;
  /** Live ant count; ants occupy indices [0, n). */
  n = 0;
  readonly x = new Float32Array(MAX_ANTS);
  readonly y = new Float32Array(MAX_ANTS);
  /** Position before the last tick, for render interpolation. */
  readonly px = new Float32Array(MAX_ANTS);
  readonly py = new Float32Array(MAX_ANTS);
  readonly heading = new Float32Array(MAX_ANTS);
  readonly omega = new Float32Array(MAX_ANTS);
  readonly colony = new Uint8Array(MAX_ANTS);
  readonly caste = new Uint8Array(MAX_ANTS);
  readonly state = new Uint8Array(MAX_ANTS);
  readonly energy = new Float32Array(MAX_ANTS);
  readonly hp = new Float32Array(MAX_ANTS);
  readonly age = new Int32Array(MAX_ANTS);
  readonly life = new Int32Array(MAX_ANTS);
  /** Deposit strength: 1 at the last nest/food visit, decaying each tick. */
  readonly strength = new Float32Array(MAX_ANTS);
  /** 0 alive, 1 starved, 2 killed, 3 old age. */
  private readonly dead = new Uint8Array(MAX_ANTS);

  private readonly rng: () => number;
  private readonly cellHead: Int32Array;
  private readonly cellNext = new Int32Array(MAX_ANTS);
  private readonly scratch: Float32Array;

  constructor(scenario: Scenario, seed: number, params?: Partial<ColonyParams>) {
    this.w = scenario.width;
    this.h = scenario.height;
    this.seed = seed >>> 0;
    this.params = { ...DEFAULT_PARAMS, ...scenario.params, ...params };
    this.rng = mulberry32(this.seed);
    const cells = this.w * this.h;
    this.walls = new Uint8Array(cells);
    this.food = new Uint16Array(cells);
    this.cellHead = new Int32Array(cells);
    this.scratch = new Float32Array(cells);
    for (let x = 0; x < this.w; x++) {
      this.walls[x] = 1;
      this.walls[(this.h - 1) * this.w + x] = 1;
    }
    for (let y = 0; y < this.h; y++) {
      this.walls[y * this.w] = 1;
      this.walls[y * this.w + this.w - 1] = 1;
    }
    const nests = scenario.nests.slice(0, MAX_COLONIES);
    for (const nest of nests) {
      this.colonies.push({
        nestX: nest.x,
        nestY: nest.y,
        store: scenario.store ?? 20,
        delivered: 0,
        born: 0,
        starved: 0,
        killed: 0,
        aged: 0,
        threat: 0,
        income: 0,
        pop: [0, 0, 0],
      });
      this.home.push(new Float32Array(cells));
      this.trail.push(new Float32Array(cells));
      this.alarm.push(new Float32Array(cells));
    }
    scenario.build(this);
    // Nests are never walled in by the scenario painter.
    for (const c of this.colonies) this.paintWall(c.nestX, c.nestY, NEST_RADIUS + 1, false);
    for (let c = 0; c < this.colonies.length; c++) {
      for (let i = 0; i < scenario.antsPerColony; i++) {
        const r = this.rng();
        this.spawn(c, r < 0.12 ? CASTE_SCOUT : CASTE_WORKER);
      }
    }
    this.countPopulation();
  }

  // ------------------------------------------------------------- painting

  private inBounds(ix: number, iy: number): boolean {
    return ix > 0 && iy > 0 && ix < this.w - 1 && iy < this.h - 1;
  }

  /** Set or clear walls in a disc. The border and nest sites stay as they are. */
  paintWall(cx: number, cy: number, radius: number, solid: boolean): void {
    this.disc(cx, cy, radius, (idx, ix, iy) => {
      if (solid) {
        for (const c of this.colonies) {
          const dx = ix - c.nestX;
          const dy = iy - c.nestY;
          if (dx * dx + dy * dy <= (NEST_RADIUS + 1) * (NEST_RADIUS + 1)) return;
        }
        this.walls[idx] = 1;
        this.food[idx] = 0;
        for (let c = 0; c < this.colonies.length; c++) {
          this.home[c][idx] = 0;
          this.trail[c][idx] = 0;
          this.alarm[c][idx] = 0;
        }
      } else {
        this.walls[idx] = 0;
      }
    });
  }

  /** Fill every interior cell of a rectangle with wall (scenario helper). */
  fillWalls(x0: number, y0: number, x1: number, y1: number): void {
    for (let y = Math.max(1, y0); y <= Math.min(this.h - 2, y1); y++) {
      for (let x = Math.max(1, x0); x <= Math.min(this.w - 2, x1); x++) this.walls[y * this.w + x] = 1;
    }
  }

  /** Carve an open corridor along a polyline (scenario helper). */
  carve(points: ReadonlyArray<readonly [number, number]>, radius: number): void {
    if (points.length === 1) this.paintWall(points[0][0], points[0][1], radius, false);
    for (let i = 0; i + 1 < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay));
      for (let s = 0; s <= steps; s++) {
        const t = steps === 0 ? 0 : s / steps;
        this.paintWall(ax + (bx - ax) * t, ay + (by - ay) * t, radius, false);
      }
    }
  }

  /** Add food to every open cell of a disc. */
  paintFood(cx: number, cy: number, radius: number, amount: number): void {
    this.disc(cx, cy, radius, (idx) => {
      if (this.walls[idx] === 0) this.food[idx] = Math.min(65535, this.food[idx] + amount);
    });
  }

  /** Remove walls, food and pheromones in a disc. */
  erase(cx: number, cy: number, radius: number): void {
    this.disc(cx, cy, radius, (idx) => {
      this.walls[idx] = 0;
      this.food[idx] = 0;
      for (let c = 0; c < this.colonies.length; c++) {
        this.home[c][idx] = 0;
        this.trail[c][idx] = 0;
        this.alarm[c][idx] = 0;
      }
    });
  }

  private disc(cx: number, cy: number, radius: number, fn: (idx: number, ix: number, iy: number) => void): void {
    const r = Math.max(0, radius);
    const x0 = Math.floor(cx - r);
    const x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r);
    const y1 = Math.ceil(cy + r);
    for (let iy = y0; iy <= y1; iy++) {
      for (let ix = x0; ix <= x1; ix++) {
        if (!this.inBounds(ix, iy)) continue;
        const dx = ix + 0.5 - cx;
        const dy = iy + 0.5 - cy;
        if (dx * dx + dy * dy > (r + 0.5) * (r + 0.5)) continue;
        fn(iy * this.w + ix, ix, iy);
      }
    }
  }

  // --------------------------------------------------------------- queries

  get totalFood(): number {
    let sum = 0;
    const f = this.food;
    for (let i = 0; i < f.length; i++) sum += f[i];
    return sum;
  }

  population(c: number): number {
    const p = this.colonies[c].pop;
    return p[0] + p[1] + p[2];
  }

  // ------------------------------------------------------------ lifecycle

  private spawn(c: number, caste: number): boolean {
    if (this.n >= MAX_ANTS) return false;
    const i = this.n++;
    const col = this.colonies[c];
    const a = this.rng() * Math.PI * 2;
    const r = this.rng() * (NEST_RADIUS - 1);
    this.x[i] = this.px[i] = col.nestX + Math.cos(a) * r;
    this.y[i] = this.py[i] = col.nestY + Math.sin(a) * r;
    this.heading[i] = a;
    this.omega[i] = 0;
    this.colony[i] = c;
    this.caste[i] = caste;
    this.state[i] = STATE_SEARCH;
    this.energy[i] = MAX_ENERGY[caste];
    this.hp[i] = MAX_HP[caste];
    this.age[i] = 0;
    this.life[i] = 6000 + Math.floor(this.rng() * 5000);
    this.strength[i] = 1;
    this.dead[i] = 0;
    return true;
  }

  private countPopulation(): void {
    for (const c of this.colonies) c.pop[0] = c.pop[1] = c.pop[2] = 0;
    for (let i = 0; i < this.n; i++) this.colonies[this.colony[i]].pop[this.caste[i]]++;
  }

  /** Advance one tick. */
  step(): void {
    const { w, h, n } = this;
    const walls = this.walls;
    const food = this.food;
    const rng = this.rng;
    const fighting = this.colonies.length > 1 && this.params.aggression > 0;
    const wander = this.params.wander;

    if (fighting) {
      this.cellHead.fill(-1);
      for (let i = 0; i < n; i++) {
        const cell = (this.y[i] | 0) * w + (this.x[i] | 0);
        this.cellNext[i] = this.cellHead[cell];
        this.cellHead[cell] = i;
      }
    }

    for (let i = 0; i < n; i++) {
      if (this.dead[i] !== 0) continue;
      const c = this.colony[i];
      const k = this.caste[i];
      const col = this.colonies[c];
      let x = this.x[i];
      let y = this.y[i];
      this.px[i] = x;
      this.py[i] = y;
      let hd = this.heading[i];
      let st = this.state[i];
      const ix = x | 0;
      const iy = y | 0;
      const cell = iy * w + ix;

      // -- metabolism
      this.age[i]++;
      this.energy[i] -= 1;
      if (this.energy[i] <= 0) {
        this.dead[i] = 1;
        continue;
      }
      if (this.age[i] >= this.life[i]) {
        this.dead[i] = 3;
        continue;
      }
      if (st === STATE_SEARCH && (this.energy[i] < 700 || this.strength[i] < 0.0004)) {
        st = STATE_RETURN; // hungry, or out too long to lay a useful trail: go home
      }

      // -- nest: deliver, eat, turn around
      const ndx = col.nestX - x;
      const ndy = col.nestY - y;
      const nd2 = ndx * ndx + ndy * ndy;
      if (nd2 < NEST_RADIUS * NEST_RADIUS) {
        if (st === STATE_CARRY) {
          col.store += 1;
          col.delivered += 1;
          col.income += 1;
        }
        const max = MAX_ENERGY[k];
        if (this.energy[i] < max * 0.7) {
          const need = ((max - this.energy[i]) / max) * MEAL;
          if (col.store >= need) {
            col.store -= need;
            this.energy[i] = max;
          }
        }
        this.hp[i] = Math.min(MAX_HP[k], this.hp[i] + 0.2);
        if (st !== STATE_SEARCH) {
          st = STATE_SEARCH;
          hd += Math.PI;
        }
        this.strength[i] = 1;
      }

      // -- combat
      if (fighting) {
        let enemy = -1;
        search: for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const cx = ix + dx;
            const cy = iy + dy;
            if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
            for (let j = this.cellHead[cy * w + cx]; j >= 0; j = this.cellNext[j]) {
              if (this.colony[j] !== c && this.dead[j] === 0) {
                enemy = j;
                break search;
              }
            }
          }
        }
        if (enemy >= 0) {
          col.threat += 1;
          const al = this.alarm[c];
          al[cell] = Math.min(MAX_PHEROMONE, al[cell] + 2);
          // A worker with food in its jaws runs for home instead of fighting.
          if (!(st === STATE_CARRY && k !== CASTE_SOLDIER)) {
            this.hp[enemy] -= DAMAGE[k] * (0.5 + rng()) * this.params.aggression;
            if (this.hp[enemy] <= 0) this.dead[enemy] = 2;
            this.heading[i] = Math.atan2(this.y[enemy] - y, this.x[enemy] - x);
            this.state[i] = st;
            continue;
          }
        }
      }

      // -- food
      if (st === STATE_SEARCH && k !== CASTE_SOLDIER && food[cell] > 0) {
        if (!this.endlessFood) food[cell]--;
        st = STATE_CARRY;
        hd += Math.PI;
        this.strength[i] = 1;
      }

      // -- sense and steer
      const seeking = st === STATE_SEARCH;
      let field: Float32Array;
      let follow = FOLLOW[k];
      if (!seeking) field = this.home[c];
      else if (k === CASTE_SOLDIER) field = this.alarm[c];
      else field = this.trail[c];

      let l = this.sense(field, x, y, hd - SENSE_ANGLE, seeking && k !== CASTE_SOLDIER);
      let f = this.sense(field, x, y, hd, seeking && k !== CASTE_SOLDIER);
      let r = this.sense(field, x, y, hd + SENSE_ANGLE, seeking && k !== CASTE_SOLDIER);
      if (seeking && k === CASTE_SOLDIER && l < 0.02 && f < 0.02 && r < 0.02) {
        // No alarm nearby: patrol the foraging trails, on a leash.
        if (nd2 > SOLDIER_LEASH * SOLDIER_LEASH) st = STATE_RETURN;
        field = this.trail[c];
        follow = 0.4;
        if (l >= 0) l = this.sense(field, x, y, hd - SENSE_ANGLE, false);
        if (f >= 0) f = this.sense(field, x, y, hd, false);
        if (r >= 0) r = this.sense(field, x, y, hd + SENSE_ANGLE, false);
      }

      let steer = 0;
      if (f < 0) {
        steer = l > r ? -2 : r > l ? 2 : rng() < 0.5 ? -2 : 2; // wall ahead
        follow = 1;
      } else if (l > 0.01 || f > 0.01 || r > 0.01) {
        if (f >= l && f >= r) steer = 0;
        else if (l > r) steer = -1;
        else if (r > l) steer = 1;
        else steer = rng() < 0.5 ? -1 : 1;
      }
      let om = this.omega[i] * 0.5 + steer * TURN * follow + (rng() - 0.5) * wander * WANDER_MUL[k];
      if (!seeking && nd2 < NEST_HOMING * NEST_HOMING) {
        // Close enough to see the nest entrance: head straight for it.
        let d = Math.atan2(ndy, ndx) - hd;
        d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
        om = d * 0.5;
      }
      hd += om;
      this.omega[i] = om;

      // -- move
      const speed = SPEED[k] * (st === STATE_CARRY ? 0.85 : 1);
      const nx = x + Math.cos(hd) * speed;
      const ny = y + Math.sin(hd) * speed;
      const nix = nx | 0;
      const niy = ny | 0;
      if (nx < 1 || ny < 1 || nix >= w - 1 || niy >= h - 1 || walls[niy * w + nix] !== 0) {
        hd += Math.PI + (rng() - 0.5) * 1.6;
        this.omega[i] = 0;
      } else {
        x = nx;
        y = ny;
      }
      if (hd > 1e4 || hd < -1e4) hd -= Math.round(hd / (Math.PI * 2)) * Math.PI * 2;

      // -- deposit
      const s = this.strength[i];
      const here = (y | 0) * w + (x | 0);
      if (st === STATE_CARRY) {
        const t = this.trail[c];
        const v = t[here] + s;
        t[here] = v > MAX_PHEROMONE ? MAX_PHEROMONE : v;
      } else if (st === STATE_SEARCH) {
        const hm = this.home[c];
        const v = hm[here] + s;
        hm[here] = v > MAX_PHEROMONE ? MAX_PHEROMONE : v;
      }
      this.strength[i] = s * STRENGTH_DECAY;

      this.x[i] = x;
      this.y[i] = y;
      this.heading[i] = hd;
      this.state[i] = st;
    }

    this.removeDead();
    this.upkeep();
    if (this.tick % FIELD_INTERVAL === 0) this.updateFields();
    this.regrow();
    this.tick++;
  }

  /** Sample a field at a sensor; -1 for walls and out-of-bounds. */
  private sense(field: Float32Array, x: number, y: number, angle: number, seesFood: boolean): number {
    const sx = (x + Math.cos(angle) * SENSE_DIST) | 0;
    const sy = (y + Math.sin(angle) * SENSE_DIST) | 0;
    if (sx < 1 || sy < 1 || sx >= this.w - 1 || sy >= this.h - 1) return -1;
    const idx = sy * this.w + sx;
    if (this.walls[idx] !== 0) return -1;
    return seesFood && this.food[idx] > 0 ? 1000 : field[idx];
  }

  private removeDead(): void {
    for (let i = this.n - 1; i >= 0; i--) {
      const cause = this.dead[i];
      if (cause === 0) continue;
      const col = this.colonies[this.colony[i]];
      if (cause === 1) col.starved++;
      else if (cause === 2) col.killed++;
      else col.aged++;
      // The corpse (and anything it carried) becomes food where it fell.
      const cell = (this.y[i] | 0) * this.w + (this.x[i] | 0);
      if (this.walls[cell] === 0 && !this.endlessFood) {
        this.food[cell] = Math.min(65535, this.food[cell] + 1 + (this.state[i] === STATE_CARRY ? 1 : 0));
      }
      const last = --this.n;
      if (i !== last) {
        this.x[i] = this.x[last];
        this.y[i] = this.y[last];
        this.px[i] = this.px[last];
        this.py[i] = this.py[last];
        this.heading[i] = this.heading[last];
        this.omega[i] = this.omega[last];
        this.colony[i] = this.colony[last];
        this.caste[i] = this.caste[last];
        this.state[i] = this.state[last];
        this.energy[i] = this.energy[last];
        this.hp[i] = this.hp[last];
        this.age[i] = this.age[last];
        this.life[i] = this.life[last];
        this.strength[i] = this.strength[last];
      }
      this.dead[i] = 0;
      this.dead[last] = 0;
    }
    this.countPopulation();
  }

  private upkeep(): void {
    const many = this.colonies.length > 1 && this.params.aggression > 0;
    for (let c = 0; c < this.colonies.length; c++) {
      const col = this.colonies[c];
      col.threat *= 0.997;
      col.income *= 0.998;
      if (this.tick % SPAWN_INTERVAL !== 0) continue;
      // Keep a reserve for meals: a colony that spends its whole store on brood starves.
      const pop = this.population(c);
      if (col.store < ANT_COST + 4 + pop * 0.15 || pop >= POP_CAP) continue;
      const pSoldier = many ? Math.min(0.5, 0.06 + col.threat * 0.004) : 0;
      const pScout = col.income < 3 ? 0.35 : 0.1;
      const roll = this.rng();
      const caste = roll < pSoldier ? CASTE_SOLDIER : roll < pSoldier + pScout ? CASTE_SCOUT : CASTE_WORKER;
      if (this.spawn(c, caste)) {
        col.store -= ANT_COST;
        col.born++;
        col.pop[caste]++;
      }
    }
  }

  private updateFields(): void {
    const evap = this.params.evaporation;
    const d = Math.min(0.5, Math.max(0, this.params.diffusion));
    const trailKeep = Math.pow(1 - evap, FIELD_INTERVAL);
    const homeKeep = Math.pow(1 - evap * 0.5, FIELD_INTERVAL);
    const alarmKeep = Math.pow(1 - ALARM_EVAPORATION, FIELD_INTERVAL);
    const many = this.colonies.length > 1;
    for (let c = 0; c < this.colonies.length; c++) {
      this.diffuse(this.trail[c], d, trailKeep);
      this.diffuse(this.home[c], d, homeKeep);
      if (many) this.diffuse(this.alarm[c], d, alarmKeep);
    }
  }

  private diffuse(field: Float32Array, d: number, keep: number): void {
    const { w, h } = this;
    const walls = this.walls;
    const out = this.scratch;
    const self = (1 - d) * keep;
    const side = d * 0.25 * keep;
    for (let y = 1; y < h - 1; y++) {
      let i = y * w + 1;
      for (let x = 1; x < w - 1; x++, i++) {
        if (walls[i] !== 0) {
          out[i] = 0;
          continue;
        }
        const v = field[i] * self + (field[i - 1] + field[i + 1] + field[i - w] + field[i + w]) * side;
        out[i] = v < 1e-4 ? 0 : v;
      }
    }
    field.set(out);
  }

  private regrow(): void {
    const rate = this.params.foodRegrow;
    if (rate <= 0 || this.endlessFood || this.tick % 250 !== 249) return;
    if (this.rng() >= (rate * 250) / 10000) return;
    for (let attempt = 0; attempt < 12; attempt++) {
      const fx = 4 + this.rng() * (this.w - 8);
      const fy = 4 + this.rng() * (this.h - 8);
      if (this.walls[(fy | 0) * this.w + (fx | 0)] !== 0) continue;
      let nearNest = false;
      for (const col of this.colonies) {
        if (Math.hypot(col.nestX - fx, col.nestY - fy) < 18) nearNest = true;
      }
      if (nearNest) continue;
      this.paintFood(fx, fy, 2 + this.rng() * 2.5, 12);
      return;
    }
  }
}
