import { useState, type KeyboardEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type SwitchNodeData = {
  label: string;
  isStartNode: boolean;
  onRename: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
};

export type SwitchFlowNode = Node<SwitchNodeData, "switchNode">;

export function SwitchNode({ id, data, selected }: NodeProps<SwitchFlowNode>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);

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
    : data.isStartNode
    ? "border-emerald-400"
    : "border-slate-600 hover:border-slate-400";

  return (
    <div
      className={`group relative flex min-w-28 flex-col items-center rounded-xl border-2 bg-slate-900 px-3 py-2.5 text-white shadow-lg transition-all ${borderClass}`}
      onDoubleClick={() => {
        setDraft(data.label);
        setEditing(true);
      }}
      title="Doble clic para renombrar · Arrastra desde los puntos para conectar"
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

      {/* Botón rápido para eliminar el switch */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onDelete(id);
        }}
        title="Eliminar switch"
        className="nodrag absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow hover:bg-rose-500 group-hover:flex"
      >
        ×
      </button>

      {/* Ícono de Switch de red */}
      <div className="mb-1 flex items-center gap-1.5 text-cyan-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M6 10h2M10 10h2M14 10h2M18 10h.01M6 14h12" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Switch
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

      {/* Insignia si es el nodo inicial seleccionado para Prim */}
      {data.isStartNode && (
        <span className="mt-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
          Nodo inicial
        </span>
      )}
    </div>
  );
}