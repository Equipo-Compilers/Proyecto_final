import { ALGORITHM_LIST, getAlgorithmsForMode } from "../algorithms/registry";
import type { AlgorithmId } from "../model/algorithmResult";
import type { DeviceKind, Network } from "../model/network";
import { generateRandomNetwork } from "../generator/randomNetwork";

export interface BenchmarkRow {
  switches: number;
  links: number;
  algorithmId: AlgorithmId;
  algorithmName: string;
  averageMs: number;
  minMs: number;
  totalCost: number;
  selectedLinks: number;
  distanceSum?: number;
  samples: number;
}

export interface BenchmarkOptions {
  sizes: number[];
  repetitions?: number;
  extraLinksPerSwitch?: number;
  seed?: number;
  algorithms?: AlgorithmId[];
  startNodeId?: string;
  kind?: DeviceKind;
}

export type Clock = () => number;

const defaultClock: Clock = () => performance.now();
const TARGET_SAMPLE_MS = 2;
const MAX_INNER_LOOPS = 2000;

export function benchmarkNetwork(
  network: Network,
  repetitions = 10,
  algorithms: AlgorithmId[] = getAlgorithmsForMode("layer2").map((a) => a.id),
  now: Clock = defaultClock,
  startNodeId?: string
): BenchmarkRow[] {
  const samples = Math.max(1, Math.floor(repetitions));
  const rows: BenchmarkRow[] = [];

  for (const def of ALGORITHM_LIST.filter((a) => algorithms.includes(a.id))) {
    const run = def.prepareBenchmark(
      network,
      startNodeId === undefined ? {} : { startNodeId }
    );

    const t0 = now();
    let output = run();
    const single = now() - t0;
    const inner =
      single >= TARGET_SAMPLE_MS
        ? 1
        : Math.min(MAX_INNER_LOOPS, Math.ceil(TARGET_SAMPLE_MS / Math.max(single, 0.0005)));

    let total = 0;
    let min = Infinity;
    for (let i = 0; i < samples; i++) {
      const start = now();
      for (let k = 0; k < inner; k++) output = run();
      const perRun = (now() - start) / inner;
      total += perRun;
      if (perRun < min) min = perRun;
    }

    rows.push({
      switches: network.devices.length,
      links: network.links.length,
      algorithmId: def.id,
      algorithmName: def.name,
      averageMs: total / samples,
      minMs: min,
      totalCost: output.totalCost,
      selectedLinks: output.selectedLinks,
      ...(output.distanceSum === undefined ? {} : { distanceSum: output.distanceSum }),
      samples,
    });
  }
  return rows;
}

export function runBenchmark(
  options: BenchmarkOptions,
  onProgress?: (done: number, total: number) => void,
  now: Clock = defaultClock
): BenchmarkRow[] {
  const {
    sizes,
    repetitions = 10,
    extraLinksPerSwitch = 3,
    seed = 2026,
    algorithms,
    kind,
  } = options;

  const rows: BenchmarkRow[] = [];
  sizes.forEach((size, index) => {
    const network = generateRandomNetwork({
      switches: size,
      extraLinks: size * extraLinksPerSwitch,
      seed: seed + size,
      ...(kind === undefined ? {} : { kind }),
    });
    rows.push(...benchmarkNetwork(network, repetitions, algorithms, now));
    onProgress?.(index + 1, sizes.length);
  });
  return rows;
}
