import { beforeEach, describe, it, expect } from "vitest";

import { createEmptyNetwork } from "../core/model/network";
import { EXAMPLE_NETWORKS, ROUTING_EXAMPLE_NETWORKS } from "../data/examples";
import { useNetworkStore } from "../store/networkStore";

const store = () => useNetworkStore.getState();
const five = EXAMPLE_NETWORKS[0].network;
const disconnected = EXAMPLE_NETWORKS[3].network;

beforeEach(() => {
  useNetworkStore.setState({
    network: createEmptyNetwork(),
    selectedAlgorithmId: "kruskal",
    analysisMode: "layer2",
    startNodeId: null,
    destinationId: null,
    selectedRouterId: null,
    packet: { status: "idle", progress: 0, speed: 1 },
    result: null,
    stepIndex: null,
    lastError: null,
  });
});

describe("red", () => {
  it("empieza vacía", () => {
    expect(store().network.devices).toHaveLength(0);
    expect(store().result).toBeNull();
  });

  it("agrega dispositivos y enlaces", () => {
    expect(store().addDevice()).toBe("S1");
    expect(store().addDevice()).toBe("S2");
    expect(store().addLink("S1", "S2", 5)).toBeNull();
    expect(store().network.links).toHaveLength(1);
  });

  it("un enlace inválido devuelve el error y lo guarda en lastError", () => {
    store().addDevice();
    const error = store().addLink("S1", "S1", 3);
    expect(error === null).toBe(false);
    expect(store().lastError).toBe(error);
    expect(store().network.links).toHaveLength(0);
  });

  it("una operación exitosa limpia el error anterior", () => {
    store().addDevice();
    store().addLink("S1", "S1", 3);
    store().addDevice();
    expect(store().lastError).toBeNull();
  });

  it("quita dispositivos con sus enlaces y cambia costos", () => {
    store().setNetwork(five);
    expect(store().updateLinkCost("e1", 9)).toBeNull();
    expect(store().network.links[0].cost).toBe(9);
    expect(store().removeLink("e7")).toBeNull();
    expect(store().removeDevice("E")).toBeNull();
    expect(store().network.devices).toHaveLength(4);
    expect(store().network.links.some((l) => l.source === "E" || l.target === "E")).toBe(false);
  });

  it("setNetwork y clearNetwork reemplazan la red y borran resultado y paso", () => {
    store().setNetwork(five);
    store().runSelectedAlgorithm();
    store().setNetwork(disconnected);
    expect(store().result).toBeNull();
    expect(store().network.devices).toHaveLength(5);
    store().clearNetwork();
    expect(store().network.devices).toHaveLength(0);
  });
});

describe("el resultado se invalida solo cuando cambia la estructura", () => {
  beforeEach(() => {
    store().setNetwork(five);
    store().runSelectedAlgorithm();
  });

  it("tras ejecutar hay resultado", () => {
    expect(store().result?.totalCost).toBe(13);
    expect(store().stepIndex).toBeNull();
  });

  it("mover o renombrar conserva el resultado", () => {
    store().moveDevice("A", { x: 1, y: 1 });
    store().renameDevice("A", "Núcleo");
    expect(store().result).not.toBeNull();
    expect(store().network.devices[0].label).toBe("Núcleo");
  });

  it("agregar, quitar o cambiar costos borra el resultado", () => {
    store().updateLinkCost("e1", 2);
    expect(store().result).toBeNull();

    store().runSelectedAlgorithm();
    expect(store().result).not.toBeNull();
    store().addDevice();
    expect(store().result).toBeNull();

    store().runSelectedAlgorithm();
    store().removeLink("e1");
    expect(store().result).toBeNull();
  });

  it("una operación que falla NO borra el resultado", () => {
    store().addLink("A", "A", 3);
    expect(store().result).not.toBeNull();
  });

  it("cambiar de algoritmo borra el resultado", () => {
    store().selectAlgorithm("prim");
    expect(store().result).toBeNull();
    expect(store().selectedAlgorithmId).toBe("prim");
  });
});

describe("ejecutar", () => {
  it("avisa si la red está vacía", () => {
    store().runSelectedAlgorithm();
    expect(store().result).toBeNull();
    expect(store().lastError === null).toBe(false);
  });

  it("ejecuta Kruskal y Prim", () => {
    store().setNetwork(five);
    store().runSelectedAlgorithm();
    expect(store().result?.algorithmId).toBe("kruskal");

    store().selectAlgorithm("prim");
    store().runSelectedAlgorithm();
    expect(store().result?.algorithmId).toBe("prim");
    expect(store().result?.totalCost).toBe(13);
  });

  it("Prim usa el switch inicial elegido", () => {
    store().setNetwork(disconnected);
    store().selectAlgorithm("prim");
    store().setStartNode("S4");
    store().runSelectedAlgorithm();
    expect(store().result?.startNodeId).toBe("S4");
    expect(store().result?.totalCost).toBe(3);
  });

  it("quitar el switch inicial vuelve a «automático»", () => {
    store().setNetwork(five);
    store().setStartNode("C");
    store().removeDevice("C");
    expect(store().startNodeId).toBeNull();
  });

  it("una red inválida no se ejecuta y avisa el motivo", () => {
    store().setNetwork({
      name: "mala",
      devices: five.devices,
      links: [...five.links, { id: "e8", source: "A", target: "B", cost: 1, status: "up" }],
    });
    store().runSelectedAlgorithm();
    expect(store().result).toBeNull();
    expect(store().lastError === null).toBe(false);
  });

  it("clearError y clearResult", () => {
    store().setNetwork(five);
    store().runSelectedAlgorithm();
    store().clearResult();
    expect(store().result).toBeNull();
    useNetworkStore.setState({ lastError: "x" });
    store().clearError();
    expect(store().lastError).toBeNull();
  });
});

describe("paso a paso", () => {
  beforeEach(() => {
    store().setNetwork(five);
    store().runSelectedAlgorithm(); // Kruskal: 7 pasos
  });

  it("sin resultado no hace nada", () => {
    store().clearResult();
    store().startSteps();
    store().nextStep();
    expect(store().stepIndex).toBeNull();
  });

  it("startSteps deja el recorrido antes del primer paso", () => {
    store().startSteps();
    expect(store().stepIndex).toBe(-1);
  });

  it("nextStep desde la vista final empieza en el primer paso", () => {
    store().nextStep();
    expect(store().stepIndex).toBe(0);
  });

  it("avanza y se detiene en el último paso", () => {
    for (let i = 0; i < 20; i++) store().nextStep();
    expect(store().stepIndex).toBe(6);
  });

  it("retrocede y no baja de -1", () => {
    store().nextStep();
    store().nextStep();
    store().previousStep();
    expect(store().stepIndex).toBe(0);
    store().previousStep();
    store().previousStep();
    store().previousStep();
    expect(store().stepIndex).toBe(-1);
  });

  it("retroceder desde la vista final no hace nada", () => {
    store().previousStep();
    expect(store().stepIndex).toBeNull();
  });

  it("showFinal vuelve a la vista final", () => {
    store().nextStep();
    store().showFinal();
    expect(store().stepIndex).toBeNull();
  });

  it("ejecutar de nuevo reinicia el paso", () => {
    store().nextStep();
    store().runSelectedAlgorithm();
    expect(store().stepIndex).toBeNull();
  });
});

describe("modo de análisis (capa 2 / capa 3)", () => {
  it("empieza en capa 2", () => {
    expect(store().analysisMode).toBe("layer2");
  });

  it("cambiar a capa 3 selecciona Dijkstra y borra el resultado", () => {
    store().setNetwork(five);
    store().runSelectedAlgorithm();
    expect(store().result === null).toBe(false);
    store().setAnalysisMode("layer3");
    expect(store().analysisMode).toBe("layer3");
    expect(store().selectedAlgorithmId).toBe("dijkstra");
    expect(store().result).toBeNull();
    expect(store().startNodeId).toBeNull();
  });

  it("volver a capa 2 selecciona el primer algoritmo de capa 2", () => {
    store().setAnalysisMode("layer3");
    store().setAnalysisMode("layer2");
    expect(store().selectedAlgorithmId).toBe("prim");
  });

  it("seleccionar un algoritmo también fija su modo", () => {
    store().selectAlgorithm("dijkstra");
    expect(store().analysisMode).toBe("layer3");
    store().selectAlgorithm("kruskal");
    expect(store().analysisMode).toBe("layer2");
  });

  it("capa 3 sin routers da un error claro", () => {
    store().setNetwork(five); // solo switches
    store().setAnalysisMode("layer3");
    store().runSelectedAlgorithm();
    expect(store().result).toBeNull();
    expect(store().lastError).toContain("solo participan los routers");
  });

  it("ejecuta Dijkstra sobre una red de routers", () => {
    store().setNetwork(ROUTING_EXAMPLE_NETWORKS[0].network);
    store().setAnalysisMode("layer3");
    store().setStartNode("R1");
    store().runSelectedAlgorithm();
    expect(store().lastError).toBeNull();
    expect(store().result?.routing?.distances["R4"]).toBe(20);
  });

  it("red vacía en capa 2 da el mensaje genérico", () => {
    store().runSelectedAlgorithm();
    expect(store().lastError).toContain("Agrega al menos un dispositivo");
  });
});

describe("capa 3: Bellman-Ford, destino y router seleccionado", () => {
  const rutas = ROUTING_EXAMPLE_NETWORKS[0].network;

  it("Bellman-Ford se puede elegir y ejecutar", () => {
    store().setNetwork(rutas);
    store().selectAlgorithm("bellmanFord");
    expect(store().analysisMode).toBe("layer3");
    store().setStartNode("R1");
    store().runSelectedAlgorithm();
    expect(store().lastError).toBeNull();
    expect(store().result?.algorithmId).toBe("bellmanFord");
    expect(store().result?.routing?.distances["R5"]).toBe(20);
  });

  it("el destino y el router seleccionado se guardan", () => {
    store().setDestination("R5");
    store().selectRouter("R2");
    expect(store().destinationId).toBe("R5");
    expect(store().selectedRouterId).toBe("R2");
  });

  it("elegir destino no borra el resultado", () => {
    store().setNetwork(rutas);
    store().setStartNode("R1");
    store().selectAlgorithm("dijkstra");
    store().runSelectedAlgorithm();
    store().setDestination("R4");
    expect(store().result === null).toBe(false);
  });

  it("cambiar de algoritmo conserva el destino", () => {
    store().setDestination("R4");
    store().selectAlgorithm("bellmanFord");
    expect(store().destinationId).toBe("R4");
  });

  it("cargar otra red, vaciarla o quitar el router borra destino y selección", () => {
    store().setNetwork(rutas);
    store().setDestination("R5");
    store().selectRouter("R5");
    store().removeDevice("R5");
    expect(store().destinationId).toBeNull();
    expect(store().selectedRouterId).toBeNull();

    store().setDestination("R2");
    store().selectRouter("R2");
    store().setNetwork(rutas);
    expect(store().destinationId).toBeNull();
    expect(store().selectedRouterId).toBeNull();

    store().setDestination("R2");
    store().selectRouter("R2");
    store().clearNetwork();
    expect(store().destinationId).toBeNull();
    expect(store().selectedRouterId).toBeNull();
  });

  it("cambiar de modo borra el destino", () => {
    store().setDestination("R2");
    store().setAnalysisMode("layer3");
    expect(store().destinationId).toBeNull();
  });
});

describe("animación del paquete (F2-8)", () => {
  const rutas = ROUTING_EXAMPLE_NETWORKS[0].network;
  const preparar = (destino: string | null) => {
    store().setNetwork(rutas);
    store().selectAlgorithm("dijkstra");
    store().setStartNode("R1");
    store().runSelectedAlgorithm();
    store().setDestination(destino);
  };

  it("empieza quieto", () => {
    expect(store().packet).toEqual({ status: "idle", progress: 0, speed: 1 });
  });

  it("sin destino o sin resultado no se puede enviar", () => {
    preparar(null);
    store().playPacket();
    expect(store().packet.status).toBe("idle");
    store().clearResult();
    store().setDestination("R5");
    store().playPacket();
    expect(store().packet.status).toBe("idle");
  });

  it("si el destino es el origen no hay nada que recorrer", () => {
    preparar("R1");
    store().playPacket();
    expect(store().packet.status).toBe("idle");
  });

  it("avanza con tickPacket y llega al destino", () => {
    preparar("R5"); // 3 saltos = 3 s a velocidad 1
    store().playPacket();
    expect(store().packet.status).toBe("playing");
    store().tickPacket(1500);
    expect(Math.abs(store().packet.progress - 0.5) < 1e-9).toBe(true);
    store().tickPacket(5000);
    expect(store().packet.progress).toBe(1);
    expect(store().packet.status).toBe("finished");
  });

  it("pausa, continúa y respeta la velocidad", () => {
    preparar("R5");
    store().setPacketSpeed(2);
    store().playPacket();
    store().tickPacket(750);
    expect(Math.abs(store().packet.progress - 0.5) < 1e-9).toBe(true);
    store().pausePacket();
    expect(store().packet.status).toBe("paused");
    store().tickPacket(5000); // en pausa no avanza
    expect(Math.abs(store().packet.progress - 0.5) < 1e-9).toBe(true);
    store().playPacket();
    expect(store().packet.status).toBe("playing");
    expect(Math.abs(store().packet.progress - 0.5) < 1e-9).toBe(true);
  });

  it("tras llegar, enviar de nuevo empieza desde el origen", () => {
    preparar("R5");
    store().playPacket();
    store().tickPacket(99999);
    store().playPacket();
    expect(store().packet.status).toBe("playing");
    expect(store().packet.progress).toBe(0);
  });

  it("reiniciar vuelve al origen pero conserva la velocidad", () => {
    preparar("R5");
    store().setPacketSpeed(4);
    store().playPacket();
    store().tickPacket(300);
    store().resetPacket();
    expect(store().packet).toEqual({ status: "idle", progress: 0, speed: 4 });
  });

  it("ignora velocidades inválidas", () => {
    store().setPacketSpeed(0);
    store().setPacketSpeed(-2);
    store().setPacketSpeed(Number.NaN);
    expect(store().packet.speed).toBe(1);
  });

  it("cambiar de destino, ejecutar de nuevo o cambiar la red reinicia el paquete", () => {
    preparar("R5");
    store().playPacket();
    store().tickPacket(500);
    store().setDestination("R4");
    expect(store().packet.status).toBe("idle");

    store().playPacket();
    store().tickPacket(500);
    store().runSelectedAlgorithm();
    expect(store().packet.status).toBe("idle");

    store().playPacket();
    store().addDevice();
    expect(store().packet.status).toBe("idle");
  });

  it("tickPacket sin estar en marcha no hace nada", () => {
    preparar("R5");
    store().tickPacket(1000);
    expect(store().packet.progress).toBe(0);
  });
});
