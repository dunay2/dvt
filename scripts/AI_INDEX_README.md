# Generador de AI_INDEX (prototipo)

Este script crea un archivo `AI_INDEX.json` por directorio objetivo con metadatos y un resumen heurístico de los archivos relevantes.

Uso rápido:

```bash
# instalar dependencias si es necesario
pnpm install

# generar índices para los directorios por defecto (docs, packages/@dvt/contracts, packages/engine)
pnpm run gen:ai-index

# o pasar directorios explícitos
node scripts/gen-ai-index.js apps/web packages/cli
```

Formato generado:

- `AI_INDEX.json` contiene: `generatedAt`, `dir`, `entries[]`.
- Cada entrada: `path`, `title`, `summary`, `keywords`, `lastUpdated`, `tokenCount`.

Notas:

- Es un prototipo simple sin embeddings; pensado para pruebas de integración local.
- Para producción se recomienda: 1) normalizar metadatos, 2) almacenar vectores en `pgvector` o servicio de vectores, 3) regeneración automática en CI o hooks.

Si quieres, añado un workflow que regenere índices en PRs y/o un job nightly para re-embeddings.
