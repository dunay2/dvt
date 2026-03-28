# DVT+ Frontend — Dialect Codegen Boundary

> **Estado:** Propuesta de diseño v1 — 2026-03-28
> **Propósito:** separar el boundary entre shell/frontend y engine/adapters para codegen y ejecución dialect-specific.
> Este documento complementa [DVT_FRONTEND_PLUGIN_ARCHITECTURE.md](c:/dvt/apps/web/DVT_FRONTEND_PLUGIN_ARCHITECTURE.md).

---

## 0. Decisión

La capacidad de generar SQL dialect-specific, escribirlo en git y aplicarlo en el target database **no** forma parte del plugin system frontend.

La separación es esta:

- **frontend / shell:** inicia runs, muestra estado, expone artifacts y diffs
- **engine / adapters:** transpila, escribe en git, abre PRs, aplica objetos en el target

La razón es de boundary, no de conveniencia:

1. el frontend no debe convertirse en autoridad semántica del dialecto
2. el mismo plan puede ejecutarse en distintos modos sin mutar topología
3. git ops y deploy pertenecen a runtime backend, no a la UI

---

## 1. Invariante Principal

> El plan es puro.
> El adapter conoce el dialecto.
> El modo de operación pertenece al run, no al plan.

Esto evita tres errores de modelado:

1. meter el dialecto en el nodo
2. duplicar tipos de run por cada modo de codegen
3. hacer que el frontend “genere SQL” en lugar de disparar una ejecución gobernada

---

## 2. Modo De Operación — Vive En El Run

El modo se declara al iniciar la ejecución:

```typescript
interface DialectRunOptions {
  mode: 'generate-only' | 'execute-only' | 'generate-and-execute';
  gitTarget?: {
    repo: string;
    branch: string;
    prTitle?: string;
  };
}
```

```typescript
engine.startRun(plan, {
  targetAdapter: 'snowflake',
  dialectOptions: {
    mode: 'generate-and-execute',
    gitTarget: {
      repo: 'git@github.com:org/sql-procedures',
      branch: 'generated/2026-03-28',
    },
  },
});
```

### Por qué no en el nodo

Si el modo viviera en el nodo:

- podrías mezclar `generate-only` y `execute-only` en el mismo plan
- el run dejaría de ser auditable como unidad
- la semántica operacional del grafo quedaría ambigua

### Por qué no como tipos distintos de run en el engine

El grafo no cambia entre generar y ejecutar. Cambia el modo operacional del mismo plan.

Por tanto:

- el plan responde a **qué**
- el run responde a **cómo** y **dónde**

---

## 3. Boundary Frontend vs Engine

### Lo que hace el frontend

| Responsabilidad       | Ejemplo                                        |
| --------------------- | ---------------------------------------------- |
| iniciar run           | `startRun(mode: 'generate-only')`              |
| mostrar progreso      | `generating`, `pushing`, `applying`            |
| mostrar artifacts     | links a commit, PR, objetos aplicados          |
| mostrar diff          | artifact type `sql-source`                     |
| reintentar o promover | botón `Deploy to production` -> `execute-only` |

### Lo que NO hace el frontend

| Fuera del frontend                       | Motivo                       |
| ---------------------------------------- | ---------------------------- |
| parsear SQL dialect-specific             | pertenece al adapter         |
| renderizar templates de procedures/tasks | pertenece al adapter         |
| clonar repo y hacer commit/push          | pertenece al runtime backend |
| abrir PRs                                | pertenece al runtime backend |
| ejecutar `CREATE OR REPLACE` en la base  | pertenece al adapter/runtime |

La UI orquesta intención del usuario. El engine y los adapters ejecutan trabajo.

---

## 4. `IDialectAdapter`

La extensión dialect-specific vive del lado de adapters:

```typescript
interface TranspiledObject {
  sql: string;
  objectType: 'procedure' | 'task' | 'function' | 'view';
  fileName: string;
  nodeId: string;
}

interface GitRepoTarget {
  repo: string;
  branch: string;
  prTitle?: string;
}

interface IDialectAdapter extends IProviderAdapter {
  readonly dialect: string;

  transpile(node: CanonicalNode): TranspiledObject;
  writeToRepo(objects: TranspiledObject[], target: GitRepoTarget): Promise<ArtifactRef[]>;
  apply(objects: TranspiledObject[], ctx: RunContext): Promise<void>;
}
```

### Responsabilidades

| Método          | Responsabilidad                                      |
| --------------- | ---------------------------------------------------- |
| `transpile()`   | traducir nodo canónico a objeto SQL dialect-specific |
| `writeToRepo()` | persistir archivos generados y devolver artifacts    |
| `apply()`       | aplicar objetos en el target database                |

La shell frontend no implementa este contrato.

---

## 5. Flujo `generate-and-execute`

```text
dbt manifest.json
      |
      v   plugin.import.parse()
Canonical Plan (dialect-agnostic)
      |
      v   engine.startRun(plan, { mode: 'generate-and-execute', gitTarget })
Dialect Adapter
      |
      +-- transpile(node)     -> SQL dialect-specific
      +-- writeToRepo(...)    -> commit / push / PR
      +-- apply(...)          -> objetos creados en target database
      |
      v
RunCompleted
```

Artifacts esperados:

```typescript
[
  { type: 'sql-source', uri: 'git://...' },
  { type: 'db-object', uri: 'snowflake://...' },
];
```

---

## 6. Flujo `generate-only`

```text
engine.startRun(plan, { mode: 'generate-only', gitTarget })
      |
      +-- transpile(...)
      +-- writeToRepo(...)
      +-- NO apply(...)
      |
      v
RunCompleted
```

Resultado típico:

- commit o PR con SQL generado
- artifacts de tipo `sql-source`
- sin mutación del target database

---

## 7. Flujo `execute-only`

`execute-only` sirve para desplegar artefactos o definiciones ya aprobadas sin regenerar el plan.

La regla sigue siendo la misma:

- la UI dispara el run
- el engine decide cómo resolver inputs y artifacts
- el adapter aplica en el target

La UI no “reproduce SQL” localmente.

---

## 8. Shape Del Plan

El plan sigue siendo canónico y dialect-agnostic.

```typescript
type CanonicalNode = {
  kind: 'dbt:model' | 'dbt:test' | 'etl:transform-join' | string;
  data: Record<string, unknown>;
};
```

Ejemplo conceptual:

```typescript
{
  kind: 'dbt:model',
  data: {
    sql: 'SELECT ...',
    schema: 'analytics',
    name: 'orders_daily'
  }
}
```

Ese nodo no debe contener templates específicos de Snowflake, BigQuery o Postgres. Eso pertenece al adapter.

---

## 9. Package Structure

```text
packages/@dvt/codegen-core
  src/
    sql-ast/
    template-engine/
    git-ops/

packages/@dvt/adapter-snowflake
packages/@dvt/adapter-bigquery
packages/@dvt/adapter-postgres
```

### Regla de ownership

| Package             | Ownership lógico                               |
| ------------------- | ---------------------------------------------- |
| `@dvt/codegen-core` | lógica compartida dialect-agnostic             |
| `@dvt/adapter-*`    | semántica y templates dialect-specific         |
| `apps/web`          | visualización, disparo de runs, artifacts y UX |

---

## 10. Implicaciones Para El Plugin Frontend

Un plugin frontend puede:

- pedir preview de plan
- iniciar `generate-only`
- iniciar `generate-and-execute`
- mostrar artifacts
- mostrar diff de SQL generado

Un plugin frontend no puede reclamar como responsabilidad propia:

- transpilar `SELECT` a procedures/tasks/functions
- decidir sintaxis final del dialecto
- gobernar merge, push o PR
- aplicar cambios directamente en la base

Eso deja claro que un “plugin dbt frontend” no es un “adapter dialect-specific”.

### Mapeo de ownership por plugin

| Superficie                                         | Puede vivir en plugin frontend | Debe vivir en engine / adapter |
| -------------------------------------------------- | ------------------------------ | ------------------------------ |
| importar manifest y construir plan canónico        | `dbt`                          | no                             |
| iniciar run con `mode` y `targetAdapter`           | `dbt` o shell                  | no                             |
| observar timeline y estado operacional             | `monitoring`                   | no                             |
| mostrar costo o artifacts                          | `cost` / `monitoring` / `dbt`  | no                             |
| transpilar `dbt:model` a procedure/task/function   | no                             | sí                             |
| escribir archivos al repo destino                  | no                             | sí                             |
| abrir PR o push directo                            | no                             | sí                             |
| aplicar objetos en Snowflake / BigQuery / Postgres | no                             | sí                             |

Regla:

> Un plugin frontend puede pedir trabajo dialect-specific y visualizar su resultado, pero no es dueño de la semántica dialect-specific.

---

## 11. Implicaciones Para Observabilidad

Los estados de ejecución que ve la UI deben venir del runtime del run, por ejemplo:

- `generating`
- `writing_artifacts`
- `opening_pr`
- `applying`
- `completed`
- `failed`

Esos estados son parte del contrato run/engine, no de un widget frontend aislado.

La UI solo proyecta ese estado.

---

## 12. Riesgos Que Este Boundary Evita

1. **Acoplamiento UI-dialecto**
   La UI deja de depender de templates o sintaxis SQL concretas.

2. **Plan impuro**
   El plan no queda contaminado con modos de deploy o targets git.

3. **Duplicación de orquestación**
   No se crean engines distintos para generar y ejecutar la misma topología.

4. **Side effects fuera del runtime**
   Git y base de datos quedan fuera del navegador y de la capa visual.

---

## 13. Dudas De Alineación Pendientes

Estas dudas no bloquean el boundary, pero siguen abiertas:

1. si `execute-only` consume SQL previamente generado desde artifacts o vuelve a pedir resolución al adapter
2. qué granularidad tendrá el estado operacional del run para UX (`opening_pr`, `pushing`, `validating`, etc.)
3. cómo se versiona el contrato de artifacts `sql-source` y `db-object`

---

## 14. Criterio De Aceptación

Este boundary es consistente si:

1. el frontend no se presenta como generador de SQL
2. el modo dialect-specific vive en el run
3. el adapter es el único que conoce el dialecto
4. git ops y apply quedan fuera del plugin frontend
5. el plan sigue siendo canónico y dialect-agnostic

---

_Documento de diseño v1 — 2026-03-28. Revisar con engine, adapters y frontend antes de cerrar contratos de artifacts y estados operativos del run._
