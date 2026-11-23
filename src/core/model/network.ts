export type DeviceKind = "router" | "switch" | "pc" | "server" | "accessPoint";

export const DEVICE_KINDS: readonly DeviceKind[] = [
  "router",
  "switch",
  "pc",
  "server",
  "accessPoint",
];

export type ElementStatus = "up" | "down";

export interface Position {
  x: number;
  y: number;
}

export interface Device {
  id: string;
  kind: DeviceKind;
  label: string;
  position: Position;
  status: ElementStatus;
}

export interface Link {
  id: string;
  source: string;
  target: string;
  cost: number;
  status: ElementStatus;
}

export interface Network {
  name: string;
  devices: Device[];
  links: Link[];
}

export function createEmptyNetwork(name = "Red nueva"): Network {
  return { name, devices: [], links: [] };
}
