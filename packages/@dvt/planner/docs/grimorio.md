planner/ # La Torre del Archimago
├── dist/ # Pergaminos compilados (no mirar)
├── docs/ # Libros de conjuros (documentación)
├── examples/ # Prácticas de aprendices
├── node_modules/ # Ingredientes arcanos (dependencias)
│
├── src/ # El Grimorio Sagrado
│ ├── domain/ # El Conocimiento Arcano
│ │ ├── graph/ # 🌐 La Telaraña de Dependencias
│ │ │ ├── TS Depth.ts # 🔮 Visión de Profundidad — Ve cuán hondo llega el hechizo
│ │ │ ├── TS GraphBuilder.ts# 🕸️ Tejedor de Telarañas — Construye el grafo de magia
│ │ │ └── TS TopoSort.ts # 🧵 Ordenar el Caos — Determina el orden de los conjuros
│ │ │
│ │ ├── stepFactory/ # 🏭 La Forja de Pasos
│ │ │ ├── TS dbtStepFactory.ts# ⛓️ Forja D&D — Crea pasos para el reino de dbt
│ │ │ └── TS StepFactory.ts # ⚒️ El Yunque — Interfaz de creación de pasos
│ │ │
│ │ ├── TS errors.ts # 😱 Las Maldiciones — Errores tipados del archimago
│ │ ├── TS hashing.ts # 🔐 El Sello Arcano — JCS + SHA256 (verdad absoluta)
│ │ ├── TS limits.ts # ⚖️ Los Límites del Poder — Guardrails del archimago
│ │ ├── TS metrics.ts # 📊 El Ojo que Todo lo Mide — Métricas (opcionales)
│ │ ├── TS Planner.ts # 🧙 EL ARCHIMAGO — El que escribe el grimorio
│ │ ├── TS policies.ts # 📜 Las Leyes del Reino — Políticas de ejecución
│ │ ├── TS sorting.ts # 🔤 El Orden de las Letras — binaryCompare, no localeCompare
│ │ └── TS types.ts # 📖 El Bestiario — Tipos y contratos
│ │
│ └── runtime/ # ⏳ El Tiempo Real
│ └── TS index.ts # 🕰️ nowMs() — El reloj del archimago
│
└── TS index.ts # 🚪 La Puerta de la Torre (export público)
