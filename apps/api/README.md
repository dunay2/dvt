# dvt-api (Fastify + TypeScript) — Railway

## Código de autenticación

La implementación de la frontera de autenticación/autorización vive en [apps/api/src/domain/auth](apps/api/src/domain/auth), [apps/api/src/application](apps/api/src/application), [apps/api/src/entrypoints/http](apps/api/src/entrypoints/http) y [apps/api/src/infrastructure/auth](apps/api/src/infrastructure/auth). Las pruebas viven separadas en [apps/api/test](apps/api/test).

## Local run

```bash
cp .env.example .env
npm i
npm run dev
```

- http://localhost:3000/healthz
- http://localhost:3000/version

## Railway deploy (recommended: Nixpacks)

1. Push this repo to GitHub.
2. Railway → New Project → Deploy from GitHub Repo → select this repo.
3. In Railway service settings, set environment variables:

- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `SERVICE_NAME=dbf-api`
- `CORS_ORIGIN=*` (or your Vercel URL, comma-separated)

Railway will inject `PORT` automatically.

### Health checks

Use:

- `/healthz` as liveness
- `/readyz` as readiness

## Notes

- `nixpacks.toml` pins the build/start behavior for Railway.
- TypeScript is strict; no `any`.

## Render.com deploy

1. Haz push de este repo a GitHub.
2. En Render, crea un nuevo servicio Web y selecciona este repositorio.
3. Render detectará automáticamente el Dockerfile y el Procfile.
4. Configura las variables de entorno en el panel de Render (usa `.env.example` como referencia):
   - `NODE_ENV=production`
   - `LOG_LEVEL=info`
   - `SERVICE_NAME=dvt-api`
   - `CORS_ORIGIN=*` (o tu dominio permitido)
   - Render inyecta automáticamente `PORT` y suele usar `HOST=0.0.0.0`
5. El servicio se expondrá en el puerto que Render asigne (tu app ya lo soporta).

### Health checks en Render

- Liveness: `/healthz`
- Readiness: `/readyz`
