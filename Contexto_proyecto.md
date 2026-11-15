# CONTEXTO DEL PROYECTO — Simulador de redes (capa 2 y capa 3)

## 0. Instrucciones para la IA (léelas primero)

- Responde en **español**.
- Eres un asistente de un equipo de 4 estudiantes. Este documento es la fuente de verdad: **no contradigas las decisiones de la sección 4 ni los nombres de la sección 6** sin avisar explícitamente y justificar el cambio.
- Si falta información, pregunta una sola cosa concreta antes de suponer.
- Prefiere soluciones simples y legibles; es un proyecto académico, no producción.
- Respeta la separación **núcleo (lógica) / interfaz (React)** de la sección 5.
- No afirmes que Prim/Kruskal sustituyen a STP, ni que Dijkstra/Bellman-Ford son OSPF/RIP. Son su **base matemática** (sección 2).
- Los datos de marcas (Cisco, TP-Link) **deben verificarse en hojas de datos o manuales**. Si no estás seguro de un dato de un modelo concreto, dilo; no lo inventes.
- Cuando entregues código: TypeScript estricto, nombres en inglés para el código (según sección 6), comentarios y explicaciones en español, y di en qué archivo y carpeta va.

---

## 1. Resumen del proyecto

Aplicación web, interactiva y académica, que simula redes representadas como **grafos ponderados** (nodos = dispositivos, aristas = enlaces con costo). Corre **100 % en el navegador**, sin backend ni base de datos.

Tiene **dos modos de análisis** sobre el mismo editor y el mismo modelo de datos:

| Modo | Capa | Dispositivos | Algoritmos | Qué muestra |
|---|---|---|---|---|
| A. Prevención de bucles | Capa 2 | Switches | **Prim** y **Kruskal** (árbol de expansión mínima) y, en fase posterior, **STP simulado** | Enlaces seleccionados/descartados, costo total, tiempo de ejecución |
| B. Enrutamiento | Capa 3 | Routers | **Dijkstra** (estilo OSPF) y **Bellman-Ford** (estilo RIP) | Tablas de enrutamiento, animación de un paquete, recálculo ante fallas |

**Objetivo general (versión final del equipo):** Desarrollar un simulador web interactivo para la representación de topologías de redes Ethernet redundantes, utilizando los algoritmos de Prim y Kruskal para la eliminación de bucles de Capa 2 y la generación de árboles de expansión mínima, con el fin de analizar comparativamente su costo total, conectividad y tiempo de ejecución.

**Objetivos particulares:**
1. Analizar el comportamiento matemático de Prim y Kruskal aplicados a grafos y las características de las redes Ethernet redundantes.
2. Diseñar la interfaz gráfica del simulador y las estructuras de datos (switches como nodos, enlaces como aristas con costo).
3. Implementar Prim y Kruskal para procesar las topologías del usuario y visualizar la eliminación de ciclos.
4. Evaluar el rendimiento de ambos algoritmos en distintos escenarios (costo total, conectividad, tiempo de ejecución).

> Nota: el modo B (capa 3) y las funciones de las secciones 8–10 son **ampliaciones** del objetivo base. El MVP cumple primero los 4 objetivos.

---

## 2. Aclaraciones académicas obligatorias

1. **STP ≠ Prim/Kruskal.** STP es un protocolo de capa 2. Prim y Kruskal son algoritmos de grafos. La app es un *simulador académico* que usa algoritmos de grafos en el contexto del problema de bucles; no reemplaza a STP.
2. **STP no minimiza el costo total.** STP elige un puente raíz (por prioridad + MAC) y deja a cada switch su camino de menor costo hacia esa raíz. Prim/Kruskal minimizan el costo **total** del árbol. Mostrar esta diferencia es el aporte principal de la comparación "frente a protocolos tradicionales".
3. **Dijkstra/Bellman-Ford ≈ OSPF/RIP** solo a nivel de fundamento matemático (OSPF: estado de enlace → Dijkstra; RIP: vector de distancia → Bellman-Ford).
4. Los equipos finales (PCs, servidores) **no participan** en Prim/Kruskal/STP; solo los switches.

---

## 3. Alcance por fases

| Fase | Contenido |
|---|---|
| **MVP (fase 1)** | Editor de topologías (≥5 switches), costos en enlaces, redes con ciclos, Prim y Kruskal, enlaces seleccionados/descartados, costo total, tiempo de ejecución, validación (conectado + sin ciclos), modo paso a paso, comparación |
| **Fase 2** | Capa 3: Dijkstra, Bellman-Ford, tablas de enrutamiento, animación de paquete |
| **Fase 3** | Simulación de fallas (enlace/nodo), reconvergencia, historial de eventos |
| **Fase 4** | STP simulado (puente raíz, puertos raíz/designados/bloqueados) para la comparación real |
| **Fase 5** | Formulario generador de redes (cantidades, patrón, redundancia) y plantillas |
| **Fase 6** | Perfiles de fabricante (Cisco, TP-Link), configuración generada y mini-terminal |

No empezar una fase sin que la anterior tenga pruebas pasando.

---

## 4. Decisiones técnicas ya tomadas

- **Empaquetador:** Vite (plantilla `react-ts`).
- **Lenguaje:** **TypeScript** en modo estricto. No usar JavaScript.
- **UI:** React + CSS (Tailwind opcional, decisión pendiente del equipo).
- **Grafo visual:** React Flow (paquete `@xyflow/react`). Alternativa solo si hay problemas de rendimiento con cientos de nodos: Cytoscape.js.
- **Estado global:** Zustand.
- **Acomodo automático de nodos:** dagre o elkjs.
- **Pruebas:** Vitest (obligatorio para los algoritmos).
- **Gráficas de comparación:** Recharts.
- **Validación de JSON importado:** zod.
- **Aleatoriedad reproducible:** generador con semilla (nunca `Math.random()` directo en el generador de redes).
- **Persistencia:** exportar/importar JSON + `localStorage`. Sin backend.
- **Medición de tiempo:** `performance.now()`, repetir cada medición varias veces y promediar; usar grafos grandes (cientos/miles de aristas), porque en 5 nodos todo da ~0 ms.

---

## 5. Arquitectura (regla de oro)

Separar **lógica** de **interfaz**:

```
src/
  core/          ← TypeScript puro, SIN React. Se prueba sola.
    model/       ← tipos y modelo de red
    algorithms/  ← prim, kruskal, dijkstra, bellmanFord, (stp)
    simulation/  ← motor de fallas, reloj simulado
    generator/   ← generador de topologías con semilla
    vendors/     ← perfiles de fabricante y generador de configuración
    validation/  ← conectividad, ausencia de ciclos, V-1 aristas
  store/         ← estado global (Zustand)
  ui/            ← componentes React (editor, paneles, resultados)
  tests/         ← pruebas Vitest
```

**Reglas:**
1. Todo algoritmo devuelve **resultado final + lista de pasos** (cada paso: arista/nodo evaluado, acción = aceptado | descartado | visitado, motivo, estado acumulado). La UI reproduce esos pasos para el modo paso a paso y las animaciones.
2. Los algoritmos **no leen el estado de React** ni dibujan nada.
3. Las fallas se aplican construyendo un **grafo efectivo** (sin enlaces/nodos caídos) y volviendo a ejecutar el algoritmo.
4. Kruskal usa Union-Find; Prim y Dijkstra usan cola de prioridad propia.

---

## 6. Modelo de datos y vocabulario común (usar estos nombres)

**Device (dispositivo)**

| Campo | Significado |
|---|---|
| `id` | identificador único |
| `kind` | `router` \| `switch` \| `pc` \| `server` \| `accessPoint` |
| `label` | nombre visible |
| `position` | x, y en el lienzo |
| `vendor` / `model` | (fase 6) marca y modelo, opcional |
| `stpPriority` | (fase 4) prioridad de puente, por defecto 32768 |
| `status` | `up` \| `down` |

**Link (enlace)**

| Campo | Significado |
|---|---|
| `id` | identificador único |
| `source` / `target` | ids de dispositivos |
| `cost` | costo/peso usado por los algoritmos |
| `speedMbps` | velocidad (opcional; de aquí puede derivarse el costo) |
| `status` | `up` \| `down` |

**AlgorithmStep (paso):** `type`, `edgeId` o `nodeId`, `action`, `reason`, `snapshot`.
**AlgorithmResult (resultado):** `selectedLinks`, `discardedLinks`, `totalCost`, `executionTimeMs`, `steps`, `isConnected`, `hasCycles`.

**Glosario:** *MST* = árbol de expansión mínima · *topología* = nodos + enlaces · *grafo efectivo* = grafo sin elementos caídos · *convergencia* = momento en que la red/ rutas se estabilizan tras un cambio · *paso a paso* = reproducción de la lista de pasos.

---

## 7. Funcionalidades del MVP (checklist)

- [ ] Agregar/eliminar/mover switches
- [ ] Crear/eliminar enlaces; editar costo
- [ ] Redes con enlaces redundantes (ciclos)
- [ ] Ejecutar Prim y Kruskal sobre la misma topología
- [ ] Distinguir enlaces seleccionados vs descartados
- [ ] Costo total, número de enlaces, tiempo de ejecución
- [ ] Modo paso a paso
- [ ] Validación automática: todos conectados, V-1 aristas, sin ciclos
- [ ] Sección de comparación Prim vs Kruskal
- [ ] Exportar/importar JSON
- [ ] Pruebas Vitest con redes pequeñas, medianas y grandes

---

## 8. Simulación de caída de red (fase 3)

- Cada enlace y dispositivo puede estar `up` o `down`. El usuario hace clic para derribarlo.
- Se recalcula sobre el **grafo efectivo** y se resaltan los cambios (tablas de enrutamiento antes/después, enlaces reactivados).
- **Capa 3:** si el destino queda aislado, mostrar "inalcanzable". Para enseñar convergencia, simular Bellman-Ford **por rondas** (intercambio con vecinos hasta que nadie cambia). Opcional: "cuenta hasta infinito" de RIP.
- **Capa 2:** si cae un enlace del árbol activo, se reactiva un enlace descartado. Con un **reloj simulado** comparar STP clásico (~30–50 s de reconvergencia por temporizadores) con RSTP (mucho menor).
- Extras: botón de falla aleatoria (con semilla), historial de eventos reproducible, botón restaurar.

---

## 9. Formulario generador de red (fase 5)

**Entradas:** cantidad de routers, switches, PCs, servidores y APs · patrón (estrella, árbol, anillo, malla parcial, campus con núcleo redundante) · nivel de redundancia · velocidades de enlace · marca/modelo por grupo (fase 6) · semilla.

**Reglas del generador:**
- Las PCs cuelgan de switches de acceso con máximo de puertos (p. ej. 24).
- Cada switch de acceso sube con **2 enlaces** al núcleo (genera ciclos a propósito).
- Los routers se conectan al núcleo y entre sí.
- La red resultante **siempre es conexa**.
- Después se acomoda con dagre/elkjs y el usuario edita a mano.
- Plantillas: oficina pequeña, campus, data center.
- Validar límites (p. ej. máx. ~200 nodos para que el lienzo sea usable).

---

## 10. Perfiles de fabricante: Cisco y TP-Link (fase 6)

**Principio:** NO emulamos IOS ni firmware real. Cada marca/modelo es un **perfil simplificado** con atributos que cambian el comportamiento. La app debe mostrar el aviso: *"Aproximación didáctica; no sustituye Packet Tracer ni pruebas en equipo real."*

**Atributos del perfil:** soporte de STP/RSTP/MSTP · prioridad de bridge por defecto · método de costo de puerto STP (corto/largo) · protocolos de ruteo soportados · distancia administrativa · costo OSPF por defecto · número y velocidad de puertos.

**Datos de referencia (Cisco, conocidos):** prioridad STP por defecto 32768 (múltiplos de 4096); costos de puerto método corto: 10 Mbps = 100, 100 Mbps = 19, 1 Gbps = 4, 10 Gbps = 2; distancia administrativa: conectada 0, estática 1, EIGRP 90, OSPF 110, RIP 120; costo OSPF = ancho de banda de referencia (100 Mbps por defecto) / ancho de banda de la interfaz, de modo que 100 Mbps y 1 Gbps valen lo mismo salvo que se ajuste la referencia.

**TP-Link:** los valores dependen del modelo (switches administrables JetStream vs. no administrables vs. routers domésticos/Omada). **Verificar en hoja de datos antes de registrar un perfil.** Marcar cada dato con su fuente.

**Panel por dispositivo (3 pestañas):**
1. **Parámetros:** formulario (prioridad, costos, protocolo).
2. **Configuración generada:** texto de comandos en el dialecto de la marca, de solo lectura, derivado del estado de la simulación.
3. **Verificación:** mini-terminal con pocos comandos (`show spanning-tree`, `show ip route`, etc.) con formato de la marca. No es una consola completa.

**Ejemplo de salida Cisco (comandos reales):**
```
spanning-tree mode rapid-pvst
spanning-tree vlan 1 priority 4096
interface GigabitEthernet0/1
 spanning-tree cost 10
 ip ospf cost 10
router ospf 1
 network 10.0.0.0 0.0.0.255 area 0
```
**TP-Link:** mostrar la ruta aproximada de la interfaz web (p. ej. *L2 Features → Spanning Tree* en switches administrables; *Advanced → Network → Advanced Routing* para rutas estáticas en routers domésticos), etiquetada como "ruta aproximada, varía por modelo y firmware".

---