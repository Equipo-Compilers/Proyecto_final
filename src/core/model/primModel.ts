export interface PrimNode {
  id: string;
  label: string;
}

export interface PrimEdge {
  source: string;
  target: string;
  weight: number;
}

export interface PrimStep {
  stepNumber: number;
  currentNode: string;
  selectedEdge: PrimEdge | null;
  visitedNodes: string[];
  candidateEdges: PrimEdge[];
  totalCost: number;
  explanation: string;
}

export interface PrimModelResult {
  startNode: string;
  steps: PrimStep[];
  mstEdges: PrimEdge[];
  totalCost: number;
}

export interface PrimGraph {
  nodes: PrimNode[];
  edges: PrimEdge[];
}

export interface PrimInput {
  graph: PrimGraph;
  startNode: string;
}

export function createInitialPrimResult(
  input: PrimInput
): PrimModelResult {
  return {
    startNode: input.startNode,
    steps: [],
    mstEdges: [],
    totalCost: 0,
  };
}
