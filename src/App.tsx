import "@xyflow/react/dist/style.css";

import { NetworkEditor } from "./ui/editor/NetworkEditor";
import { SidePanel } from "./ui/panels/SidePanel";

function App() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-white">
      <header className="w-full border-b border-slate-800/90 bg-slate-900/75 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-cyan-400 sm:text-3xl">
            Simulador de redes
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            Prevención de bucles en Capa 2 mediante árboles de expansión mínima (Prim y Kruskal)
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:items-start lg:gap-5 lg:p-5">
        <div className="min-w-0 flex-1">
          <NetworkEditor />
        </div>

        <div className="w-full shrink-0 lg:w-[390px] xl:w-[420px]">
          <SidePanel />
        </div>
      </main>
    </div>
  );
}

export default App;