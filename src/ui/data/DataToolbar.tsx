import { useState, type ChangeEvent } from "react";
import dagre from "@dagrejs/dagre";

import { exportNetworkJson, parseNetworkJson } from "../../core/io/networkJson";
import { generateRandomNetwork, MAX_RANDOM_SWITCHES } from "../../core/generator/randomNetwork";
import type { Network } from "../../core/model/network";
import { useNetworkStore } from "../../store/networkStore";

type Message = { kind: "ok" | "error"; text: string } | null;
type ShapeKind = "grid" | "ring" | "star" | "tree";

function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatNetworkShape(net: Network, shape: ShapeKind): Network {
  const devices = net.devices;
  const count = devices.length;
  if (count === 0) return net;

  if (shape === "grid") {
    const cols = Math.ceil(Math.sqrt(count));
    return {
      ...net,
      devices: devices.map((device, idx) => ({
        ...device,
        position: {
          x: 100 + (idx % cols) * 210,
          y: 90 + Math.floor(idx / cols) * 165,
        },
      })),
    };
  }

  if (shape === "ring") {
    const radius = Math.max(170, count * 38);
    const centerX = radius + 120;
    const centerY = radius + 90;

    return {
      ...net,
      devices: devices.map((device, idx) => {
        const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
        return {
          ...device,
          position: {
            x: Math.round(centerX + radius * Math.cos(angle)),
            y: Math.round(centerY + radius * Math.sin(angle)),
          },
        };
      }),
    };
  }

  if (shape === "star") {
    if (count === 1) {
      return {
        ...net,
        devices: [{ ...devices[0], position: { x: 300, y: 220 } }],
      };
    }

    const degree = new Map<string, number>();
    for (const d of devices) degree.set(d.id, 0);
    for (const l of net.links) {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }

    const sorted = [...devices].sort(
      (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
    );
    const [hub, ...spokes] = sorted;
    const radius = Math.max(180, spokes.length * 40);
    const centerX = radius + 120;
    const centerY = radius + 90;

    const positions = new Map<string, { x: number; y: number }>();
    positions.set(hub.id, { x: centerX, y: centerY });
    spokes.forEach((device, idx) => {
      const angle = (2 * Math.PI * idx) / spokes.length - Math.PI / 2;
      positions.set(device.id, {
        x: Math.round(centerX + radius * Math.cos(angle)),
        y: Math.round(centerY + radius * Math.sin(angle)),
      });
    });

    return {
      ...net,
      devices: devices.map((d) => ({
        ...d,
        position: positions.get(d.id) ?? d.position,
      })),
    };
  }

  // shape === "tree"
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 100 });

  for (const d of devices) {
    g.setNode(d.id, { width: 130, height: 80 });
  }
  for (const l of net.links) {
    g.setEdge(l.source, l.target);
  }
  dagre.layout(g);

  return {
    ...net,
    devices: devices.map((d) => {
      const pos = g.node(d.id);
      return pos
        ? {
            ...d,
            position: {
              x: Math.round(pos.x - 65 + 100),
              y: Math.round(pos.y - 40 + 80),
            },
          }
        : d;
    }),
  };
}

const buttonClass =
  "rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700 active:scale-95";

export function DataToolbar() {
  const network = useNetworkStore((s) => s.network);
  const setNetwork = useNetworkStore((s) => s.setNetwork);
  const clearNetwork = useNetworkStore((s) => s.clearNetwork);

  const [message, setMessage] = useState<Message>(null);
  const [randomSize, setRandomSize] = useState(8);
  const [randomShape, setRandomShape] = useState<ShapeKind>("grid");

  const onExport = () => {
    const safeName = network.name.replace(/[^a-zA-Z0-9-_]+/g, "_") || "red";
    downloadText(`${safeName}.json`, exportNetworkJson(network));
    setMessage({ kind: "ok", text: "Red exportada." });
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed = parseNetworkJson(await file.text());
      if (parsed.ok) {
        setNetwork(parsed.network);
        setMessage({ kind: "ok", text: `Red «${parsed.network.name}» importada.` });
      } else {
        setMessage({ kind: "error", text: parsed.errors.join(" · ") });
      }
    } catch {
      setMessage({ kind: "error", text: "No se pudo leer el archivo." });
    }
    input.value = "";
  };

  const onRandom = () => {
    try {
      const generated = generateRandomNetwork({
        switches: randomSize,
        seed: Math.floor(Math.random() * 1_000_000),
      });
      const shaped = formatNetworkShape(generated, randomShape);
      setNetwork(shaped);
      setMessage({ kind: "ok", text: `Red aleatoria de ${randomSize} switches generada.` });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo generar la red.",
      });
    }
  };

  const onRandomSizeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRandomSize(Number(e.target.value));
  };

  const onClear = () => {
    clearNetwork();
    setMessage({ kind: "ok", text: "Lienzo limpio." });
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-cyan-400">Red</h2>
      <p className="mb-3 text-sm text-slate-400">
        {network.name}: {network.devices.length} dispositivos, {network.links.length} enlaces
      </p>

      <label className="mb-1 block text-sm text-slate-300" htmlFor="random-shape-select">
        Forma de red aleatoria
      </label>
      <select
        id="random-shape-select"
        value={randomShape}
        onChange={(e) => setRandomShape(e.target.value as ShapeKind)}
        className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
      >
        <option value="grid">Cuadrícula ordenada (Por defecto)</option>
        <option value="ring">Anillo (Círculo)</option>
        <option value="star">Estrella (Hub central)</option>
        <option value="tree">Árbol jerárquico</option>
      </select>

      <label className="mb-1 block text-sm text-slate-300" htmlFor="random-switches-input">
        Cantidad de switches (1–{MAX_RANDOM_SWITCHES})
      </label>
      <div className="mb-3 flex items-center gap-2">
        <input
          id="random-switches-input"
          type="number"
          min={1}
          max={MAX_RANDOM_SWITCHES}
          value={randomSize === 0 ? "" : randomSize}
          onChange={onRandomSizeChange}
          aria-label="Cantidad de switches de la red aleatoria"
          className="w-20 rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-white focus:border-cyan-400 focus:outline-none"
        />
        <button type="button" onClick={onRandom} className={buttonClass}>
          Generar aleatoria
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onExport} className={buttonClass}>
          Exportar JSON
        </button>
        <label className={`${buttonClass} cursor-pointer`}>
          Importar JSON
          <input type="file" accept=".json,application/json" onChange={onImport} className="hidden" />
        </label>
        <button type="button" onClick={onClear} className={buttonClass}>
          Limpiar
        </button>
      </div>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.kind === "error"
              ? "bg-rose-950 text-rose-300"
              : "bg-emerald-950 text-emerald-300"
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}