import type { Device, Link, Network } from "../model/network";

export interface RandomNetworkOptions {
  switches: number;
  extraLinks?: number;
  minCost?: number;
  maxCost?: number;
  seed?: number;
}

export const MAX_RANDOM_SWITCHES = 5000;
const MAX_EXTRA_LINKS = 200_000;

export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function generateRandomNetwork(options: RandomNetworkOptions): Network {
  const n = options.switches;
  const seed = options.seed ?? 1;
  const minCost = options.minCost ?? 1;
  const maxCost = options.maxCost ?? 20;
  const wantedExtra = options.extraLinks ?? n;

  if (!Number.isInteger(n) || n < 1 || n > MAX_RANDOM_SWITCHES) {
    throw new RangeError(`switches debe ser un entero entre 1 y ${MAX_RANDOM_SWITCHES}`);
  }
  if (!Number.isInteger(wantedExtra) || wantedExtra < 0 || wantedExtra > MAX_EXTRA_LINKS) {
    throw new RangeError(`extraLinks debe ser un entero entre 0 y ${MAX_EXTRA_LINKS}`);
  }
  if (!Number.isInteger(minCost) || !Number.isInteger(maxCost) || minCost < 1 || maxCost < minCost) {
    throw new RangeError("Los costos deben ser enteros con 1 <= minCost <= maxCost");
  }

  const rng = createRng(seed);

  const devices: Device[] = [];
  const radius = Math.max(120, n * 22);
  const columns = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const position =
      n <= 40
        ? {
            x: Math.round(radius + 100 + radius * Math.cos((2 * Math.PI * i) / n)),
            y: Math.round(radius + 100 + radius * Math.sin((2 * Math.PI * i) / n)),
          }
        : { x: 100 + (i % columns) * 140, y: 100 + Math.floor(i / columns) * 140 };
    devices.push({
      id: `S${i + 1}`,
      kind: "switch",
      label: `SW${i + 1}`,
      position,
      status: "up",
    });
  }

  // --- enlaces ---
  const links: Link[] = [];
  const used = new Set<string>();
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const addLink = (a: number, b: number) => {
    used.add(key(a, b));
    links.push({
      id: `e${links.length + 1}`,
      source: `S${a + 1}`,
      target: `S${b + 1}`,
      cost: randomInt(rng, minCost, maxCost),
      status: "up",
    });
  };

  for (let i = 1; i < n; i++) addLink(randomInt(rng, 0, i - 1), i);

  const available = (n * (n - 1)) / 2 - (n - 1);
  const extra = Math.min(wantedExtra, available);

  if (extra > 0 && extra * 2 >= available) {
    const free: [number, number][] = [];
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) if (!used.has(key(a, b))) free.push([a, b]);
    }
    for (let i = 0; i < extra; i++) {
      const j = randomInt(rng, i, free.length - 1);
      [free[i], free[j]] = [free[j], free[i]];
      addLink(free[i][0], free[i][1]);
    }
  } else {
    let added = 0;
    while (added < extra) {
      const a = randomInt(rng, 0, n - 1);
      const b = randomInt(rng, 0, n - 1);
      if (a === b || used.has(key(a, b))) continue;
      addLink(a, b);
      added++;
    }
  }

  return {
    name: `Red aleatoria (${n} switches, semilla ${seed})`,
    devices,
    links,
  };
}
