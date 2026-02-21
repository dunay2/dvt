# ADR-0000 Pipeline Implementation (Fase inicial)

Fecha: 2026-02-21

## Alcance aplicado

Se implementó la fase inicial de ADR-0000 enfocada en pipeline CI, reutilizando `@dvt/traceability-service` como base.

Incluye:

- Ejecución de validación de trazabilidad en CI.
- Generación de manifiesto de trazabilidad en ejecución local/CI.
- Validación de cobertura inversa limitada a ADR-0000 para arranque incremental.
- Modo sin publicación a Neo4j para no bloquear PRs cuando no hay secretos de grafo.

## Cambios realizados

- Se agregó configuración raíz para trazabilidad incremental: `traceability.config.json`.
- Se agregó script raíz: `traceability:adr0` en `package.json`.
- Se integró el gate en `.github/workflows/ci.yml` dentro del job de lint/checks.
- Se extendió la CLI del servicio para:
  - `--no-publish` (omite publicación Neo4j)
  - `--requiredAdr` (scope de cobertura inversa)
  - soporte de config `adrPolicy.requiredAdrs`
- Se mejoró catálogo ADR para resolver nombres con sufijo (por ejemplo ADR en español con título en filename).

## Verificación

Comando validado en local:

`pnpm traceability:adr0`

Resultado: OK y generación de `traceability.manifest.json`.

## Nota de evolución

Esta fase está acotada a ADR-0000 para habilitar adopción progresiva. La expansión recomendada es:

1. ampliar `governedPaths`
2. eliminar scope de `requiredAdrs`
3. habilitar publicación Neo4j en CI con secretos
