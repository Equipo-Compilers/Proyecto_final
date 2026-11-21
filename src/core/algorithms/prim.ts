import type {
  PrimInput,
  PrimModelResult,
  PrimStep,
  PrimEdge,
} from "../model/primModel";

import { PriorityQueue } from "../utils/priorityQueue";

export function executePrim(input: PrimInput): PrimModelResult {
  const { graph, startNode } = input;

  const visited = new Set<string>();
  const mstEdges: PrimEdge[] = [];
  const steps: PrimStep[] = [];

  let totalCost = 0;
  let stepNumber = 1;

  const startExists = graph.nodes.some(
    (node) => node.id === startNode
  );

  if (!startExists) {
    return {
      startNode,
      steps,
      mstEdges,
      totalCost,
    };
  }

  visited.add(startNode);

  const priorityQueue = new PriorityQueue<PrimEdge>(
    (a, b) => a.weight - b.weight
  );

  graph.edges.forEach((edge) => {
    if (edge.source === startNode || edge.target === startNode) {
      priorityQueue.enqueue(edge);
    }
  });

  while (
    !priorityQueue.isEmpty() &&
    visited.size < graph.nodes.length
  ) {
    const selectedEdge = priorityQueue.dequeue();

    if (!selectedEdge) {
      break;
    }

    const sourceVisited = visited.has(selectedEdge.source);
    const targetVisited = visited.has(selectedEdge.target);

    if (sourceVisited && targetVisited) {
      continue;
    }

    if (!sourceVisited && !targetVisited) {
      continue;
    }

    const newNode = sourceVisited
      ? selectedEdge.target
      : selectedEdge.source;

    visited.add(newNode);
    mstEdges.push(selectedEdge);
    totalCost += selectedEdge.weight;

    graph.edges.forEach((edge) => {
      const connectsNewNode =
        edge.source === newNode || edge.target === newNode;

      const connectsUnvisitedNode =
        !visited.has(edge.source) || !visited.has(edge.target);

      if (connectsNewNode && connectsUnvisitedNode) {
        priorityQueue.enqueue(edge);
      }
    });

    const candidateEdges = graph.edges.filter(
      (edge) =>
        (visited.has(edge.source) && !visited.has(edge.target)) ||
        (visited.has(edge.target) && !visited.has(edge.source))
    );

    const step: PrimStep = {
      stepNumber,
      currentNode: newNode,
      selectedEdge,
      visitedNodes: Array.from(visited),
      candidateEdges,
      totalCost,
      explanation: `Se seleccionó la arista ${selectedEdge.source} - ${selectedEdge.target} con peso ${selectedEdge.weight}.`,
    };

    steps.push(step);
    stepNumber++;
  }

  return {
    startNode,
    steps,
    mstEdges,
    totalCost,
  };
}
