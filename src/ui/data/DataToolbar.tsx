import { useState, type ChangeEvent } from "react";

import { exportNetworkJson, parseNetworkJson } from "../../core/io/networkJson";
import { generateRandomNetwork, MAX_RANDOM_SWITCHES } from "../../core/generator/randomNetwork";
import { getExamplesForMode } from "../../data/examples";
import { useNetworkStore } from "../../store/networkStore";

type Message = { kind: "ok" | "error"; text: string } | null;

function downloadText(fileName: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

const buttonClass =
  "rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700 active:scale-95";

export function DataToolbar() {
  const network = useNetworkStore((s) => s.network);
  const mode = useNetworkStore((s) => s.analysisMode);
  const setNetwork = useNetworkStore((s) => s.setNetwork);
  const clearNetwork = useNetworkStore((s) => s.clearNetwork);

  const examples = getExamplesForMode(mode);
  const deviceName = mode === "layer3" ? "routers" : "switches";

  const [message, setMessage] = useState<Message>(null);
  const [randomSize, setRandomSize] = useState(8);

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
    input.value = ""; // permite volver a elegir el mismo archivo
  };

  const onExample = (e: ChangeEvent<HTMLSelectElement>) => {
    const example = examples.find((x) => x.id === e.target.value);
    if (example) {
      setNetwork(example.network);
      setMessage({ kind: "ok", text: `Ejemplo «${example.label}» cargado.` });
    }
    e.target.value = "";
  };

  const onRandom = () => {
    try {
      const generated = generateRandomNetwork({
        switches: randomSize,
        kind: mode === "layer3" ? "router" : "switch",
        seed: Math.floor(Math.random() * 1_000_000),
      });
      setNetwork(generated);
      setMessage({ kind: "ok", text: `Red aleatoria de ${randomSize} ${deviceName} generada.` });
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

      <label className="mb-1 block text-sm text-slate-300" htmlFor="example-select">
        Cargar ejemplo
      </label>
      <select
        id="example-select"
        defaultValue=""
        onChange={onExample}
        className="mb-3 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
      >
        <option value="" disabled>
          Elige una red…
        </option>
        {examples.map((example) => (
          <option key={example.id} value={example.id}>
            {example.label}
          </option>
        ))}
      </select>

      <div className="mb-3 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={MAX_RANDOM_SWITCHES}
          value={randomSize}
          onChange={onRandomSizeChange}
          aria-label={`Cantidad de ${deviceName} de la red aleatoria`}
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
