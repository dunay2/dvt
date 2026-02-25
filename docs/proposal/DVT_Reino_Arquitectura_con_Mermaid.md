# 🏰 DVT+ — El Reino de los Datos (con Mermaid)

_Versión consolidada con ontología D&D coherente_
Generado: 2026-02-25T02:41:52.075271 UTC

---

## 🗺️ Diagrama del Reino (Mermaid)

```mermaid
flowchart LR

%% ============ Core / Ducado Central ============
subgraph CORE["🏛️ Ducado Central (@dvt) — Núcleo del Reino"]
  PLANNER["🧙 planner<br/>El Archimago<br/>Genera ExecutionPlan"]
  DM["🛡 dungeon-master<br/>Lord of Orchestration<br/>Autoridad del Grimorio"]
  VERIFIER["📖 plan-verifier<br/>Inquisidor<br/>Verifica planId + schema"]
  CANON["🔢 canonical<br/>El Codex<br/>Canonical JSON + Hashes"]
  DSL["🎲 dsl<br/>Lenguaje Arcano<br/>RunIntent/AST"]
  ENGINE["⚔ engine<br/>Doctrina de Ejecución<br/>IWorkflowEngine + lifecycle"]
  CONTRACTS["🤝 contracts<br/>Pactos Sagrados<br/>Ports + tipos"]
end

%% ============ Portales (Adapters) ============
subgraph PORTALS["🌀 Portales Planarios (adapters) — Puertas a otros Reinos"]
  APOST["🔮 adapter-postgres<br/>Portal al Archivo de Piedra"]
  ATEMP["⏳ adapter-temporal<br/>Portal al Reino del Tiempo"]
  ACOND["🧭 adapter-conductor (futuro)<br/>Portal al Reino del Orden"]
end

%% ============ Reinos Externos ============
subgraph OUTER["🌌 Reinos Exteriores (Sistemas Externos)"]
  POSTGRES[(Postgres)]
  TEMPORAL[(Temporal)]
  CONDUCTOR[(Conductor)]
end

%% ============ Estado / Auditoría / Proyecciones ============
subgraph RECORD["📜 Crónicas del Reino (State + Auditoría + Proyecciones)"]
  STATE["📓 RunStateStore<br/>El Grimorio (verdad)"]
  OUTBOX["📨 Outbox<br/>Mensajería de Crónicas"]
  PROJ["🗺 Projectors<br/>Cartógrafos (ViewModels)"]
  TRACE["🔍 traceability-service<br/>Archivero Real"]
end

%% ============ UI ============
subgraph UI["🎨 Frontend — Cartógrafos y Trovadores"]
  FE["🧭 frontend<br/>Mapa del Reino (UI)"]
  INTERP["🔍 plan-interpreter<br/>Ilusionista del Mapa<br/>Explain + ViewModels"]
end

%% ============ Entradas ============
subgraph ENTRY["🗣 Entrada"]
  CLI["🗣 cli<br/>Heraldo"]
end

%% ============ Contratos (dependencias permitidas) ============
CONTRACTS --> PLANNER
CONTRACTS --> DM
CONTRACTS --> VERIFIER
CONTRACTS --> ENGINE
CONTRACTS --> APOST
CONTRACTS --> ATEMP
CONTRACTS --> ACOND
CONTRACTS --> INTERP
CONTRACTS --> TRACE

CANON --> PLANNER
CANON --> VERIFIER

DSL --> PLANNER
ENGINE --> ATEMP
ENGINE --> ACOND

%% ============ Flujos principales ============

%% (A) Flujo de Ejecución (camino caliente)
CLI -- "RunIntent" --> DM
DM -- "validate/verify" --> VERIFIER
DM -- "request plan build" --> PLANNER
PLANNER -- "ExecutionPlan vN" --> DM
DM -- "startRun(plan)" --> ATEMP
ATEMP -- "invoke" --> TEMPORAL
TEMPORAL -- "transitions" --> ATEMP
ATEMP -- "reportTransition(CanonicalTransition)" --> DM
DM -- "appendRunEvent (CommandPort)" --> STATE
STATE -- "outbox events" --> OUTBOX
OUTBOX -- "trigger" --> PROJ
PROJ -- "ViewModels" --> FE

%% (B) Camino de UI / Explicación (no caliente)
PLANNER -- "ExecutionPlan vN" --> INTERP
STATE -- "RunState snapshot" --> INTERP
INTERP -- "Explain/ViewModels" --> FE

%% (C) Persistencia / DB
APOST -- "migrations + IO" --> POSTGRES
STATE -- "stored in" --> POSTGRES

%% (D) Trazabilidad
TRACE -- "indexes ADR↔Files" --> POSTGRES
TRACE -- "impact/graph" --> FE

%% ============ Estilos ============
classDef core fill:#f3f3f3,stroke:#333,stroke-width:1px;
classDef portal fill:#eef6ff,stroke:#1f4e79,stroke-width:1px;
classDef outer fill:#fff3e6,stroke:#7a3e00,stroke-width:1px;
classDef record fill:#f0fff4,stroke:#256029,stroke-width:1px;
classDef ui fill:#f8f0ff,stroke:#5b2c83,stroke-width:1px;
classDef entry fill:#fff0f0,stroke:#7a1f1f,stroke-width:1px;

class PLANNER,DM,VERIFIER,CANON,DSL,ENGINE,CONTRACTS core;
class APOST,ATEMP,ACOND portal;
class POSTGRES,TEMPORAL,CONDUCTOR outer;
class STATE,OUTBOX,PROJ,TRACE record;
class FE,INTERP ui;
class CLI entry;
```

---

## 📜 El Mapa del Reino (Árbol)

```text
DVT/
├── 📜 docs/                     # La Gran Biblioteca del Reino
├── ⚙️ infra/                    # Infraestructura (castillos y caminos)
├── 📦 packages/
│   └── @dvt/
│       ├── 🧙 planner/              # El Archimago
│       ├── 🛡 dungeon-master/       # El Señor del Control Plane
│       ├── 📖 plan-verifier/        # El Inquisidor del Grimorio
│       ├── 🔍 plan-interpreter/     # El Ilusionista del Mapa
│       ├── 🔢 canonical/            # El Codex (Ley del Reino)
│       ├── 🎲 dsl/                  # El Lenguaje Arcano
│       ├── ⚔ engine/                # La Doctrina de Ejecución
│       ├── 🤝 contracts/            # Los Pactos Sagrados
│       ├── 🔮 adapter-postgres/     # Portal al Archivo de Piedra
│       ├── ⏳ adapter-temporal/     # Portal al Reino del Tiempo
│       ├── 🔍 traceability-service/ # El Archivero Real
│       ├── 🗣 cli/                  # Los Heraldos
│       └── 🧪 tests/                # Pruebas internas por módulo
├── 🎨 frontend/                # Los Cartógrafos y Trovadores (UI)
├── 📚 runbooks/                # Pergaminos Operacionales
└── 📜 scripts/                 # Conjuros de Automatización
```

---

# 🧙 Habitantes del Reino (Responsabilidades)

## 🧙 planner/ — El Archimago

Genera `ExecutionPlan` determinista.
No ejecuta. No persiste. No depende de portales.

> “El plan es la ley.”

## 🛡 dungeon-master/ — El Señor del Control Plane

Autoridad única del flujo de ejecución:

- recibe RunIntent (jugadores)
- recibe transiciones (portales)
- valida secuencia e idempotencia
- ordena escritura al Grimorio (RunStateCommandPort)
- dispara auditoría y proyecciones

> “Sin mí, hay caos.”

## 📖 plan-verifier/ — El Inquisidor

Verifica planId y schema versionado. No canoniza; solo comprueba.

> “Confía, pero verifica.”

## 🔍 plan-interpreter/ — El Ilusionista del Mapa

Traduce `ExecutionPlan + RunState` a ViewModels y “Explain” para UI.
No participa en el camino caliente.

> “Hacemos visible lo invisible.”

## 🔢 canonical/ — El Codex

Canonical JSON + hashing determinista + True Names.

> “Solo hay una verdad.”

## 🎲 dsl/ — El Lenguaje Arcano

Gramática de intención (RunIntent) y AST.

> “Los dioses hablan en DSL.”

## ⚔ engine/ — La Doctrina de Ejecución

Abstracción universal de ejecución (`IWorkflowEngine`), lifecycle y transiciones canónicas.
No es Temporal ni Conductor.

> “La guerra tiene reglas.”

## 🔮 adapter-\*/ — Los Portales Planarios

Traducción hacia sistemas externos (Temporal/Conductor/Postgres). Sin autoridad y sin escritura directa de estado.

> “Abrimos puertas. Nada más.”

## 🔍 traceability-service/ — El Archivero Real

Grafo ADR↔Files, impacto, auditoría estructural.

> “La historia no se pierde.”

## 🧪 Tests — Pruebas del Canon

Tests internos por módulo, enfocados a contratos y a invariantes locales.

> “Falla aquí, no en combate.”

---

# 🏆 Juramento del Reino

> El Archimago escribe el plan.  
> El Señor del Control Plane gobierna la ejecución.  
> El Codex preserva la verdad.  
> Los Portales abren caminos entre planos.  
> El Archivero recuerda todo.  
> Los Cartógrafos muestran el mundo.

Y el Reino permanece coherente.
