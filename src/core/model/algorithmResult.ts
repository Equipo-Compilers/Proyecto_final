export type AlgorithmId = "prim" | "kruskal";

export type StepDecision = "accepted" | "discarded";

export interface AlgorithmStep {
  stepNumber: number;
  linkId: string;
  decision: StepDecision;
  acceptedLinkIds: string[];
  totalCost: number;
  explanation: string;
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
}
