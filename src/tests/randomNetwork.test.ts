import { describe, it, expect } from "vitest";

import { createRng, generateRandomNetwork } from "../core/generator/randomNetwork";
import { countComponents } from "../core/utils/graph";
import { validateNetwork } from "../core/validation/validator";

describe("createRng", () => {
  it("con la misma semilla da la misma secuencia", () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it("da números en [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v >= 0 && v < 1).toBe(true);
    }
  });
});

describe("generateRandomNetwork", () => {
  it("la misma semilla produce exactamente la misma red", () => {
    const a = generateRandomNetwork({ switches: 30, seed: 5 });
    const b = generateRandomNetwork({ switches: 30, seed: 5 });
    expect(a).toEqual(b);
  });

  it("semillas distintas producen redes distintas", () => {
    const a = generateRandomNetwork({ switches: 30, seed: 1 });
    const b = generateRandomNetwork({ switches: 30, seed: 2 });
    expect(JSON.stringify(a.links) === JSON.stringify(b.links)).toBe(false);
  });

  it("siempre es conexa y estructuralmente válida", () => {
    for (const n of [1, 2, 3, 10, 50, 120]) {
      for (const seed of [1, 2, 3]) {
        const net = generateRandomNetwork({ switches: n, seed });
        expect(net.devices).toHaveLength(n);
        expect(countComponents(net)).toBe(1);
        expect(validateNetwork(net)).toEqual([]);
      }
    }
  });

  it("cantidad de enlaces = árbol base + extras", () => {
    const net = generateRandomNetwork({ switches: 20, extraLinks: 15, seed: 9 });
    expect(net.links).toHaveLength(19 + 15);
  });

  it("por defecto agrega tantos enlaces extra como switches", () => {
    const net = generateRandomNetwork({ switches: 20, seed: 9 });
    expect(net.links).toHaveLength(19 + 20);
  });

  it("sin extras queda un árbol", () => {
    const net = generateRandomNetwork({ switches: 15, extraLinks: 0, seed: 3 });
    expect(net.links).toHaveLength(14);
  });

  it("no pasa del grafo completo aunque pidan más enlaces", () => {
    const net = generateRandomNetwork({ switches: 5, extraLinks: 100, seed: 4 });
    expect(net.links).toHaveLength(10);
    expect(validateNetwork(net)).toEqual([]);
  });

  it("casi completa (camino denso) sigue sin repetir pares", () => {
    const net = generateRandomNetwork({ switches: 6, extraLinks: 9, seed: 11 });
    expect(net.links).toHaveLength(5 + 9);
    expect(validateNetwork(net)).toEqual([]);
  });

  it("el árbol base es aleatorio: no siempre es una estrella", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const net = generateRandomNetwork({ switches: 30, extraLinks: 0, seed });
      const degree = new Map<string, number>();
      for (const l of net.links) {
        degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
        degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
      }
      expect(Math.max(...degree.values()) < 29).toBe(true);
    }
  });

  it("un solo switch no tiene enlaces", () => {
    expect(generateRandomNetwork({ switches: 1 }).links).toHaveLength(0);
  });

  it("respeta el rango de costos", () => {
    const net = generateRandomNetwork({ switches: 40, minCost: 5, maxCost: 8, seed: 6 });
    for (const l of net.links) expect(l.cost >= 5 && l.cost <= 8).toBe(true);
  });

  it("rechaza opciones inválidas", () => {
    expect(() => generateRandomNetwork({ switches: 0 })).toThrow();
    expect(() => generateRandomNetwork({ switches: 2.5 })).toThrow();
    expect(() => generateRandomNetwork({ switches: 999999 })).toThrow();
    expect(() => generateRandomNetwork({ switches: 5, extraLinks: -1 })).toThrow();
    expect(() => generateRandomNetwork({ switches: 5, minCost: 0 })).toThrow();
    expect(() => generateRandomNetwork({ switches: 5, minCost: 9, maxCost: 3 })).toThrow();
  });

  it("las posiciones son números finitos", () => {
    for (const n of [5, 60]) {
      const net = generateRandomNetwork({ switches: n });
      for (const d of net.devices) {
        expect(Number.isFinite(d.position.x) && Number.isFinite(d.position.y)).toBe(true);
      }
    }
  });
});
