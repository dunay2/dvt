# Product Strategy (DVT)

<!--
Status: canonical
Last-updated: 2026-02-21
Owner: dunay2
-->

## Propósito

DVT proporciona una plataforma de orquestación determinista para ejecutar workflows críticos con trazabilidad por eventos, contratos normativos y operación multi-adapter.

## Posicionamiento

- **Core confiable**: ejecución reproducible y orientada a auditoría.
- **Contrato primero**: interfaces y semántica versionadas antes de implementación.
- **Escalabilidad por adapters**: separación entre engine core y proveedores de ejecución.

## Alcance del producto

- Engine core: [WorkflowEngine](../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
- Contrato principal: [IWorkflowEngine.v1.1.md](../architecture/engine/contracts/engine/IWorkflowEngine.v1.1.md)
- Semántica de ejecución: [ExecutionSemantics.v1.md](../architecture/engine/contracts/engine/ExecutionSemantics.v1.md)

## Decisión de plataforma API

Se adopta Fastify para la futura capa HTTP/API por rendimiento y ergonomía de validación, manteniendo desacoplamiento estricto respecto al dominio.

- Referencia: [Fastify](https://fastify.dev/)
- Regla: la capa API adapta requests/responses sin alterar contratos de dominio.

## Prioridades de producto

1. Cerrar MVP técnico del camino crítico (`#14`, `#15`, `#6`, `#68`).
2. Mejorar experiencia operativa (estado, señales, trazabilidad).
3. Consolidar seguridad y observabilidad como baseline de plataforma.
