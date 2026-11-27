import { create } from "zustand";

import { ALGORITHMS, getAlgorithmsForMode, runAlgorithm } from "../core/algorithms/registry";
import { loadNetwork, saveNetwork } from "../core/io/storage";
import type { AlgorithmId, AlgorithmResult, AnalysisMode } from "../core/model/algorithmResult";
import { createEmptyNetwork, type Network, type Position } from "../core/model/network";
import {
  addDevice as opAddDevice,
  addLink as opAddLink,
  moveDevice as opMoveDevice,
  removeDevice as opRemoveDevice,
  removeLink as opRemoveLink,
  renameDevice as opRenameDevice,
  updateLinkCost as opUpdateLinkCost,
  type AddDeviceInput,
  type OpResult,
} from "../core/model/networkOps";
import { networkForLayer } from "../core/utils/layers";
import { IDLE_PACKET, advanceProgress, type PacketState } from "../core/utils/packetAnimation";
import { getRoutePath } from "../core/utils/routing";
import { validateNetwork } from "../core/validation/validator";

export interface NetworkState {
  network: Network;
  analysisMode: AnalysisMode;
  selectedAlgorithmId: AlgorithmId;
  startNodeId: string | null;
  destinationId: string | null;
  selectedRouterId: string | null;
  result: AlgorithmResult | null;
  packet: PacketState;
  stepIndex: number | null;
  lastError: string | null;

  setNetwork: (network: Network) => void;
  clearNetwork: () => void;

  addDevice: (input?: AddDeviceInput) => string | null;
  removeDevice: (id: string) => string | null;
  moveDevice: (id: string, position: Position) => string | null;
  renameDevice: (id: string, label: string) => string | null;
  addLink: (source: string, target: string, cost: number) => string | null;
  removeLink: (id: string) => string | null;
  updateLinkCost: (id: string, cost: number) => string | null;

  setAnalysisMode: (mode: AnalysisMode) => void;
  selectAlgorithm: (id: AlgorithmId) => void;
  setStartNode: (id: string | null) => void;
  setDestination: (id: string | null) => void;
  selectRouter: (id: string | null) => void;
  runSelectedAlgorithm: () => void;
  clearResult: () => void;

  playPacket: () => void;
  pausePacket: () => void;
  resetPacket: () => void;
  setPacketSpeed: (speed: number) => void;
  tickPacket: (elapsedMs: number) => void;

  startSteps: () => void;
  nextStep: () => void;
  previousStep: () => void;
  showFinal: () => void;
  clearError: () => void;
}

const RESET_RESULT = { result: null, stepIndex: null, packet: IDLE_PACKET } as const;

export const useNetworkStore = create<NetworkState>()((set, get) => {
  const applyStructural = (op: (n: Network) => OpResult): OpResult => {
    const r = op(get().network);
    if (r.error === null) set({ network: r.network, ...RESET_RESULT, lastError: null });
    else set({ lastError: r.error });
    return r;
  };

  const applyCosmetic = (op: (n: Network) => OpResult): OpResult => {
    const r = op(get().network);
    if (r.error === null) set({ network: r.network });
    else set({ lastError: r.error });
    return r;
  };

  return {
    network: loadNetwork() ?? createEmptyNetwork(),
    analysisMode: "layer2",
    selectedAlgorithmId: "kruskal",
    startNodeId: null,
    destinationId: null,
    selectedRouterId: null,
    result: null,
    packet: IDLE_PACKET,
    stepIndex: null,
    lastError: null,

    setNetwork: (network) =>
      set({
        network,
        startNodeId: null,
        destinationId: null,
        selectedRouterId: null,
        ...RESET_RESULT,
        lastError: null,
      }),

    clearNetwork: () =>
      set({
        network: createEmptyNetwork(),
        startNodeId: null,
        destinationId: null,
        selectedRouterId: null,
        ...RESET_RESULT,
        lastError: null,
      }),

    addDevice: (input) => applyStructural((n) => opAddDevice(n, input)).createdId ?? null,

    removeDevice: (id) => {
      const r = applyStructural((n) => opRemoveDevice(n, id));
      if (r.error === null) {
        const s = get();
        if (s.startNodeId === id) set({ startNodeId: null });
        if (s.destinationId === id) set({ destinationId: null });
        if (s.selectedRouterId === id) set({ selectedRouterId: null });
      }
      return r.error;
    },

    moveDevice: (id, position) => applyCosmetic((n) => opMoveDevice(n, id, position)).error,
    renameDevice: (id, label) => applyCosmetic((n) => opRenameDevice(n, id, label)).error,

    addLink: (source, target, cost) =>
      applyStructural((n) => opAddLink(n, source, target, cost)).error,
    removeLink: (id) => applyStructural((n) => opRemoveLink(n, id)).error,
    updateLinkCost: (id, cost) => applyStructural((n) => opUpdateLinkCost(n, id, cost)).error,

    setAnalysisMode: (mode) => {
      if (mode === get().analysisMode) return;
      set({
        analysisMode: mode,
        selectedAlgorithmId: getAlgorithmsForMode(mode)[0].id,
        startNodeId: null,
        destinationId: null,
        ...RESET_RESULT,
        lastError: null,
      });
    },

    selectAlgorithm: (id) =>
      set({
        selectedAlgorithmId: id,
        analysisMode: ALGORITHMS[id].layer,
        ...RESET_RESULT,
        lastError: null,
      }),

    setStartNode: (id) => set({ startNodeId: id, ...RESET_RESULT, lastError: null }),

    setDestination: (id) => set({ destinationId: id, packet: { ...IDLE_PACKET, speed: get().packet.speed } }),
    selectRouter: (id) => set({ selectedRouterId: id }),

    runSelectedAlgorithm: () => {
      const { network, selectedAlgorithmId, startNodeId } = get();
      if (network.devices.length === 0) {
        set({ lastError: "Agrega al menos un dispositivo antes de ejecutar un algoritmo." });
        return;
      }
      if (networkForLayer(network, ALGORITHMS[selectedAlgorithmId].layer).devices.length === 0) {
        set({
          ...RESET_RESULT,
          lastError:
            "En capa 3 solo participan los routers. Agrega al menos un router o carga un ejemplo de capa 3.",
        });
        return;
      }
      const problems = validateNetwork(network);
      if (problems.length > 0) {
        set({ result: null, stepIndex: null, lastError: problems[0] });
        return;
      }
      try {
        const result = runAlgorithm(
          selectedAlgorithmId,
          network,
          startNodeId === null ? {} : { startNodeId }
        );
        set({ result, stepIndex: null, packet: { ...IDLE_PACKET, speed: get().packet.speed }, lastError: null });
      } catch (error) {
        set({
          ...RESET_RESULT,
          lastError: error instanceof Error ? error.message : "Error desconocido al ejecutar",
        });
      }
    },

    clearResult: () => set({ ...RESET_RESULT }),

    playPacket: () => {
      const { network, result, destinationId, packet } = get();
      const route = getRoutePath(network, result, destinationId);
      if (!route || route.hops.length === 0) return;
      // si ya había llegado, vuelve a salir desde el origen
      const progress = packet.status === "finished" ? 0 : packet.progress;
      set({ packet: { ...packet, status: "playing", progress } });
    },

    pausePacket: () => {
      const { packet } = get();
      if (packet.status === "playing") set({ packet: { ...packet, status: "paused" } });
    },

    resetPacket: () => set({ packet: { ...IDLE_PACKET, speed: get().packet.speed } }),

    setPacketSpeed: (speed) => {
      if (!(speed > 0)) return;
      set({ packet: { ...get().packet, speed } });
    },

    tickPacket: (elapsedMs) => {
      const { network, result, destinationId, packet } = get();
      if (packet.status !== "playing") return;
      const route = getRoutePath(network, result, destinationId);
      if (!route || route.hops.length === 0) {
        set({ packet: { ...IDLE_PACKET, speed: packet.speed } });
        return;
      }
      const progress = advanceProgress(packet.progress, elapsedMs, route.hops.length, packet.speed);
      set({ packet: { ...packet, progress, status: progress >= 1 ? "finished" : "playing" } });
    },

    startSteps: () => {
      const { result } = get();
      if (result && result.steps.length > 0) set({ stepIndex: -1 });
    },

    nextStep: () => {
      const { result, stepIndex } = get();
      if (!result || result.steps.length === 0) return;
      const next = stepIndex === null ? 0 : stepIndex + 1;
      set({ stepIndex: Math.min(next, result.steps.length - 1) });
    },

    previousStep: () => {
      const { stepIndex } = get();
      if (stepIndex === null) return;
      set({ stepIndex: Math.max(stepIndex - 1, -1) });
    },

    showFinal: () => set({ stepIndex: null }),
    clearError: () => set({ lastError: null }),
  };
});

// Guarda la red en localStorage (con una pausa corta para no escribir en cada
// pixel mientras se arrastra un nodo).
let saveTimer: ReturnType<typeof setTimeout> | undefined;
useNetworkStore.subscribe((state, previous) => {
  if (state.network === previous.network) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNetwork(state.network), 300);
});
