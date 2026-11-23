import type { Network } from "../model/network";
import { exportNetworkJson, parseNetworkJson } from "./networkJson";

export const STORAGE_KEY = "simulador-redes:network:v1";

export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function getBrowserStorage(): SimpleStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function saveNetwork(
  network: Network,
  storage: SimpleStorage | null = getBrowserStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, exportNetworkJson(network));
    return true;
  } catch {
    return false;
  }
}

export function loadNetwork(
  storage: SimpleStorage | null = getBrowserStorage()
): Network | null {
  if (!storage) return null;
  try {
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return null;
    const parsed = parseNetworkJson(text);
    return parsed.ok ? parsed.network : null;
  } catch {
    return null;
  }
}

export function clearSavedNetwork(
  storage: SimpleStorage | null = getBrowserStorage()
): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
  }
}
