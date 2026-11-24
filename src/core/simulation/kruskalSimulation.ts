import type {
  KruskalInput,
  KruskalModelResult,
  KruskalStep,
} from "../model/kruskalModel";

import { executeKruskal } from "../algorithms/kruskal";

export interface KruskalSimulationState {
  result: KruskalModelResult;
  currentStepIndex: number;
  currentStep: KruskalStep | null;
  isFinished: boolean;
}

export function createKruskalSimulation(
  input: KruskalInput
): KruskalSimulationState {
  const result = executeKruskal(input);

  return {
    result,
    currentStepIndex: -1,
    currentStep: null,
    isFinished: result.steps.length === 0,
  };
}

export function nextKruskalStep(
  state: KruskalSimulationState
): KruskalSimulationState {
  const nextIndex = state.currentStepIndex + 1;

  if (nextIndex >= state.result.steps.length) {
    return {
      ...state,
      isFinished: true,
    };
  }

  return {
    ...state,
    currentStepIndex: nextIndex,
    currentStep: state.result.steps[nextIndex],
    isFinished: nextIndex === state.result.steps.length - 1,
  };
}

export function previousKruskalStep(
  state: KruskalSimulationState
): KruskalSimulationState {
  const previousIndex = state.currentStepIndex - 1;

  if (previousIndex < 0) {
    return resetKruskalSimulation(state);
  }

  return {
    ...state,
    currentStepIndex: previousIndex,
    currentStep: state.result.steps[previousIndex],
    isFinished: false,
  };
}

export function resetKruskalSimulation(
  state: KruskalSimulationState
): KruskalSimulationState {
  return {
    ...state,
    currentStepIndex: -1,
    currentStep: null,
    isFinished: state.result.steps.length === 0,
  };
}