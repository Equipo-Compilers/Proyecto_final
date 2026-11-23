import { beforeEach, describe, it, expect } from "vitest";

import { createEmptyNetwork } from "../core/model/network";
import { EXAMPLE_NETWORKS } from "../data/examples";
import { useNetworkStore } from "../store/networkStore";

const store = () => useNetworkStore.getState();
const five = EXAMPLE_NETWORKS[0].network;
const disconnected = EXAMPLE_NETWORKS[3].network;

beforeEach(() => {
  useNetworkStore.setState({
    network: createEmptyNetwork(),
    selectedAlgorithmId: "kruskal",
    startNodeId: null,
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
