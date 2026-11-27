import { describe, it, expect } from "vitest";

import { runAlgorithm } from "../core/algorithms/registry";
import { advanceProgress, getPacketPosition, IDLE_PACKET } from "../core/utils/packetAnimation";
import { getRoutePath } from "../core/utils/routing";
import { ROUTING_EXAMPLE_NETWORKS } from "../data/examples";

const red = ROUTING_EXAMPLE_NETWORKS[0].network;
const result = runAlgorithm("dijkstra", red, { startNodeId: "R1" });
const route = getRoutePath(red, result, "R5")!; // R1 → R3 → R6 → R5 (3 saltos)
const positions = new Map(red.devices.map((d) => [d.id, d.position]));
const at = (id: string) => positions.get(id)!;

describe("getPacketPosition", () => {
  it("al inicio está en el origen", () => {
    const p = getPacketPosition(route, positions, 0)!;
    expect(p.x).toBe(at("R1").x);
    expect(p.y).toBe(at("R1").y);
    expect(p.hopIndex).toBe(0);
    expect(p.arrived).toBe(false);
    expect(p.reachedDeviceIds).toEqual(["R1"]);
    expect(p.traveledLinkIds).toEqual([]);
  });

  it("a mitad del primer salto está en el punto medio entre R1 y R3", () => {
    const p = getPacketPosition(route, positions, 1 / 6)!;
    expect(p.fromId).toBe("R1");
    expect(p.toId).toBe("R3");
    expect(Math.abs(p.segmentProgress - 0.5) < 1e-9).toBe(true);
    expect(Math.abs(p.x - (at("R1").x + at("R3").x) / 2) < 1e-9).toBe(true);
    expect(Math.abs(p.y - (at("R1").y + at("R3").y) / 2) < 1e-9).toBe(true);
  });

  it("cada salto ocupa un tercio del recorrido", () => {
    expect(getPacketPosition(route, positions, 0.34)!.hopIndex).toBe(1);
    expect(getPacketPosition(route, positions, 0.34)!.fromId).toBe("R3");
    expect(getPacketPosition(route, positions, 0.7)!.hopIndex).toBe(2);
    expect(getPacketPosition(route, positions, 0.7)!.toId).toBe("R5");
  });

  it("recuerda por dónde ya pasó", () => {
    const p = getPacketPosition(route, positions, 0.5)!;
    expect(p.reachedDeviceIds).toEqual(["R1", "R3"]);
    expect(p.traveledLinkIds).toEqual([route.linkIds[0]]);
  });

  it("al final está en el destino y marca que llegó", () => {
    const p = getPacketPosition(route, positions, 1)!;
    expect(p.arrived).toBe(true);
    expect(p.x).toBe(at("R5").x);
    expect(p.y).toBe(at("R5").y);
    expect(p.reachedDeviceIds).toEqual(route.deviceIds);
    expect(p.traveledLinkIds).toEqual(route.linkIds);
  });

  it("limita el progreso a 0..1 y tolera valores raros", () => {
    expect(getPacketPosition(route, positions, -3)!.x).toBe(at("R1").x);
    expect(getPacketPosition(route, positions, 7)!.arrived).toBe(true);
    expect(getPacketPosition(route, positions, Number.NaN)!.x).toBe(at("R1").x);
  });

  it("devuelve null sin camino, sin saltos o sin posiciones", () => {
    expect(getPacketPosition(null, positions, 0.5)).toBeNull();
    expect(getPacketPosition(getRoutePath(red, result, "R1"), positions, 0.5)).toBeNull();
    expect(getPacketPosition(route, new Map(), 0.5)).toBeNull();
  });
});

describe("advanceProgress", () => {
  it("con velocidad 1 un salto tarda un segundo", () => {
    expect(advanceProgress(0, 1000, 1, 1)).toBe(1);
    expect(Math.abs(advanceProgress(0, 1000, 4, 1) - 0.25) < 1e-12).toBe(true);
  });

  it("la velocidad multiplica el avance", () => {
    expect(Math.abs(advanceProgress(0, 500, 2, 2) - 0.5) < 1e-12).toBe(true);
    expect(Math.abs(advanceProgress(0, 500, 2, 0.5) - 0.125) < 1e-12).toBe(true);
  });

  it("nunca pasa de 1 y no avanza con datos inválidos", () => {
    expect(advanceProgress(0.9, 99999, 3, 4)).toBe(1);
    expect(advanceProgress(0.4, 100, 0, 1)).toBe(0.4);
    expect(advanceProgress(0.4, 100, 3, 0)).toBe(0.4);
    expect(advanceProgress(0.4, -50, 3, 1)).toBe(0.4);
    expect(advanceProgress(0.4, Number.NaN, 3, 1)).toBe(0.4);
  });

  it("estado inicial: quieto, en el origen y a velocidad 1", () => {
    expect(IDLE_PACKET).toEqual({ status: "idle", progress: 0, speed: 1 });
  });
});
