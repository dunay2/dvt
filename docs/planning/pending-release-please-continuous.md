---
title: Pending Release Please Continuous
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: status
---
# Pending Release Please Continuous

# Pendiente: activar release-please en continuo

Fecha: 2026-03-04
Estado: Pendiente

## Contexto

Actualmente `release-please` está configurado en `.github/workflows/release.yml` solo con `workflow_dispatch` (manual).

## Pendiente

Activar ejecución continua en `push` sobre `main` (manteniendo `workflow_dispatch`).

Propuesta mínima:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

## Criterios de cierre

- `release.yml` actualizado y mergeado en `main`.
- Validado que se crea/actualiza automáticamente PR de release tras un merge a `main`.
- Decisión explícita sobre publicación npm automática vs manual.

## Riesgos a revisar antes de activar

- Publicaciones no deseadas a npm si `publish-npm` corre sin guardas adicionales.
- Ruido de PRs de release si los commits no siguen ConvCommits.
