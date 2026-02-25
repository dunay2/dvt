# Wiki interna con MkDocs Material (mínimo cambio)

Este repositorio ya tiene base de wiki con [`mkdocs.yml`](../mkdocs.yml) y despliegue en [`.github/workflows/mkdocs-deploy.yml`](../.github/workflows/mkdocs-deploy.yml).

## 1) Instalación local (Windows)

```bash
python -m pip install --upgrade pip
pip install mkdocs mkdocs-material
```

## 2) Comandos

Desde la raíz del repo:

```bash
pnpm docs:serve
pnpm docs:build
```

## 3) Estructura de navegación aplicada

Se actualizó [`mkdocs.yml`](../mkdocs.yml) para incluir:

- Core
- Vision (v0.6)
- Governance
- Planning
- Operations
- Status

Incluyendo el pack de visión:

- [`docs/vision/DVT_Docs_Pack_v0.6/docs/index.md`](./vision/DVT_Docs_Pack_v0.6/docs/index.md)
- [`docs/vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md`](./vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md)
- [`docs/vision/DVT_Docs_Pack_v0.6/docs/standards/development.md`](./vision/DVT_Docs_Pack_v0.6/docs/standards/development.md)
- [`docs/vision/DVT_Docs_Pack_v0.6/docs/standards/modules-canonicos-minimos.md`](./vision/DVT_Docs_Pack_v0.6/docs/standards/modules-canonicos-minimos.md)
- [`docs/vision/DVT_Docs_Pack_v0.6/docs/lore.md`](./vision/DVT_Docs_Pack_v0.6/docs/lore.md)

## 4) Publicación

La publicación está automatizada en [`.github/workflows/mkdocs-deploy.yml`](../.github/workflows/mkdocs-deploy.yml).
