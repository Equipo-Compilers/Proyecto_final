import { describe, it, expect } from "vitest";

import { runAlgorithm } from "../core/algorithms/registry";
import { getLinkStates } from "../core/model/linkVisualState";
import { EXAMPLE_NETWORKS } from "../data/examples";

const net = EXAMPLE_NETWORKS[0].network;
const kruskal = runAlgorithm("kruskal", net);
const prim = runAlgorithm("prim", net);

const count = (m: Map<string, string>, state: string) =>
  [...m.values()].filter((v) => v === state).length;

describe("getLinkStates", () => {
  it("sin resultado todo es neutro", () => {
    const s = getLinkStates(net, null, null);
    expect(s.size).toBe(7);
    expect(count(s, "neutral")).toBe(7);
  });

  it("vista final: elegidos en selected y el resto descartado", () => {
    const s = getLinkStates(net, kruskal, null);
    expect(count(s, "selected")).toBe(4);
    expect(count(s, "discarded")).toBe(3);
    expect(s.get("e1")).toBe("selected");
    expect(s.get("e3")).toBe("discarded");
  });

  it("paso -1 (antes del primer paso): todo neutro", () => {
    expect(count(getLinkStates(net, kruskal, -1), "neutral")).toBe(7);
  });

  it("paso a paso: solo se pintan los enlaces ya decididos", () => {
    const s0 = getLinkStates(net, kruskal, 0);
    expect(s0.get("e1")).toBe("selected");
    expect(count(s0, "neutral")).toBe(6);

    const s2 = getLinkStates(net, kruskal, 2); // 3er paso: A-C descartado
    expect(s2.get("e3")).toBe("discarded");
    expect(s2.get("e4")).toBe("neutral");
  });

  it("un índice mayor al último se queda en el último paso", () => {
    const s = getLinkStates(net, kruskal, 999);
    expect(count(s, "neutral")).toBe(0);
    expect(count(s, "selected")).toBe(4);
  });

  it("con Prim, en paso a paso solo hay enlaces elegidos", () => {
    const s = getLinkStates(net, prim, prim.steps.length - 1);
    expect(count(s, "selected")).toBe(4);
    expect(count(s, "discarded")).toBe(0);
  });

  it("con Prim, en vista final lo no elegido sale descartado", () => {
    const s = getLinkStates(net, prim, null);
    expect(count(s, "selected")).toBe(4);
    expect(count(s, "discarded")).toBe(3);
  });

  it("si el resultado no tiene pasos usa la vista final", () => {
    const sinPasos = runAlgorithm("kruskal", net, { recordSteps: false });
    const s = getLinkStates(net, sinPasos, 2);
    expect(count(s, "selected")).toBe(4);
  });

  it("ignora enlaces del resultado que ya no están en la red", () => {
    const fantasma = { ...kruskal, steps: [{ ...kruskal.steps[0], linkId: "fantasma" }] };
    const s = getLinkStates(net, fantasma, 0);
    expect(s.has("fantasma")).toBe(false);
  });
});
