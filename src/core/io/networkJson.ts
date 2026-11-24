import {
  DEVICE_KINDS,
  type Device,
  type DeviceKind,
  type ElementStatus,
  type Link,
  type Network,
} from "../model/network";
import { validateNetwork } from "../validation/validator";

export type ParseResult =
  | { ok: true; network: Network }
  | { ok: false; errors: string[] };

export const MAX_DEVICES = 2000;
export const MAX_LINKS = 20000;
const MAX_ERRORS_SHOWN = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is ElementStatus {
  return value === "up" || value === "down";
}

function isKind(value: unknown): value is DeviceKind {
  return DEVICE_KINDS.includes(value as DeviceKind);
}

function fail(errors: string[]): ParseResult {
  return { ok: false, errors: errors.slice(0, MAX_ERRORS_SHOWN) };
}

export function parseNetworkObject(value: unknown): ParseResult {
  if (!isRecord(value)) {
    return fail(["El archivo debe contener un objeto JSON con «devices» y «links»"]);
  }
  if (!Array.isArray(value.devices)) {
    return fail(["Falta la lista «devices» (dispositivos)"]);
  }
  if (!Array.isArray(value.links)) {
    return fail(["Falta la lista «links» (enlaces)"]);
  }
  if (value.devices.length > MAX_DEVICES) {
    return fail([`Demasiados dispositivos (máximo ${MAX_DEVICES})`]);
  }
  if (value.links.length > MAX_LINKS) {
    return fail([`Demasiados enlaces (máximo ${MAX_LINKS})`]);
  }

  const errors: string[] = [];
  const devices: Device[] = [];
  const links: Link[] = [];

  value.devices.forEach((raw: unknown, i: number) => {
    const where = `devices[${i}]`;
    if (!isRecord(raw)) {
      errors.push(`${where} no es un objeto`);
      return;
    }
    if (typeof raw.id !== "string" || raw.id.trim() === "") {
      errors.push(`${where}: falta «id» (texto)`);
      return;
    }
    if (raw.kind !== undefined && !isKind(raw.kind)) {
      errors.push(`${where}: «kind» no es válido (${String(raw.kind)})`);
      return;
    }
    if (raw.status !== undefined && !isStatus(raw.status)) {
      errors.push(`${where}: «status» debe ser "up" o "down"`);
      return;
    }

    let position = { x: 100 + (i % 5) * 150, y: 100 + Math.floor(i / 5) * 150 };
    if (raw.position !== undefined) {
      const p = raw.position;
      if (
        !isRecord(p) ||
        typeof p.x !== "number" ||
        typeof p.y !== "number" ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y)
      ) {
        errors.push(`${where}: «position» debe tener x e y numéricos`);
        return;
      }
      position = { x: p.x, y: p.y };
    }

    devices.push({
      id: raw.id,
      kind: raw.kind ?? "switch",
      label: typeof raw.label === "string" && raw.label.trim() !== "" ? raw.label : raw.id,
      position,
      status: raw.status ?? "up",
    });
  });

  value.links.forEach((raw: unknown, i: number) => {
    const where = `links[${i}]`;
    if (!isRecord(raw)) {
      errors.push(`${where} no es un objeto`);
      return;
    }
    if (typeof raw.id !== "string" || raw.id.trim() === "") {
      errors.push(`${where}: falta «id» (texto)`);
      return;
    }
    if (typeof raw.source !== "string" || typeof raw.target !== "string") {
      errors.push(`${where}: faltan «source» y «target» (texto)`);
      return;
    }
    if (typeof raw.cost !== "number") {
      errors.push(`${where}: «cost» debe ser un número`);
      return;
    }
    if (raw.status !== undefined && !isStatus(raw.status)) {
      errors.push(`${where}: «status» debe ser "up" o "down"`);
      return;
    }
    links.push({
      id: raw.id,
      source: raw.source,
      target: raw.target,
      cost: raw.cost,
      status: raw.status ?? "up",
    });
  });

  if (errors.length > 0) return fail(errors);

  const network: Network = {
    name:
      typeof value.name === "string" && value.name.trim() !== ""
        ? value.name.trim()
        : "Red importada",
    devices,
    links,
  };

  const structural = validateNetwork(network);
  if (structural.length > 0) return fail(structural);

  return { ok: true, network };
}

export function parseNetworkJson(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return fail(["El archivo no es un JSON válido"]);
  }
  return parseNetworkObject(value);
}

export function exportNetworkJson(network: Network): string {
  return JSON.stringify(
    { name: network.name, devices: network.devices, links: network.links },
    null,
    2
  );
}
