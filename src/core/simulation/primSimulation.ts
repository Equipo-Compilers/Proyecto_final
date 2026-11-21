import type {
  PrimInput,
  PrimModelResult,
  PrimStep,
} from "../model/primModel";

import { executePrim } from "../algorithms/prim";

export interface PrimSimulationState {
  result: PrimModelResult;
  currentStepIndex: number;
  currentStep: PrimStep | null;
  isFinished: boolean;
}

export function createPrimSimulation(
  input: PrimInput
): PrimSimulationState {
  const result = executePrim(input);

  return {
    result,
    currentStepIndex: -1,
    currentStep: null,
    isFinished: result.steps.length === 0,
  };
}

export function nextPrimStep(
  state: PrimSimulationState
): PrimSimulationState {
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

export function resetPrimSimulation(
  state: PrimSimulationState
): PrimSimulationState {
  return {
    ...state,
    currentStepIndex: -1,
    currentStep: null,
    isFinished: state.result.steps.length === 0,
  };
}
