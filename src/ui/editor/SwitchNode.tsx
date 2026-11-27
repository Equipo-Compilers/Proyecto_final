import { useState, type KeyboardEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { DEVICE_KIND_LABELS, type DeviceKind } from "../../core/model/network";

export type SwitchNodeData = {
  label: string;
  kind: DeviceKind;
  isStartNode: boolean;
  isDestination: boolean;
  isRouteNode: boolean;
  isTableRouter: boolean;
  onRename: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
};

export type SwitchFlowNode = Node<SwitchNodeData, "switchNode">;

const ICON_COLOR: Record<DeviceKind, string> = {
  switch: "text-cyan-400",
  router: "text-violet-400",
  pc: "text-slate-300",
  server: "text-slate-300",
  accessPoint: "text-slate-300",
};

function KindIcon({ kind }: { kind: DeviceKind }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    className: "h-5 w-5",
  } as const;

  switch (kind) {
    case "router":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M7 12h10M10 9l2-2 2 2M10 15l2 2 2-2M9 10l-2 2 2 2M15 10l2 2-2 2" />
        </svg>
      );
    case "pc":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );
    case "server":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="7" rx="2" />
          <rect x="3" y="14" width="18" height="7" rx="2" />
          <path d="M7 6.5h.01M7 17.5h.01" />
        </svg>
      );
    case "accessPoint":
      return (
        <svg {...common}>
          <path d="M5 12a10 10 0 0 1 14 0M8 15a6 6 0 0 1 8 0" />
          <circle cx="12" cy="18" r="1.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h2M10 10h2M14 10h2M18 10h.01M6 14h12" />
        </svg>
      );
  }
}

export function SwitchNode({ id, data, selected }: NodeProps<SwitchFlowNode>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);

  const kindLabel = DEVICE_KIND_LABELS[data.kind] ?? "Dispositivo";
  const isRouter = data.kind === "router";

  const commitRename = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== data.label) {
      data.onRename(id, trimmed);
    } else {
      setDraft(data.label);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") {
      setDraft(data.label);
      setEditing(false);
    }
  };

  const borderClass = selected
    ? "border-cyan-400 ring-2 ring-cyan-400/40"
    : data.isDestination
    ? "border-amber-300 ring-2 ring-amber-300/40"
    : data.isStartNode
    ? "border-emerald-400"
    : data.isRouteNode
    ? "border-amber-400/80"
    : data.isTableRouter
    ? "border-violet-400"
    : "border-slate-600 hover:border-slate-400";

  return (
    <div
      className={`group relative flex min-w-28 flex-col items-center rounded-xl border-2 bg-slate-900 px-3 py-2.5 text-white shadow-lg transition-all ${borderClass}`}
      onDoubleClick={() => {
        setDraft(data.label);
        setEditing(true);
      }}
      title={
        isRouter
          ? "Clic para ver su tabla de enrutamiento · Doble clic para renombrar · Arrastra desde los puntos para conectar"
          : "Doble clic para renombrar · Arrastra desde los puntos para conectar"
      }
    >
      {/* Conectores (Handles) en los 4 lados para facilitar el cableado visual */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-cyan-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-cyan-400"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-cyan-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-cyan-400"
      />

      {/* Botón rápido para eliminar el dispositivo */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
        title={`Eliminar ${kindLabel.toLowerCase()}`}
        className="nodrag absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow hover:bg-rose-500 group-hover:flex"
      >
        ×
      </button>

      {/* Ícono y tipo de dispositivo */}
      <div className={`mb-1 flex items-center gap-1.5 ${ICON_COLOR[data.kind] ?? "text-cyan-400"}`}>
        <KindIcon kind={data.kind} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {kindLabel}
        </span>
      </div>

      {/* Etiqueta editable */}
      {editing ? (
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          className="nodrag w-24 rounded border border-cyan-400 bg-slate-800 px-1.5 py-0.5 text-center text-sm font-bold text-white focus:outline-none"
        />
      ) : (
        <span className="text-sm font-bold text-slate-100">{data.label}</span>
      )}

      {/* Insignias: origen / destino */}
      {data.isStartNode && (
        <span className="mt-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
          {isRouter ? "Origen" : "Nodo inicial"}
        </span>
      )}
      {data.isDestination && (
        <span className="mt-1 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
          Destino
        </span>
      )}
    </div>
  );
}
