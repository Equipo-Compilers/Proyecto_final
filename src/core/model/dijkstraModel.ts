export interface DijkstraNode {
  id: string;
  label: string;
}

export interface DijkstraEdge {
  source: string;
  target: string;
  weight: number;
}

export interface DijkstraGraph {
  nodes: DijkstraNode[];
  edges: DijkstraEdge[];
}

export interface DijkstraInput {
  graph: DijkstraGraph;
  sourceNode: string;
}

export interface DijkstraRelaxation {
  edge: DijkstraEdge;
  neighbor: string;
  newDistance: number;
  improved: boolean;
}

export interface DijkstraStep {
  stepNumber: number;
  currentNode: string;
  currentDistance: number;
  treeEdge: DijkstraEdge | null;
  relaxations: DijkstraRelaxation[];
  settledNodes: string[];
  distances: Record<string, number | null>;
  explanation: string;
}

export interface DijkstraModelResult {
  sourceNode: string;
  steps: DijkstraStep[];
  distances: Record<string, number | null>;
  predecessors: Record<string, string | null>;
  shortestPathEdges: DijkstraEdge[];
  treeCost: number;
  reachableCount: number;
}

export interface DijkstraOptions {
  recordSteps?: boolean;
}
