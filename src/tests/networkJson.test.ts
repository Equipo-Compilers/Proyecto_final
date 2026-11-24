import { describe, it, expect } from "vitest";

import {
  MAX_DEVICES,
  exportNetworkJson,
  parseNetworkJson,
  parseNetworkObject,
} from "../core/io/networkJson";
import expected from "../data/examples/expected.json";
import { EXAMPLE_NETWORKS } from "../data/examples";

const base = () => ({
  name: "prueba",
  devices: [
    { id: "A", kind: "switch", label: "A", position: { x: 1, y: 2 }, status: "up" },
    { id: "B", kind: "switch", label: "B", position: { x: 3, y: 4 }, status: "up" },
  ],
  links: [{ id: "e1", source: "A", target: "B", cost: 3, status: "up" }],
});

function errorsOf(value: unknown): string[] {
  const r = parseNetworkObject(value);
  return r.ok ? [] : r.errors;
}

describe("ejemplos", () => {
  it("se cargan los 4 ejemplos", () => {
    expect(EXAMPLE_NETWORKS).toHaveLength(4);
  });
});

describe("exportar e importar", () => {
  for (const example of EXAMPLE_NETWORKS) {
    it(`ida y vuelta sin pérdidas: ${example.id}`, () => {
      const parsed = parseNetworkJson(exportNetworkJson(example.network));
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(parsed.network).toEqual(example.network);
    });
  }

  it("el JSON exportado trae name, devices y links", () => {
    const obj = JSON.parse(exportNetworkJson(EXAMPLE_NETWORKS[0].network));
    expect(Object.keys(obj)).toEqual(["name", "devices", "links"]);
  });
});

describe("importar: rechaza archivos malos con mensajes claros", () => {
  it("texto que no es JSON", () => {
    const r = parseNetworkJson("{esto no es json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("JSON");
  });

  it("raíz que no es un objeto", () => {
    expect(errorsOf([1, 2, 3]).length > 0).toBe(true);
    expect(errorsOf(null).length > 0).toBe(true);
    expect(errorsOf("hola").length > 0).toBe(true);
  });

  it("falta devices o links (p. ej. el archivo expected.json)", () => {
    expect(errorsOf(expected)[0]).toContain("devices");
    const { links: _links, ...sinLinks } = base();
    void _links;
    expect(errorsOf(sinLinks)[0]).toContain("links");
  });

  it("dispositivo sin id, con kind o status inválidos, o con posición mala", () => {
    const sinId = base();
    (sinId.devices[0] as Record<string, unknown>).id = "";
    expect(errorsOf(sinId).length > 0).toBe(true);

    const kind = base();
    (kind.devices[0] as Record<string, unknown>).kind = "tostadora";
    expect(errorsOf(kind).length > 0).toBe(true);

    const status = base();
    (status.devices[0] as Record<string, unknown>).status = "roto";
    expect(errorsOf(status).length > 0).toBe(true);

    const pos = base();
    (pos.devices[0] as Record<string, unknown>).position = { x: "1", y: 2 };
    expect(errorsOf(pos).length > 0).toBe(true);
  });

  it("enlace con costo de texto, sin extremos o con status inválido", () => {
    const costo = base();
    (costo.links[0] as Record<string, unknown>).cost = "3";
    expect(errorsOf(costo)[0]).toContain("«cost» debe ser un número");

    const extremos = base();
    delete (extremos.links[0] as Record<string, unknown>).source;
    expect(errorsOf(extremos).length > 0).toBe(true);

    const status = base();
    (status.links[0] as Record<string, unknown>).status = 1;
    expect(errorsOf(status).length > 0).toBe(true);
  });

  it("errores de estructura: ids repetidos, enlaces a nodos que no existen, costos <= 0", () => {
    const repetido = base();
    repetido.devices[1].id = "A";
    expect(errorsOf(repetido).length > 0).toBe(true);

    const fantasma = base();
    fantasma.links[0].target = "Z";
    expect(errorsOf(fantasma).length > 0).toBe(true);

    const negativo = base();
    negativo.links[0].cost = -4;
    expect(errorsOf(negativo).length > 0).toBe(true);
  });

  it("limita el número de errores mostrados", () => {
    const muchos = { devices: Array.from({ length: 50 }, () => 7), links: [] };
    expect(errorsOf(muchos).length).toBe(10);
  });

  it("rechaza redes demasiado grandes", () => {
    const grande = {
      devices: Array.from({ length: MAX_DEVICES + 1 }, (_, i) => ({ id: `S${i}` })),
      links: [],
    };
    expect(errorsOf(grande)[0]).toContain("Demasiados");
  });
});

describe("importar: completa los campos opcionales", () => {
  it("pone valores por defecto a kind, label, position, status y name", () => {
    const r = parseNetworkObject({
      devices: [{ id: "A" }, { id: "B" }],
      links: [{ id: "e1", source: "A", target: "B", cost: 2 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.network.name).toBe("Red importada");
      expect(r.network.devices[0].kind).toBe("switch");
      expect(r.network.devices[0].label).toBe("A");
      expect(r.network.devices[0].status).toBe("up");
      expect(r.network.devices[1].position === r.network.devices[0].position).toBe(false);
      expect(r.network.links[0].status).toBe("up");
    }
  });
});
