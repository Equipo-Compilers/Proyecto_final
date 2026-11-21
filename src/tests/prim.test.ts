import { describe, it, expect } from "vitest";
import { executePrim } from "../core/algorithms/prim";
import type { PrimInput } from "../core/model/primModel";

describe("Algoritmo de Prim", () => {
  const graph: PrimInput = {
    graph: {
      nodes: [
        { id: "A", label: "A" },
        { id: "B", label: "B" },
        { id: "C", label: "C" },
        { id: "D", label: "D" },
      ],
      edges: [
        { source: "A", target: "B", weight: 1 },
        { source: "A", target: "C", weight: 4 },
        { source: "B", target: "C", weight: 2 },
        { source: "B", target: "D", weight: 5 },
        { source: "C", target: "D", weight: 3 },
      ],
    },
    startNode: "A",
  };

  it("debe construir el árbol de expansión mínima", () => {
    const result = executePrim(graph);

    expect(result.mstEdges).toHaveLength(3);
  });

  it("debe calcular correctamente el costo total", () => {
    const result = executePrim(graph);

    expect(result.totalCost).toBe(6);
  });

  it("debe conectar todos los nodos", () => {
    const result = executePrim(graph);

    const connectedNodes = new Set<string>();

    result.mstEdges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    expect(connectedNodes.size).toBe(4);
  });

  it("debe funcionar con otro nodo inicial", () => {
    const result = executePrim({
      ...graph,
      startNode: "C",
    });

    expect(result.startNode).toBe("C");
    expect(result.totalCost).toBe(6);
    expect(result.mstEdges).toHaveLength(3);
  });

  it("debe detenerse si el grafo está desconectado", () => {
    const disconnectedGraph: PrimInput = {
      graph: {
        nodes: [
          { id: "A", label: "A" },
          { id: "B", label: "B" },
          { id: "C", label: "C" },
        ],
        edges: [
          { source: "A", target: "B", weight: 5 },
        ],
      },
      startNode: "A",
    };

    const result = executePrim(disconnectedGraph);

    expect(result.mstEdges).toHaveLength(1);
    expect(result.totalCost).toBe(5);
  });
});

