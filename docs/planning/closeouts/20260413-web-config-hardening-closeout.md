---
slice: WEB-CONFIG-HARDENING
date: 2026-04-13
last_reviewed: 2026-04-13
author: AI (Codex)
---

# Closeout: Web config hardening after Vite 8 alignment

## Think-First Analysis

- Problem summary: el workspace web ya quedó alineado con `vite@8` y `@vitejs/plugin-react@6`, pero varias configs seguían expresando supuestos de la línea anterior o estaban demasiado acopladas al entorno local.
- Root cause: el salto de versión se hizo para cerrar la PR 926 y resolver CI, pero dejó tres huecos operativos: el `engines.node` del repo seguía por debajo del mínimo real del frontend, la config de Vite seguía usando una resolución menos robusta para ESM, y `allowedHosts` estaba hardcodeado al host Docker actual.
- Constraints and invariants: no introducir deuda ni bypasses (`AGENTS.md`); mantener el cambio como slice `Slim` con validación real del workspace tocado (`docs/guides/ai-work-protocol.md`); no ampliar el alcance a una migración general de test runner o bundler si no hace falta.
- Options considered:
  - tocar solo `engines.node`: insuficiente, porque deja la config web rígida y no corrige la fragilidad ESM
  - introducir nuevas dependencias para resolver paths y rehacer la config: descartado por expansión innecesaria del slice
  - endurecer las configs existentes con cambios acotados y sin nuevas dependencias: seleccionado
- Selected option and rationale: actualizar el piso de Node del repo al mínimo real requerido por la toolchain web actual y endurecer `apps/web/vite.config.ts` para ESM y hosts configurables por env, manteniendo el resto del stack estable.
- Rejected alternatives: no migrar Vitest ni introducir `vite-tsconfig-paths` en este slice porque no hay fallo actual que lo exija.

## Pre-Implementation Brief

- Mode: Slim
- Scope: `package.json`, `apps/web/vite.config.ts`, y este closeout
- Expected outcome: configs coherentes con el stack web actual, menor fragilidad en desarrollo y menor desalineación entre requisitos declarados y reales
- Risks and mitigations:
  - riesgo: cambiar `engines.node` podría sorprender a entornos desactualizados
  - mitigación: fijar el mínimo exacto requerido por la toolchain ya instalada, no uno arbitrariamente mayor
  - riesgo: cambiar `allowedHosts` podría afectar el flujo Docker
  - mitigación: conservar `host.docker.internal` como default y permitir ampliarlo por env
- Out-of-scope items: migración de Vitest, nuevas dependencias de aliases, cambios de bundle splitting
- Validation plan: `pnpm --filter @dvt/web build`, `pnpm --filter @dvt/web typecheck`, `pnpm --filter @dvt/web test`, `pnpm docs:sync`, `pnpm verify:prepush`
- Test coverage plan: reutilizar la suite existente de `@dvt/web` para comprobar que el endurecimiento de config no rompe build, tipos ni tests del workspace
- Libraries evaluated: ninguna nueva; se endurecen configs sobre `vite`, `@vitejs/plugin-react` y `@tailwindcss/vite` ya adoptados

## Changes Made

| File                                                                | Change                                                                                                           | Why                                                                                                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `package.json`                                                      | `engines.node` subido de `>=20.0.0` a `>=20.19.0`                                                                | Alinear el requisito declarado del repo con el mínimo real exigido por `vite@8` y `@vitejs/plugin-react@6` |
| `apps/web/vite.config.ts`                                           | resolución de alias `@` migrada a `fileURLToPath(new URL(..., import.meta.url))`                                 | Evitar depender de `__dirname` en una config ESM                                                           |
| `apps/web/vite.config.ts`                                           | `allowedHosts` pasa a ser configurable vía `VITE_ALLOWED_HOSTS`, conservando `host.docker.internal` como default | Reducir el acoplamiento de la config a un solo entorno local                                               |
| `docs/planning/closeouts/20260413-web-config-hardening-closeout.md` | closeout canónico del slice                                                                                      | Dejar trazabilidad y evidencia del cambio                                                                  |

## Validation Evidence

| Command                            | Result                        |
| ---------------------------------- | ----------------------------- |
| `pnpm --filter @dvt/web build`     | PASS                          |
| `pnpm --filter @dvt/web typecheck` | PASS                          |
| `pnpm --filter @dvt/web test`      | PASS - 74 archivos, 354 tests |
| `pnpm docs:sync`                   | PASS                          |
| `pnpm verify:prepush`              | PASS                          |

## Debt Introduced

None. No se añadieron dependencias nuevas, overrides de compatibilidad, stubs ni bypasses de reglas.

## Known Residuals

- La deriva potencial entre aliases de Vite, TypeScript y Vitest sigue existiendo porque este slice no introduce una fuente única para paths; se dejó fuera a propósito para mantener el cambio acotado.
