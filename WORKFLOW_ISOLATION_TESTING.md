# Workflow Isolation Testing Strategy

## Objetivo

Aislar y verificar cada workflow de GitHub Actions uno a la vez para identificar y corregir fallos sin interferencia.

## Estado Actual (Commit: e44b078)

### Workflows Activos en Pull Request

- ✅ **ci.yml** - Activo (`on: pull_request`)
  - Job: ESLint + Prettier + TypeScript
  - Job: Markdown Documentation

### Workflows Deshabilitados (Solo workflow_dispatch + push)

- ⏸️ **test.yml** - Deshabilitado pull_request
  - Job: Run Tests (18.x, 20.x)
  - Job: Determinism Tests

- ⏸️ **contracts.yml** - Deshabilitado pull_request
  - Job: Validate JSON Schemas
  - Job: Determinism Pattern Scan
  - Job: Compile TypeScript Contracts
  - Job: Validate Golden JSON Fixtures

- ⏸️ **golden-paths.yml** - Deshabilitado pull_request
  - Job: Validate Golden Path Plans

## Pasos de Verificación Remota

### Fase 1: Verificar ci.yml

1. ✅ Push a remoto → Esperar GitHub Actions
2. Si **PASA**: Proceder a Fase 2
3. Si **FALLA**: Revisar logs en GitHub y corregir

### Fase 2: Habilitar test.yml

1. Descomenta `pull_request:` en test.yml
2. Commit y push
3. Esperar ejecución en GitHub
4. Si **PASA**: Proceder a Fase 3
5. Si **FALLA**: Revisar logs y corregir

### Fase 3: Habilitar contracts.yml

1. Descomenta `pull_request:` en contracts.yml
2. Commit y push
3. Esperar ejecución en GitHub
4. Si **PASA**: Proceder a Fase 4
5. Si **FALLA**: Revisar logs y corregir

### Fase 4: Habilitar golden-paths.yml

1. Descomenta `pull_request:` en golden-paths.yml
2. Commit y push
3. Esperar ejecución en GitHub
4. Si **PASA**: ✅ TODOS LOS WORKFLOWS PASAN
5. Si **FALLA**: Revisar logs y corregir

## Cómo Proceder

### Para habilitar siguiente workflow

```bash
# 1. Descomentar pull_request en el workflow
# Ejemplo para test.yml:
# on:
#   pull_request:
#     branches: [main]
#   push:
#     branches: [main]
#   workflow_dispatch:

# 2. Commit
git add .github/workflows/test.yml
git commit -m "test(ci): Enable test.yml for isolated verification"

# 3. Push para disparar workflows en GitHub
git push
```

### Para revisar logs en GitHub

- URL: <https://github.com/dunay2/dvt/actions>
- Buscar el workflow corriendo
- Click en el job fallido
- Revisar step output

## Expected Results

### ✅ ci.yml should pass

- ESLint: 0 errors
- Prettier: All files formatted
- TypeScript: No type errors
- Markdown: 0 errors

### ✅ test.yml should pass

- All tests: 20/20 passing
- Coverage: Generated successfully
- Determinism tests: Passing

### ✅ contracts.yml should pass

- JSON schemas: Valid (or skip if none)
- Determinism linting: Pass
- TypeScript compile: No errors
- No forbidden patterns (Date.now, Math.random, crypto.randomBytes)

### ✅ golden-paths.yml should pass

- 3 golden paths validated
- All JSON files valid
- All schema versions correct
- All validation statuses VALID

## Troubleshooting

If a workflow fails:

1. Note the failing job name
2. Click through to GitHub Actions logs
3. Find the failing step
4. Check what the exact error is
5. Consult WORKFLOW_FIXES.md or create new fix
6. Test locally with `pnpm` commands
7. Commit fix and re-push

## Progress Tracking

- [x] Commit e44b078: Disabled test.yml, contracts.yml, golden-paths.yml
- [ ] Verify ci.yml passes on remote
- [ ] Enable test.yml
- [ ] Verify test.yml passes on remote
- [ ] Enable contracts.yml
- [ ] Verify contracts.yml passes on remote
- [ ] Enable golden-paths.yml
- [ ] Verify golden-paths.yml passes on remote
- [ ] All workflows passing ✅
