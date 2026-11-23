import { create } from "zustand";

import { runAlgorithm } from "../core/algorithms/registry";
import { loadNetwork, saveNetwork } from "../core/io/storage";
import type { AlgorithmId, AlgorithmResult } from "../core/model/algorithmResult";
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
import { validateNetwork } from "../core/validation/validator";

export interface NetworkState {
  network: Network;
  selectedAlgorithmId: AlgorithmId;
  startNodeId: string | null;
  result: AlgorithmResult | null;
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

  selectAlgorithm: (id: AlgorithmId) => void;
  setStartNode: (id: string | null) => void;
  runSelectedAlgorithm: () => void;
  clearResult: () => void;

  startSteps: () => void;
  nextStep: () => void;
  previousStep: () => void;
  showFinal: () => void;
  clearError: () => void;
}

const RESET_RESULT = { result: null, stepIndex: null } as const;

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
    selectedAlgorithmId: "kruskal",
    startNodeId: null,
    result: null,
    stepIndex: null,
    lastError: null,

    setNetwork: (network) =>
      set({ network, startNodeId: null, ...RESET_RESULT, lastError: null }),

    clearNetwork: () =>
      set({
        network: createEmptyNetwork(),
        startNodeId: null,
        ...RESET_RESULT,
        lastError: null,
      }),

    addDevice: (input) => applyStructural((n) => opAddDevice(n, input)).createdId ?? null,

    removeDevice: (id) => {
      const r = applyStructural((n) => opRemoveDevice(n, id));
      if (r.error === null && get().startNodeId === id) set({ startNodeId: null });
      return r.error;
    },

    moveDevice: (id, position) => applyCosmetic((n) => opMoveDevice(n, id, position)).error,
    renameDevice: (id, label) => applyCosmetic((n) => opRenameDevice(n, id, label)).error,

    addLink: (source, target, cost) =>
      applyStructural((n) => opAddLink(n, source, target, cost)).error,
    removeLink: (id) => applyStructural((n) => opRemoveLink(n, id)).error,
    updateLinkCost: (id, cost) => applyStructural((n) => opUpdateLinkCost(n, id, cost)).error,

    selectAlgorithm: (id) =>
      set({ selectedAlgorithmId: id, ...RESET_RESULT, lastError: null }),

    setStartNode: (id) => set({ startNodeId: id, ...RESET_RESULT, lastError: null }),

    runSelectedAlgorithm: () => {
      const { network, selectedAlgorithmId, startNodeId } = get();
      if (network.devices.length === 0) {
        set({ lastError: "Agrega al menos un switch antes de ejecutar un algoritmo." });
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
        set({ result, stepIndex: null, lastError: null });
      } catch (error) {
        set({
          ...RESET_RESULT,
          lastError: error instanceof Error ? error.message : "Error desconocido al ejecutar",
        });
      }
    },

    clearResult: () => set({ ...RESET_RESULT }),

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

let saveTimer: ReturnType<typeof setTimeout> | undefined;
useNetworkStore.subscribe((state, previous) => {
  if (state.network === previous.network) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNetwork(state.network), 300);
});
