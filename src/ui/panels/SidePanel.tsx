import { useNetworkStore } from "../../store/networkStore";
import { ComparisonPanel } from "../comparison/ComparisonPanel";
import { RoutingComparisonPanel } from "../comparison/RoutingComparisonPanel";
import { DataToolbar } from "../data/DataToolbar";
import { AlgorithmSelector } from "../results/AlgorithmSelector";
import { ModeSelector } from "../results/ModeSelector";
import { ResultsPanel } from "../results/ResultsPanel";
import { RoutePanel } from "../results/RoutePanel";
import { PacketPanel } from "../results/PacketPanel";
import { RoutingTablePanel } from "../results/RoutingTablePanel";

export function SidePanel() {
  const mode = useNetworkStore((s) => s.analysisMode);

  return (
    <aside className="flex w-full min-w-0 flex-col gap-4">
      <ModeSelector />
      <DataToolbar />
      <AlgorithmSelector />
      <ResultsPanel />
      {mode === "layer3" && <RoutePanel />}
      {mode === "layer3" && <PacketPanel />}
      {mode === "layer3" && <RoutingTablePanel />}
      {mode === "layer2" ? <ComparisonPanel /> : <RoutingComparisonPanel />}
    </aside>
  );
}
