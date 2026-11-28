
export interface BellmanFordNode {
  id: string;
  label: string;
}

export interface BellmanFordEdge {
  source: string;
  target: string;
  weight: number;
}

export interface BellmanFordGraph {
  nodes: BellmanFordNode[];
  edges: BellmanFordEdge[];
}

export interface BellmanFordInput {
  graph: BellmanFordGraph;
  sourceNode: string;
}

export interface BellmanFordRelaxation {
  edge: BellmanFordEdge;
  from: string;
  to: string;
  previousDistance: number | null;
  newDistance: number;
  improved: boolean;
  explanation: string;
}

export interface BellmanFordRound {
  round: number;
  relaxations: BellmanFordRelaxation[];
  improvedCount: number;
  distances: Record<string, number | null>;
  explanation: string;
}

export interface BellmanFordModelResult {
  sourceNode: string;
  rounds: BellmanFordRound[];
  roundsExecuted: number;
  convergedEarly: boolean;
  distances: Record<string, number | null>;
  predecessors: Record<string, string | null>;
  shortestPathEdges: BellmanFordEdge[];
  treeCost: number;
  reachableCount: number;
}

export interface BellmanFordOptions {
  recordSteps?: boolean;
}
