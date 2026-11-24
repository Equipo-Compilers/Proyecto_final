import type { AlgorithmResult } from "./algorithmResult";
import type { Network } from "./network";

export type LinkVisualState = "neutral" | "selected" | "discarded";

export function getLinkStates(
  network: Network,
  result: AlgorithmResult | null,
  stepIndex: number | null
): Map<string, LinkVisualState> {
  const states = new Map<string, LinkVisualState>();
  for (const link of network.links) states.set(link.id, "neutral");
  if (!result) return states;

  if (stepIndex === null || result.steps.length === 0) {
    const selected = new Set(result.selectedLinkIds);
    for (const id of states.keys()) {
      states.set(id, selected.has(id) ? "selected" : "discarded");
    }
    return states;
  }

  const last = Math.min(stepIndex, result.steps.length - 1);
  for (let i = 0; i <= last; i++) {
    const step = result.steps[i];
    if (states.has(step.linkId)) {
      states.set(step.linkId, step.decision === "accepted" ? "selected" : "discarded");
    }
  }
  return states;
}
