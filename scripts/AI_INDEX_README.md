# AI_INDEX Generator (prototype)

This script creates an `AI_INDEX.json` file per target directory containing metadata and a heuristic summary of relevant files.

Quick start:

```bash
# install dependencies if needed
pnpm install

# generate indices for the default directories (docs, packages/@dvt/contracts, packages/engine)
pnpm run gen:ai-index

# or pass explicit directories
node scripts/gen-ai-index.js apps/web packages/cli
```

Generated format:

- `AI_INDEX.json` contains: `generatedAt`, `dir`, `entries[]`.
- Each entry: `path`, `title`, `summary`, `keywords`, `lastUpdated`, `tokenCount`.

Notes:

- This is a simple prototype without embeddings; intended for local integration testing.
- For production we recommend: 1) normalize metadata, 2) store vectors in `pgvector` or a vector service, 3) automatic regeneration in CI or hooks.

If you want, I can add a workflow that regenerates indexes on PRs and/or a nightly job for re-embeddings.
