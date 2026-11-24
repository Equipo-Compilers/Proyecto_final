import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";

import { getLinkStates } from "../../core/model/linkVisualState";
import { useNetworkStore } from "../../store/networkStore";
import { CostEdge, type CostFlowEdge } from "./CostEdge";
import { EditorToolbar } from "./EditorToolbar";
import { SwitchNode, type SwitchFlowNode } from "./SwitchNode";

const nodeTypes = {
  switchNode: SwitchNode,
};

const edgeTypes = {
  costEdge: CostEdge,
};

export function NetworkEditor() {
  const network = useNetworkStore((s) => s.network);
  const result = useNetworkStore((s) => s.result);
  const stepIndex = useNetworkStore((s) => s.stepIndex);
  const startNodeId = useNetworkStore((s) => s.startNodeId);

  const moveDevice = useNetworkStore((s) => s.moveDevice);
  const renameDevice = useNetworkStore((s) => s.renameDevice);
  const removeDevice = useNetworkStore((s) => s.removeDevice);
  const addLink = useNetworkStore((s) => s.addLink);
  const updateLinkCost = useNetworkStore((s) => s.updateLinkCost);
  const removeLink = useNetworkStore((s) => s.removeLink);

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const nodes: SwitchFlowNode[] = useMemo(
    () =>
      network.devices.map((device) => ({
        id: device.id,
        type: "switchNode",
        position: device.position,
        width: 120,
        height: 76,
        data: {
          label: device.label,
          isStartNode: device.id === startNodeId,
          onRename: renameDevice,
          onDelete: removeDevice,
        },
      })),
    [network.devices, startNodeId, renameDevice, removeDevice]
  );

  const linkStates = useMemo(
    () => getLinkStates(network, result, stepIndex),
    [network, result, stepIndex]
  );

  const edges: CostFlowEdge[] = useMemo(
    () =>
      network.links.map((link) => ({
        id: link.id,
        type: "costEdge",
        source: link.source,
        target: link.target,
        data: {
          cost: link.cost,
          visualState: linkStates.get(link.id) ?? "neutral",
          onUpdateCost: updateLinkCost,
          onDelete: removeLink,
        },
      })),
    [network.links, linkStates, updateLinkCost, removeLink]
  );

  const translateExtent = useMemo((): [[number, number], [number, number]] => {
    if (network.devices.length === 0) {
      return [
        [-500, -400],
        [900, 700],
      ];
    }

    const padding = 250;
    const xs = network.devices.map((d) => d.position.x);
    const ys = network.devices.map((d) => d.position.y);

    const minX = Math.min(...xs) - padding;
    const minY = Math.min(...ys) - padding;
    const maxX = Math.max(...xs) + 140 + padding;
    const maxY = Math.max(...ys) + 90 + padding;

    return [
      [minX, minY],
      [maxX, maxY],
    ];
  }, [network.devices]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<SwitchFlowNode>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          moveDevice(change.id, change.position);
        }
      }
    },
    [moveDevice]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const rawCost = window.prompt(
        `Costo del enlace entre ${connection.source} y ${connection.target}:`,
        "4"
      );
      if (rawCost === null) return;
      const parsedCost = Number(rawCost);
      addLink(connection.source, connection.target, parsedCost);
    },
    [addLink]
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      setSelectedNodeIds(selNodes.map((n) => n.id));
      setSelectedEdgeIds(selEdges.map((e) => e.id));
    },
    []
  );

  const handleDeleteSelected = useCallback(() => {
    for (const edgeId of selectedEdgeIds) {
      removeLink(edgeId);
    }
    for (const nodeId of selectedNodeIds) {
      removeDevice(nodeId);
    }
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [selectedEdgeIds, selectedNodeIds, removeLink, removeDevice]);

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
      <EditorToolbar
        selectedNodeIds={selectedNodeIds}
        selectedEdgeIds={selectedEdgeIds}
        onDeleteSelected={handleDeleteSelected}
      />

      <div className="relative h-[58vh] min-h-[400px] w-full bg-slate-950 sm:h-[66vh] lg:h-[calc(100vh-11.5rem)] lg:min-h-[600px]">
        {network.devices.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-base font-medium text-slate-300">
              El lienzo está vacío
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500 sm:text-sm">
              Toca «+ Agregar Switch» arriba o selecciona una red de ejemplo para empezar a simular.
            </p>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onSelectionChange={handleSelectionChange}
          onNodesDelete={(deleted) => deleted.forEach((n) => removeDevice(n.id))}
          onEdgesDelete={(deleted) => deleted.forEach((e) => removeLink(e.id))}
          connectionMode={ConnectionMode.Loose}
          translateExtent={translateExtent}
          minZoom={0.35}
          maxZoom={2}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-slate-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#334155"
          />
          <Controls className="!border-slate-700 !bg-slate-800 !text-white [&>button]:!border-slate-700 [&>button]:!bg-slate-800 [&>button]:!fill-slate-200 hover:[&>button]:!bg-slate-700" />
          <MiniMap
            nodeColor="#22d3ee"
            nodeStrokeColor="#f8fafc"
            nodeStrokeWidth={2}
            nodeBorderRadius={6}
            maskColor="rgba(2, 6, 23, 0.35)"
            bgColor="rgba(15, 23, 42, 0.35)"
            pannable
            zoomable
            style={{ width: 180, height: 120 }}
            className="!hidden !rounded-xl !border !border-cyan-400/35 !bg-slate-900/35 backdrop-blur-md sm:!block"
          />
        </ReactFlow>
      </div>
    </section>
  );
}