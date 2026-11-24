import { ComparisonPanel } from "../comparison/ComparisonPanel";
import { DataToolbar } from "../data/DataToolbar";
import { AlgorithmSelector } from "../results/AlgorithmSelector";
import { ResultsPanel } from "../results/ResultsPanel";

export function SidePanel() {
  return (
    <aside className="flex w-full flex-col gap-4">
      <DataToolbar />
      <AlgorithmSelector />
      <ResultsPanel />
      <ComparisonPanel />
    </aside>
  );
}