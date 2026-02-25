# Estándar de trabajo y plantilla base para nuevos desarrollos

<!--
Status: baseline
Last-updated: 2026-02-25
Owner: equipo-dvt
-->

Documento base para reutilizar en siguientes desarrollos, consolidando reglas aprendidas del repositorio, prácticas que funcionan/no funcionan, estructura recomendada, herramientas, sistema de puntuación y matriz de riesgos.

---

## 1) Objetivo y alcance

Este estándar define una forma de trabajo repetible para:

- Mantener consistencia técnica en monorepo.
- Reducir retrabajo (decisiones ya aprendidas).
- Acelerar arranque de nuevos proyectos/verticales.
- Gestionar riesgos con criterios comparables.

Aplica a cambios en código, contratos, documentación, CI/CD y operación.

---

## 2) Principios operativos (reglas aprendidas)

1. **Contrato primero**: el diseño empieza por contratos/versionado antes de implementación.
2. **Repositorio como fuente de verdad**: código y decisiones viven en `packages/*` y `docs/*`.
3. **Determinismo en core**: nada no determinista en el engine.
4. **PRs pequeños y enfocadas**: cambios acotados y verificables.
5. **Automatización como gate**: si no pasa CI, no está listo.
6. **Trazabilidad de decisiones**: cambios semánticos relevantes deben vincular ADR.
7. **Documentación viva**: el cambio de comportamiento exige actualizar docs.

---

## 2.1 Prácticas específicas identificadas en este repo (DVT)

Estas reglas no son teóricas; se derivan de la configuración y documentación vigente del repositorio:

1. **Monorepo `pnpm` como patrón obligatorio**
   - Estructura activa por paquetes bajo `packages/@dvt/*`.
   - Evidencia: `README`, contexto del proyecto y resumen de estructura.

2. **Contract-first con validadores dedicados**
   - Se exige validación de contratos y golden paths cuando hay cambios en contratos.
   - Comandos usados en este repo: `pnpm validate:contracts`, `pnpm golden:validate`.

3. **Determinismo estricto en engine core**
   - En el core se prohíbe `Date.now()`, `Math.random()` y `process.env` directo.
   - Se pide reloj/RNG/config inyectados.

4. **Quality gates de CI como criterio de merge**
   - Lint, type-check, tests y controles de PR metadata.
   - Workflows activos: `ci.yml`, `test.yml`, `contracts.yml`, `pr-quality-gate.yml`.

5. **PR quality policy concreta**
   - Convencional commits en título.
   - Descripción mínima y PR de tamaño controlado (<500 líneas preferido).

6. **Gobernanza documental y ownership por rutas**
   - Cambios en áreas normativas/documentales pasan por `CODEOWNERS` y revisores por dominio.

7. **Release unificado**
   - Este repo usa `release-please` como vía oficial de releases.
   - Se evita doble sistema de versionado/release.

8. **Convención de tooling por paquete (evitar deriva)**
   - Una sola configuración por herramienta y paquete (p. ej., Vitest CJS o TS, no ambas duplicadas).

9. **Knowledge Graph: práctica condicional (no baseline)**
   - En este repo existen `pnpm kg:generate` y `pnpm kg:check`, pero su adopción es **situacional**.
   - `kg:check` falla cuando hay drift esperado en `scripts/neo4j/generated-repo.cypher`; por tanto, no debe tratarse como gate universal para todo cambio.
   - Usar esta práctica solo en cambios explícitos de trazabilidad/KG/ADRs y con mantenimiento activo del artefacto generado.

10. **Trazabilidad de cambios semánticos**
    - Cambios semánticos en contratos deben incorporar ADR y actualización de documentación asociada.

---

## 3) Qué funciona y qué no (aprendizajes prácticos)

## 3.1 Lo que funciona

- Monorepo con `pnpm workspaces` y separación por paquetes.
- Convención de commits + automatización de releases.
- Contratos versionados y validados en CI.
- Reglas explícitas de determinismo en engine.
- Plantillas de issues y criterios de aceptación desde el inicio.
- Pipeline con lint + type-check + test + validación de contratos.
- Uso de Knowledge Graph solo en iniciativas que realmente lo necesitan.

## 3.2 Lo que no funciona / anti-patrones

- Código activo fuera de `packages/*` (duplica lógica y rompe ownership).
- PRs grandes (>500 líneas) con múltiples objetivos.
- Cambiar semántica sin contrato/ADR asociado.
- Usar APIs no deterministas en flujo core (`Date.now`, `Math.random`, `process.env` directo).
- Configuración duplicada por herramienta (deriva y errores de CI).
- Documentación desactualizada respecto al código real.
- Tratar `kg:check` como práctica universal cuando el artefacto generado cambia con frecuencia (genera ruido y falsos bloqueos).

---

## 4) Estructura estándar de carpetas (plantilla)

```text
root/
├── docs/
│   ├── INDEX.md
│   ├── CONTRIBUTING.md
│   ├── guides/
│   │   └── ESTANDAR_DESARROLLO_Y_PLANTILLA_BASE.md
│   ├── architecture/
│   ├── planning/
│   └── runbooks/
├── packages/
│   ├── @org/contracts/
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── @org/core-engine/
│   │   ├── src/
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── @org/adapter-*/
│   └── @org/cli/
├── scripts/
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Reglas de estructura

- Toda implementación de runtime en `packages/*`.
- Tests junto a cada paquete (no en raíz salvo utilidades puntuales).
- `docs/INDEX.md` como índice canónico de navegación.
- Contratos y decisiones arquitectónicas con rutas estables y versionadas.

---

## 5) Herramientas y baseline mínimo

## 5.1 Stack base

- **Gestión monorepo**: pnpm workspaces.
- **Lenguaje**: TypeScript (strict).
- **Testing**: Vitest.
- **Lint/Formato**: ESLint + Prettier + markdownlint.
- **Versionado y releases**: Conventional Commits + release-please.
- **CI/CD**: GitHub Actions con quality gates.

## 5.2 Comandos mínimos obligatorios

```bash
pnpm install
pnpm lint
pnpm format:check
pnpm type-check
pnpm test
```

## 5.3 Quality gates obligatorios

- Lint sin errores bloqueantes.
- Type-check estricto sin errores.
- Test suite verde.
- Cobertura objetivo (mínimo recomendado: 80%).
- Validación de contratos (si aplica).
- PR metadata válida (título/descripcion/contenido).

---

## 6) Plantillas reutilizables

## 6.1 Plantilla de inicio de desarrollo (Kickoff)

```markdown
# [NOMBRE INICIATIVA]

## Contexto

- Problema a resolver:
- Impacto esperado:
- Alcance (in/out):

## Contratos y dominio

- Contratos afectados:
- ¿Hay cambio semántico?: [Sí/No]
- ADR requerida: [Sí/No]

## Plan técnico

- Paquetes a modificar:
- Estrategia de implementación:
- Estrategia de rollback:

## Validación

- Tests a añadir/actualizar:
- Comandos de validación:
- Métricas de éxito:

## Riesgos

- Riesgo principal:
- Mitigación:
```

## 6.2 Plantilla de issue técnico

```markdown
# [tipo(scope)]: [título corto]

## Descripción

## Objetivos

- [ ]
- [ ]

## Criterios de aceptación

- [ ]
- [ ]

## Archivos/paquetes sugeridos

## Riesgos y mitigaciones

## Validación local

- pnpm lint
- pnpm type-check
- pnpm test
```

## 6.3 Plantilla de PR

```markdown
## Resumen

## Cambios realizados

-

## Evidencias

- Comandos ejecutados:
- Resultado:

## Riesgos

-

## Checklist

- [ ] Lint OK
- [ ] Type-check OK
- [ ] Tests OK
- [ ] Docs actualizadas
- [ ] Contratos/versionado revisados
```

## 6.4 Plantilla de ADR (resumen)

```markdown
# ADR-XXXX: [decisión]

## Estado

Propuesto | Aceptado | Reemplazado

## Contexto

## Decisión

## Consecuencias

## Alternativas consideradas
```

---

## 7) Sistema de puntuación (scorecard)

Escala por criterio: **0 a 5**

- **0** = inexistente
- **3** = aceptable con brechas
- **5** = sólido y repetible

## 7.1 Criterios

| Criterio                  | Peso | Pregunta de control                                   |
| ------------------------- | ---: | ----------------------------------------------------- |
| Contratos y versionado    |  20% | ¿El cambio está definido y versionado correctamente?  |
| Calidad técnica           |  20% | ¿Pasa lint/type-check/test sin excepciones?           |
| Determinismo / fiabilidad |  15% | ¿Evita fuentes no deterministas y estados ambiguos?   |
| Operabilidad              |  15% | ¿Incluye observabilidad, runbook y rollback?          |
| Seguridad y cumplimiento  |  10% | ¿No introduce vectores críticos y mantiene controles? |
| Documentación             |  10% | ¿La documentación refleja el estado real?             |
| Entrega (PR/CI)           |  10% | ¿PR clara, pequeña, trazable y con gates verdes?      |

## 7.2 Interpretación

- **≥ 85**: listo para producción.
- **70–84**: apto con plan de mejora explícito.
- **50–69**: riesgo alto; no promover sin correcciones.
- **< 50**: bloquear integración.

---

## 8) Matriz de riesgos

Escala:

- **Probabilidad**: 1 (baja) a 5 (alta)
- **Impacto**: 1 (bajo) a 5 (crítico)
- **Riesgo bruto** = Probabilidad × Impacto

| Riesgo                        | Prob. | Impacto | Score | Señal temprana                    | Mitigación                             |
| ----------------------------- | ----: | ------: | ----: | --------------------------------- | -------------------------------------- |
| Ruptura de contrato           |     3 |       5 |    15 | Fallos en validación/consumidores | Versionado semver + tests de contrato  |
| Regresión en determinismo     |     2 |       5 |    10 | Hash/golden path inestable        | Reglas lint + tests deterministas      |
| Deriva documental             |     4 |       3 |    12 | PR sin update docs                | Checklist obligatoria de documentación |
| Deuda técnica por PR grande   |     4 |       4 |    16 | PR >500 líneas / múltiples temas  | Dividir PRs y exigir foco único        |
| Falla operativa en despliegue |     2 |       5 |    10 | Alertas y rollback manual lento   | Runbook + ensayo de rollback           |

### Umbrales

- **1–6**: bajo (monitorizar)
- **7–12**: medio (mitigación planificada)
- **13–25**: alto/crítico (bloquear o reducir antes de merge)

---

## 9) Workflow estándar por fases

1. **Definición**: objetivo, alcance, contratos y riesgos iniciales.
2. **Diseño**: decisión técnica + ADR (si cambio semántico).
3. **Implementación**: PR pequeña, foco único, tests añadidos.
4. **Validación**: lint + type-check + test + contratos.
5. **Documentación**: actualizar guías, índices y runbooks.
6. **Entrega**: scorecard ≥ 70 y riesgos altos mitigados.
7. **Postmortem ligero**: lecciones aprendidas y mejoras de plantilla.

---

## 10) Checklist final (go/no-go)

- [ ] Alcance y criterios de aceptación definidos.
- [ ] Contratos/versionado revisados.
- [ ] ADR añadida cuando aplica.
- [ ] PR con foco único y tamaño controlado.
- [ ] CI completa en verde.
- [ ] Scorecard completada y aprobada.
- [ ] Riesgos altos mitigados/documentados.
- [ ] Documentación y runbooks actualizados.

---

## 11) Referencias internas del repositorio

- `README.md`
- `docs/CONTRIBUTING.md`
- `docs/guides/QUALITY.md`
- `docs/REPO_STRUCTURE_SUMMARY.md`
- `docs/planning/NEXT_ISSUES_TEMPLATES.md`
- `Project Context for AI Assistants.md`

---

## 12) Modo de uso como plantilla base para el próximo desarrollo

1. Duplicar este archivo con nombre de iniciativa (ej. `ESTANDAR_PROYECTO_X.md`).
2. Completar secciones 1, 6, 7 y 8 para el caso concreto.
3. Ejecutar scorecard al inicio, mitad y antes de merge.
4. Registrar cambios de estándar en changelog interno de documentación.

Resultado esperado: ciclo repetible, medible y con menor incertidumbre técnica.
