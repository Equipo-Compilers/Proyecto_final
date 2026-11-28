import { useState, type KeyboardEvent } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import type { LinkVisualState } from "../../core/model/linkVisualState";

export type CostEdgeData = {
  cost: number;
  visualState: LinkVisualState;
  isRoute?: boolean;
  isTraveled?: boolean;
  onUpdateCost: (id: string, newCost: number) => void;
  onDelete: (id: string) => void;
};

export type CostFlowEdge = Edge<CostEdgeData, "costEdge">;

export function CostEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps<CostFlowEdge>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(data?.cost ?? 1));

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const visualState: LinkVisualState = data?.visualState ?? "neutral";
  const cost = data?.cost ?? 1;
  const isRoute = data?.isRoute ?? false;
  const isTraveled = data?.isTraveled ?? false;

  const strokeColor =
    isTraveled
      ? "#fde047"
      : isRoute
      ? "#f59e0b"
      : visualState === "selected"
      ? "#10b981"
      : visualState === "discarded"
      ? "#f43f5e"
      : selected
      ? "#22d3ee"
      : "#64748b";

  const badgeStyle =
    isRoute || isTraveled
      ? "border-amber-400 bg-amber-950 text-amber-200"
      : visualState === "selected"
      ? "border-emerald-400 bg-emerald-950 text-emerald-300"
      : visualState === "discarded"
      ? "border-rose-500/70 bg-rose-950/90 text-rose-300 line-through opacity-80"
      : selected
      ? "border-cyan-400 bg-slate-900 text-cyan-300"
      : "border-slate-600 bg-slate-900 text-amber-300 hover:border-amber-400";

  const commitCost = () => {
    setEditing(false);
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== cost) {
      data?.onUpdateCost(id, parsed);
    } else {
      setDraft(String(cost));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitCost();
    if (e.key === "Escape") {
      setDraft(String(cost));
      setEditing(false);
    }
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: isTraveled ? 5 : isRoute ? 4.5 : visualState === "selected" ? 3.5 : selected ? 3 : 2.2,
          strokeDasharray: !isRoute && !isTraveled && visualState === "discarded" ? "6 4" : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan group flex items-center gap-1"
        >
          {editing ? (
            <input
              type="number"
              min={1}
              step="any"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitCost}
              onKeyDown={handleKeyDown}
              className="w-16 rounded-md border border-cyan-400 bg-slate-900 px-1.5 py-0.5 text-center text-xs font-bold text-white shadow focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(String(cost));
                setEditing(true);
              }}
              title="Clic para editar el costo del enlace"
              className={`rounded-md border px-2 py-0.5 text-xs font-bold shadow transition ${badgeStyle}`}
            >
              {cost}
            </button>
          )}

          <button
            type="button"
            onClick={() => data?.onDelete(id)}
            title="Eliminar enlace"
            className="hidden h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow hover:bg-rose-500 group-hover:flex"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}