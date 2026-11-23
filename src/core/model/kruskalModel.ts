export interface KruskalNode {
  id: string
  label: string
}

export interface KruskalEdge {
  source: string
  target: string
  weight: number
}

export interface KruskalGraph {
  nodes: KruskalNode[]
  edges: KruskalEdge[]
}

export interface KruskalInput {
  graph: KruskalGraph
}

export type KruskalDecision = 'accepted' | 'discarded'

export interface KruskalStep {
  stepNumber: number
  evaluatedEdge: KruskalEdge
  decision: KruskalDecision
  acceptedEdges: KruskalEdge[]
  totalCost: number
  explanation: string
}

export interface KruskalModelResult {
  steps: KruskalStep[]
  mstEdges: KruskalEdge[]
  discardedEdges: KruskalEdge[]
  totalCost: number
  isConnected: boolean
  componentCount: number
}

export interface KruskalOptions {
  recordSteps?: boolean
}