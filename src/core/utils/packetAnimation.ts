import type { Position } from "../model/network";
import type { RoutePath } from "./routing";

export type PacketStatus = "idle" | "playing" | "paused" | "finished";

export interface PacketState {
  status: PacketStatus;
  progress: number;
  speed: number;
}

export const IDLE_PACKET: PacketState = { status: "idle", progress: 0, speed: 1 };

export const MS_PER_HOP = 1000;
export const SPEED_OPTIONS = [0.5, 1, 2, 4];

export interface PacketPosition {
  x: number;
  y: number;
  hopIndex: number;
  fromId: string;
  toId: string;
  segmentProgress: number;
  reachedDeviceIds: string[];
  traveledLinkIds: string[];
  arrived: boolean;
}

export function getPacketPosition(
  route: RoutePath | null,
  positions: ReadonlyMap<string, Position>,
  progress: number
): PacketPosition | null {
  if (!route || route.hops.length === 0) return null;
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const hops = route.hops.length;
  const arrived = p >= 1;
  const scaled = p * hops;
  const hopIndex = arrived ? hops - 1 : Math.floor(scaled);
  const segmentProgress = arrived ? 1 : scaled - hopIndex;

  const hop = route.hops[hopIndex];
  const a = positions.get(hop.from);
  const b = positions.get(hop.to);
  if (!a || !b) return null;

  const completed = arrived ? hops : hopIndex;
  return {
    x: a.x + (b.x - a.x) * segmentProgress,
    y: a.y + (b.y - a.y) * segmentProgress,
    hopIndex,
    fromId: hop.from,
    toId: hop.to,
    segmentProgress,
    reachedDeviceIds: route.deviceIds.slice(0, completed + 1),
    traveledLinkIds: route.linkIds.slice(0, completed),
    arrived,
  };
}

export function advanceProgress(
  progress: number,
  elapsedMs: number,
  hops: number,
  speed: number
): number {
  if (hops <= 0 || !(speed > 0) || !(elapsedMs > 0)) return progress;
  return Math.min(1, progress + (elapsedMs * speed) / (MS_PER_HOP * hops));
}
