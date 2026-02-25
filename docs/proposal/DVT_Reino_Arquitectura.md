# 🏰 DVT+ --- El Reino de los Datos

_Versión consolidada con ontología D&D coherente_ Generado:
2026-02-25T02:36:46.004703 UTC

---

## 📜 El Mapa del Reino

    DVT/

├── 📜 docs/ # La Gran Biblioteca
│ ├── 📜 grimorios/ # ADRs (decisiones del consejo)
│ ├── 🔮 profecías/ # RFCs (futuros posibles)
│ ├── 🗺️ mapas/ # Diagramas de arquitectura
│ ├── 📚 crónicas/ # CHANGELOG, releases
│ └── 🔮 augurios/ # Roadmap, issues
│
├── ⚙️ infra/ # Las Fortalezas (infraestructura)
│
├── 📦 packages/
│ └── @dvt/
│ ├── 🧙 planner/ # El Archimago — escribe grimorios
│ ├── 🛡 dungeon-master/ # El Señor del Control Plane
│ ├── 📖 plan-verifier/ # El Inquisidor — verifica grimorios
│ ├── 🔍 plan-interpreter/ # El Ilusionista — visualiza el plano

- │ ├── 🔮 divination/ # El Oráculo — ve futuros posibles
  │ ├── 🔢 canonical/ # El Codex — verdad universal
  │ ├── 🎲 dsl/ # El Lenguaje Arcano
  │ ├── ⚔ engine/ # La Doctrina de Ejecución
- │ ├── 📜 state-store/ # El Escriba — contrato de persistencia
  │ ├── 🤝 contracts/ # Los Pactos Sagrados
- │ ├── 🔮 adapter-postgres/ # Portal al Archivo de Piedra
  │ ├── ⏳ adapter-temporal/ # Portal al Reino del Tiempo
  │ ├── 🔍 traceability-service/ # El Archivero Real
  │ ├── 🗣 cli/ # Los Heraldos
  │ └── 🧪 tests/ # Campo de Entrenamiento
  │
  ├── 🎨 frontend/ # Los Cartógrafos (UI)
  ├── 📚 runbooks/ # Pergaminos de Batalla
  └── 📜 scripts/ # Conjuros de Automatización

---

# 🧙 Habitantes del Reino (Responsabilidades)

## 🧙 planner/ --- El Archimago

Genera `ExecutionPlan` determinista. No ejecuta. No persiste. No depende
de adapters.

> "El plan es la ley."

---

## 🛡 dungeon-master/ --- El Señor del Control Plane

Autoridad única del flujo de ejecución.

Responsabilidades: - Recibir RunIntent - Recibir transiciones de
Portales - Validar secuencia e idempotencia - Ordenar escritura al
RunStateCommandPort - Disparar auditoría y proyecciones

Invariante: - Solo el Dungeon Master puede ordenar escritura en el
Grimorio.

> "Sin mí, hay caos."

---

## 📖 plan-verifier/ --- El Inquisidor

- Verifica planId
- Valida schema versionado
- Garantiza coherencia determinista

No modifica planes.

> "Confía, pero verifica."

---

## 🔍 plan-interpreter/ --- El Ilusionista del Mapa

- Traduce ExecutionPlan + RunState a ViewModels
- Explain plan
- Renderiza grafo y timeline

No participa en el camino caliente de ejecución.

> "Hacemos visible lo invisible."

---

## 🔢 canonical/ --- El Codex

- Canonicalización JSON
- Hash determinista
- True Names (IDs)
- Reglas universales de formato

> "Solo hay una verdad."

---

## 🎲 dsl/ --- El Lenguaje Arcano

- Define gramática de RunIntent
- Parseo → AST
- Validación sintáctica

> "Los dioses hablan en DSL."

---

## ⚔ engine/ --- La Doctrina de Ejecución

Define qué significa ejecutar un plan:

- IWorkflowEngine
- Modelo de lifecycle
- Eventos canónicos

No es Temporal ni Conductor. Es la abstracción universal.

> "La guerra tiene reglas."

---

## 🔮 adapter-\*/ --- Los Portales Planarios

No tienen autoridad. No escriben estado. Solo traducen entre planos.

Ejemplos: - adapter-temporal → Portal al Reino del Tiempo -
adapter-postgres → Portal al Archivo de Piedra

> "Abrimos puertas. Nada más."

---

## 🔍 traceability-service/ --- El Archivero Real

- Grafo de trazabilidad
- Baseline ADR ↔ File
- Impact analysis
- Historia del Reino

> "La historia no se pierde."

---

## 🧪 Tests --- Pruebas del Canon

Cada módulo contiene pruebas internas. Validan: - Contratos -
Idempotencia - Determinismo - Invariantes del Reino

> "Falla aquí, no en combate."

---

# ⚔ Flujo Correcto de la Aventura

## Camino de Ejecución

    CLI (Heraldo)
       ↓
    Dungeon Master
       ↓
    Plan Verifier
       ↓
    Portal Planario (adapter-*)
       ↓
    Reino Exterior (Temporal / Conductor)
       ↓
    Transiciones → Dungeon Master
       ↓
    RunStateCommandPort
       ↓
    Proyecciones
       ↓
    Frontend (Cartógrafos)

---

# 🏆 Juramento del Reino

> El Archimago escribe el plan.\
> El Señor del Control Plane gobierna la ejecución.\
> El Codex preserva la verdad.\
> Los Portales abren caminos entre planos.\
> El Archivero recuerda todo.\
> Los Cartógrafos muestran el mundo.

Y el Reino permanece coherente.
