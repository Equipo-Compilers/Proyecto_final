export type AlgorithmId = "prim" | "kruskal" | "dijkstra" | "bellmanFord";

export type AnalysisMode = "layer2" | "layer3";

export type StepDecision = "accepted" | "discarded";

export interface AlgorithmStep {
  stepNumber: number;
  linkId: string;
  decision: StepDecision;
  acceptedLinkIds: string[];
  totalCost: number;
  explanation: string;
}

export interface RoutingData {
  sourceId: string;
  distances: Record<string, number | null>;
  predecessors: Record<string, string | null>;
}

export interface AlgorithmResult {
  algorithmId: AlgorithmId;
  selectedLinkIds: string[];
  discardedLinkIds: string[];
  totalCost: number;
  isConnected: boolean;
  componentCount: number;
  steps: AlgorithmStep[];
  startNodeId?: string;
  routing?: RoutingData;
}
