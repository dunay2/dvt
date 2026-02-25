# ADR-0018 — Divination Layer con nomenclatura D&D y contrato técnico explícito

Status: Proposed  
Date: 2026-02-25

## Context

El documento [`DVT_Divination_Layer_v1.0.0.md`](../architecture/review/DVT_Divination_Layer_v1.0.0.md) propone una capability de simulación/predicción (`@dvt/divination`) con nomenclatura D&D (Scrying, Omen, Vision, Portent, Augury, Silence).

El equipo confirma preferencia explícita por mantener esta semántica por motivos de identidad de producto, cultura técnica y diferenciación.

La preocupación arquitectónica no es el naming, sino evitar ambigüedad contractual y drift con límites hexagonales/CQRS.

## Decision

1. Se **acepta** mantener la capa semántica D&D en:
   - naming de dominio interno,
   - documentación,
   - UX/UI.
2. Se define doble capa formal:
   - **Capa narrativa (D&D)**: lenguaje de producto y experiencia.
   - **Capa normativa (contract-first)**: contratos, invariantes, límites y NFRs.
3. Cada término D&D debe tener mapeo unívoco a término técnico canónico (fuente de verdad documentada).
4. El paquete `@dvt/divination` debe respetar arquitectura hexagonal:
   - sin escritura directa de infraestructura desde adapters,
   - integración por puertos de dominio,
   - CQRS: write/read separados.
5. Determinismo y validez de simulación se rigen por invariantes explícitos (ej.: `inputHashSha256`, reglas de fallback, idempotencia de cálculo).
6. La capa D&D no puede introducir ambigüedad contractual: en conflictos, manda la capa normativa.

## Consequences

### Positive

- Se preserva identidad de producto sin sacrificar rigor técnico.
- Mayor adopción interna (lenguaje memorable) y coherencia externa (UX diferenciada).
- Mejora de trazabilidad: términos narrativos enlazados a contratos verificables.

### Trade-offs

- Mayor disciplina documental (dos capas sincronizadas).
- Riesgo de drift semántico si no se gobierna el glosario.
- Coste adicional de revisión para cambios de naming.

## Impact

- Documentación técnica y funcional debe incluir tabla de mapeo D&D ↔ técnico.
- Revisiones de arquitectura deben validar ambos planos: semántico y contractual.
- Los contratos públicos deben evitar ambigüedad, aunque internamente se use naming D&D.

## Acceptance Criteria

1. Existe glosario normativo con mapeo 1:1 entre términos D&D y técnicos.
2. `@dvt/divination` publica contratos explícitos (input/output, invariantes, errores, NFRs).
3. No hay acceso directo de adapter a infraestructura de estado, en línea con [`ADR-0017`](./ADR-0017-state-write-boundary-for-engine-adapters.md).
4. La nomenclatura D&D se usa de forma consistente en docs y UI, sin contradicciones con contratos.
5. Se añaden tests de conformidad para invariantes clave (determinismo, concentración/hash, fallback Augury/Silence).

## Traceability

- Baseline: [`DVT_Divination_Layer_v1.0.0.md`](../architecture/review/DVT_Divination_Layer_v1.0.0.md)
- Related ADRs:
  - [`ADR-0014`](./ADR-0014-run-driven-adapter-model.md)
  - [`ADR-0017`](./ADR-0017-state-write-boundary-for-engine-adapters.md)
- Decision: mantener naming D&D con gobernanza contract-first obligatoria.
