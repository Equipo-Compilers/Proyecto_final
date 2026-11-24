import { UnionFind } from '../utils/unionFind'
import type {
  KruskalEdge,
  KruskalDecision,
  KruskalInput,
  KruskalModelResult,
  KruskalOptions,
  KruskalStep,
} from '../model/kruskalModel'

export function executeKruskal(
  input: KruskalInput,
  options: KruskalOptions = {},
): KruskalModelResult {
  const { recordSteps = true } = options
  const { nodes, edges } = input.graph

  const labels = new Map<string, string>()
  for (const node of nodes) labels.set(node.id, node.label)
  const nodeCount = labels.size

  for (const edge of edges) {
    if (!labels.has(edge.source) || !labels.has(edge.target)) {
      throw new Error(
        `El enlace ${edge.source}-${edge.target} usa un nodo que no existe`,
      )
    }
    if (!Number.isFinite(edge.weight)) {
      throw new Error(
        `El enlace ${edge.source}-${edge.target} tiene un peso inválido`,
      )
    }
  }

  const nombre = (id: string) => labels.get(id) ?? id
  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight)
  const unionFind = new UnionFind([...labels.keys()])

  const mstEdges: KruskalEdge[] = []
  const discardedEdges: KruskalEdge[] = []
  const steps: KruskalStep[] = []
  let totalCost = 0

  const registrarPaso = (
    edge: KruskalEdge,
    decision: KruskalDecision,
    explanation: string,
  ) => {
    if (!recordSteps) return
    steps.push({
      stepNumber: steps.length + 1,
      evaluatedEdge: edge,
      decision,
      acceptedEdges: [...mstEdges],
      totalCost,
      explanation,
    })
  }

  for (const edge of sortedEdges) {
    const par = `${nombre(edge.source)}–${nombre(edge.target)} (costo ${edge.weight})`

    if (edge.source === edge.target) {
      discardedEdges.push(edge)
      registrarPaso(
        edge,
        'discarded',
        `Se descarta ${par}: conecta un switch consigo mismo.`,
      )
    } else if (mstEdges.length === nodeCount - 1) {
      discardedEdges.push(edge)
      registrarPaso(
        edge,
        'discarded',
        `Se descarta ${par}: el árbol ya está completo.`,
      )
    } else if (unionFind.union(edge.source, edge.target)) {
      mstEdges.push(edge)
      totalCost += edge.weight
      registrarPaso(
        edge,
        'accepted',
        `Se acepta ${par}: une dos grupos que todavía no estaban conectados.`,
      )
    } else {
      discardedEdges.push(edge)
      registrarPaso(
        edge,
        'discarded',
        `Se descarta ${par}: ${nombre(edge.source)} y ${nombre(edge.target)} ya están conectados y formaría un ciclo.`,
      )
    }
  }

  const componentCount = nodeCount - mstEdges.length

  return {
    steps,
    mstEdges,
    discardedEdges,
    totalCost,
    isConnected: componentCount <= 1,
    componentCount,
  }
}