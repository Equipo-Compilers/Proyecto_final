import type { DeviceKind, Network, Position } from "./network";

export interface OpResult {
  network: Network;
  error: string | null;
  createdId?: string;
}

export interface AddDeviceInput {
  label?: string;
  kind?: DeviceKind;
  position?: Position;
}

const ID_PREFIX: Record<DeviceKind, string> = {
  switch: "S",
  router: "R",
  pc: "PC",
  server: "SRV",
  accessPoint: "AP",
};

function ok(network: Network, createdId?: string): OpResult {
  return createdId === undefined
    ? { network, error: null }
    : { network, error: null, createdId };
}

function fail(network: Network, error: string): OpResult {
  return { network, error };
}

function isValidPosition(p: Position): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y);
}

export function nextId(prefix: string, usedIds: Iterable<string>): string {
  const used = new Set(usedIds);
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function validateCost(cost: number): string | null {
  if (!Number.isFinite(cost) || cost <= 0) {
    return "El costo debe ser un número mayor que 0";
  }
  return null;
}

export function addDevice(
  network: Network,
  input: AddDeviceInput = {}
): OpResult {
  const kind = input.kind ?? "switch";
  const id = nextId(
    ID_PREFIX[kind],
    network.devices.map((d) => d.id)
  );
  const count = network.devices.length;
  const position = input.position ?? {
    x: 100 + (count % 5) * 150,
    y: 100 + Math.floor(count / 5) * 150,
  };
  if (!isValidPosition(position)) {
    return fail(network, "La posición no es válida");
  }
  const label = input.label?.trim() ? input.label.trim() : id;

  return ok(
    {
      ...network,
      devices: [
        ...network.devices,
        { id, kind, label, position, status: "up" },
      ],
    },
    id
  );
}

export function removeDevice(network: Network, id: string): OpResult {
  if (!network.devices.some((d) => d.id === id)) {
    return fail(network, `No existe el dispositivo ${id}`);
  }
  return ok({
    ...network,
    devices: network.devices.filter((d) => d.id !== id),
    links: network.links.filter((l) => l.source !== id && l.target !== id),
  });
}

export function moveDevice(
  network: Network,
  id: string,
  position: Position
): OpResult {
  if (!network.devices.some((d) => d.id === id)) {
    return fail(network, `No existe el dispositivo ${id}`);
  }
  if (!isValidPosition(position)) {
    return fail(network, "La posición no es válida");
  }
  return ok({
    ...network,
    devices: network.devices.map((d) =>
      d.id === id ? { ...d, position } : d
    ),
  });
}

export function renameDevice(
  network: Network,
  id: string,
  label: string
): OpResult {
  if (!network.devices.some((d) => d.id === id)) {
    return fail(network, `No existe el dispositivo ${id}`);
  }
  const clean = label.trim();
  if (clean === "") {
    return fail(network, "El nombre no puede estar vacío");
  }
  return ok({
    ...network,
    devices: network.devices.map((d) =>
      d.id === id ? { ...d, label: clean } : d
    ),
  });
}

export function addLink(
  network: Network,
  source: string,
  target: string,
  cost: number
): OpResult {
  if (source === target) {
    return fail(network, "Un enlace no puede conectar un dispositivo consigo mismo");
  }
  const ids = new Set(network.devices.map((d) => d.id));
  if (!ids.has(source) || !ids.has(target)) {
    return fail(network, "Los dos extremos del enlace deben existir");
  }
  const costError = validateCost(cost);
  if (costError) return fail(network, costError);

  const duplicated = network.links.some(
    (l) =>
      (l.source === source && l.target === target) ||
      (l.source === target && l.target === source)
  );
  if (duplicated) {
    return fail(network, "Ya existe un enlace entre esos dos dispositivos");
  }

  const id = nextId(
    "e",
    network.links.map((l) => l.id)
  );
  return ok(
    {
      ...network,
      links: [...network.links, { id, source, target, cost, status: "up" }],
    },
    id
  );
}

export function removeLink(network: Network, id: string): OpResult {
  if (!network.links.some((l) => l.id === id)) {
    return fail(network, `No existe el enlace ${id}`);
  }
  return ok({ ...network, links: network.links.filter((l) => l.id !== id) });
}

export function updateLinkCost(
  network: Network,
  id: string,
  cost: number
): OpResult {
  if (!network.links.some((l) => l.id === id)) {
    return fail(network, `No existe el enlace ${id}`);
  }
  const costError = validateCost(cost);
  if (costError) return fail(network, costError);
  return ok({
    ...network,
    links: network.links.map((l) => (l.id === id ? { ...l, cost } : l)),
  });
}
