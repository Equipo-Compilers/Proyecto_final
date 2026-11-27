import { useEffect, useMemo, type ChangeEvent } from "react";

import { SPEED_OPTIONS, getPacketPosition } from "../../core/utils/packetAnimation";
import { getRoutePath } from "../../core/utils/routing";
import { useNetworkStore } from "../../store/networkStore";

export function PacketPanel() {
  const network = useNetworkStore((s) => s.network);
  const result = useNetworkStore((s) => s.result);
  const destinationId = useNetworkStore((s) => s.destinationId);
  const packet = useNetworkStore((s) => s.packet);
  const play = useNetworkStore((s) => s.playPacket);
  const pause = useNetworkStore((s) => s.pausePacket);
  const reset = useNetworkStore((s) => s.resetPacket);
  const setSpeed = useNetworkStore((s) => s.setPacketSpeed);
  const tick = useNetworkStore((s) => s.tickPacket);

  const route = useMemo(
    () => getRoutePath(network, result, destinationId),
    [network, result, destinationId]
  );
  const positions = useMemo(
    () => new Map(network.devices.map((d) => [d.id, d.position])),
    [network.devices]
  );
  const labelOf = useMemo(
    () => new Map(network.devices.map((d) => [d.id, d.label])),
    [network.devices]
  );

  const playing = packet.status === "playing";
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      tick(now - last);
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, tick]);

  const canSend = route !== null && route.hops.length > 0;
  const where = getPacketPosition(route, positions, packet.progress);
  const name = (id: string) => labelOf.get(id) ?? id;

  let status = "Elige un destino en «Camino origen → destino» para enviar un paquete.";
  if (route && route.hops.length === 0) status = "El origen es el destino: no hay nada que recorrer.";
  else if (canSend && packet.status === "idle") status = "Listo para enviar.";
  else if (where) {
    status = where.arrived
      ? `Llegó a ${name(where.toId)}.`
      : `Salto ${where.hopIndex + 1} de ${route?.hops.length}: ${name(where.fromId)} → ${name(where.toId)}.`;
  }

  const onSpeed = (e: ChangeEvent<HTMLSelectElement>) => setSpeed(Number(e.target.value));
  const button =
    "rounded-lg px-3 py-2 text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
      <h2 className="mb-3 text-lg font-semibold text-cyan-400">Paquete</h2>

      <div className="flex flex-wrap items-center gap-2">
        {playing ? (
          <button type="button" onClick={pause} className={`${button} bg-amber-500 text-slate-900 hover:bg-amber-400`}>
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={play}
            disabled={!canSend}
            className={`${button} bg-cyan-500 text-slate-900 hover:bg-cyan-400`}
          >
            {packet.status === "paused" ? "Continuar" : packet.status === "finished" ? "Enviar de nuevo" : "Enviar paquete"}
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          disabled={packet.status === "idle"}
          className={`${button} border border-slate-600 text-slate-200 hover:bg-slate-700`}
        >
          Reiniciar
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-300" htmlFor="packet-speed">
          Velocidad
          <select
            id="packet-speed"
            value={packet.speed}
            onChange={onSpeed}
            className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-white focus:border-cyan-400 focus:outline-none"
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(packet.progress * 100)}
      >
        <div className="h-full bg-cyan-400" style={{ width: `${packet.progress * 100}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-400">{status}</p>
    </section>
  );
}
