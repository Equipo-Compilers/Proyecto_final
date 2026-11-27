import type { Node, NodeProps } from "@xyflow/react";

export type PacketFlowNode = Node<Record<string, never>, "packetNode">;

export function PacketNode(_props: NodeProps<PacketFlowNode>) {
  return (
    <div
      aria-label="Paquete"
      className="pointer-events-none h-6 w-6 rounded-full bg-amber-300 ring-4 ring-amber-300/40 shadow-[0_0_14px_rgba(252,211,77,0.9)]"
    />
  );
}
