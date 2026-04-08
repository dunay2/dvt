---
title: Propuesta técnica: CLI AI-first para DVT
status: Draft
owner: docs
last_reviewed: 2026-04-03
planning_type: proposal
---

# Propuesta técnica: CLI AI-first para DVT

**Fecha:** 2026-04-03  
**Estado:** propuesta v1  
**Ámbito:** interfaz máquina-a-máquina para que una IA pueda invocar capacidades de DVT de forma segura, estable y observable.

---

## 1. Resumen ejecutivo

DVT necesita una **superficie de automatización oficial** para agentes IA, CI y usuarios avanzados. Si hoy la única integración real pasa por UI, scripts internos o APIs no estabilizadas, el resultado es frágil: acoplamiento alto, salidas no deterministas, falta de auditoría y más riesgo de uso indebido.

La propuesta es construir **`dvtctl`**, un **CLI versionado, no interactivo y con salida estructurada** que se apoye en una **capa de servicios de aplicación** dentro de DVT. Ese CLI sería la primera interfaz estable para IA.

La decisión clave es esta:

> **Primero estabilizar el contrato. Después elegir transportes adicionales.**

En otras palabras:

- **Sí** a un CLI serio como interfaz oficial.
- **No** a exponer a la IA shell libre o automatización de UI como mecanismo principal.
- **No** a empezar por un MCP server puro si todavía no existe un contrato de operaciones estable en DVT.
- **Sí** a dejar preparado un **adaptador MCP** posterior, apoyado en el mismo contrato.

La recomendación concreta es:

1. **Crear una capa interna de servicios de aplicación** en DVT.
2. **Publicar `dvtctl`** como interfaz estable sobre esa capa.
3. **Exponer modo JSON** para agentes y CI.
4. **Añadir políticas, auditoría y modelo de jobs** desde el inicio.
5. **Opcionalmente** montar más adelante un adaptador MCP/HTTP sobre la misma base.

---

## 2. Supuestos de partida

Esta propuesta asume lo siguiente:

- **DVT es vuestra herramienta interna**; no estoy basando el diseño en ningún producto público con el mismo nombre.
- **No existe hoy un CLI oficial y estable** para uso por agentes IA.
- Existe, o es viable crear, una **capa interna reutilizable** con las operaciones de negocio que hoy usa la UI o la lógica de backend.
- El objetivo no es “darle terminal a la IA”, sino **permitirle ejecutar un conjunto explícito de capacidades** con garantías de seguridad y trazabilidad.

Si alguno de estos supuestos es falso, la propuesta sigue siendo válida, pero cambia el punto de arranque.

---

## 3. Problema actual (“ahora”)

### 3.1 Síntoma

DVT no parece tener una interfaz CLI oficial para automatización agentic.

### 3.2 Consecuencia práctica

Sin CLI estable, una IA suele caer en uno de estos patrones:

1. **Automatización de UI**: frágil, lenta, difícil de testear y muy sensible a cambios visuales.
2. **Shell scripts ad hoc**: acoplan la IA a detalles de implementación, quoting, rutas, logs y estado del entorno.
3. **APIs internas no soportadas**: rápido al principio, caro de mantener después.
4. **Acceso demasiado amplio**: más superficie de error, más riesgo de acciones no deseadas.

### 3.3 Carencias típicas del estado actual

- No hay **contrato público** de operaciones.
- No hay **nombres estables** para comandos/capacidades.
- No hay **salida estructurada** consistente.
- No hay **códigos de error tipados**.
- No hay **modelo de permisos** pensado para agentes.
- No hay **auditoría** por llamada.
- No hay **idempotencia** o semántica clara para reintentos.
- No hay **modelo unificado de operaciones largas**.

### 3.4 Resultado de negocio

La integración con IA queda bloqueada o, peor, se vuelve posible pero **no confiable**.

---

## 4. Objetivos

### 4.1 Objetivos funcionales

- Permitir que una IA invoque capacidades de DVT mediante un **CLI oficial**.
- Hacer que el CLI sirva también a **CI/CD** y usuarios avanzados.
- Ofrecer **salida JSON estable** para automatización.
- Exponer un conjunto de operaciones con **semántica clara** y **nombres duraderos**.

### 4.2 Objetivos no funcionales

- **Determinismo** razonable en entradas/salidas.
- **Observabilidad** por ejecución.
- **Seguridad por defecto** y privilegio mínimo.
- **Compatibilidad evolutiva** mediante versionado.
- **Testabilidad** y reproducibilidad.
- **Transporte desacoplado**: CLI primero, otros adaptadores después.

### 4.3 No objetivos

- No convertir DVT en un “chatbot”.
- No exponer toda la superficie interna desde el día uno.
- No empezar por un runtime distribuido complejo si no hay todavía contrato estable.
- No diseñar el sistema alrededor del shell como API permanente.

---

## 5. Decisión recomendada

### 5.1 Decisión

**Construir `dvtctl` como CLI oficial, apoyado sobre una capa de servicios de aplicación de DVT, con modo JSON para agentes y CI.**

### 5.2 Decisión complementaria

**No exponer a la IA shell libre como interfaz principal.** En su lugar, exponer un conjunto reducido y explícito de operaciones soportadas.

### 5.3 Decisión de evolución

**Dejar preparado un adaptador MCP posterior**, pero no convertir MCP en el primer entregable si el contrato funcional todavía no existe.

---

## 6. Rationale

### 6.1 Por qué un CLI y no UI automation

La UI es una interfaz para humanos. Un agente necesita una interfaz:

- estable,
- documentable,
- no ambigua,
- testeable,
- y con semántica de errores.

Un CLI oficial resuelve eso mucho mejor que automatizar pantallas.

### 6.2 Por qué CLI antes que MCP

MCP es un buen transporte y un buen protocolo para integrar herramientas con agentes, pero **no reemplaza el trabajo de diseño de capacidades**. Si hoy DVT no tiene operaciones estables, un servidor MCP sólo encapsularía inestabilidad con otro protocolo.

La secuencia correcta es:

1. definir operaciones soportadas,
2. estabilizar inputs/outputs,
3. añadir seguridad y observabilidad,
4. exponerlas por CLI,
5. y luego, si compensa, añadir un adaptador MCP/HTTP.

### 6.3 Por qué una capa de servicios de aplicación

Si el CLI llama directamente a lógica dispersa de UI o a clases internas con semántica inconsistente, se volverá inmantenible. La capa de servicios de aplicación introduce:

- orquestación coherente,
- normalización de errores,
- validación centralizada,
- políticas de acceso,
- y un sitio claro donde añadir auditoría, jobs y métricas.

### 6.4 Por qué modo JSON

Una IA trabaja mejor con salidas:

- tipadas,
- compactas,
- estables,
- y sin necesidad de parsear texto libre.

El texto humano puede seguir existiendo, pero como presentación secundaria.

### 6.5 Por qué limitar capacidades

Para agentes, **menos superficie y más claridad** suele funcionar mejor que cien comandos solapados. Además, limitar permisos y operaciones reduce riesgo de abuso, prompt injection indirecta y errores de ejecución.

---

## 7. Alternativas consideradas y trade-offs

### Opción A — Wrapper rápido sobre scripts/UI

**Descripción**  
Montar un binario o script que simplemente llame a scripts existentes o automatice la UI.

**Ventajas**

- Arranque rápido.
- Poco coste inicial.
- Permite una demo temprana.

**Desventajas**

- Alta fragilidad.
- Acoplamiento a implementación interna.
- Salidas inconsistentes.
- Difícil de versionar.
- Seguridad pobre.
- Deuda técnica casi garantizada.

**Veredicto**  
Útil para prototipos internos muy breves; **no recomendable como interfaz oficial**.

---

### Opción B — CLI nativo sobre capa de servicios (recomendada)

**Descripción**  
Crear `dvtctl` apoyado en una capa de servicios de aplicación estable y reusable.

**Ventajas**

- Contrato explícito.
- Salida estructurada.
- Evolución controlada.
- Seguridad y auditoría centralizadas.
- Reutilizable por CLI, tests, CI y futuros adaptadores.

**Desventajas**

- Requiere disciplina de diseño.
- Tiene un coste inicial mayor que el wrapper rápido.
- Obliga a seleccionar bien qué capacidades se publican primero.

**Veredicto**  
**La mejor opción** si la intención es que DVT pueda ser operado de forma fiable por agentes.

---

### Opción C — MCP server directo sin CLI previo

**Descripción**  
Exponer DVT directamente como servidor MCP.

**Ventajas**

- Integración natural con algunos hosts de IA.
- Descubrimiento de herramientas y schemas.
- Buen encaje si ya hay un modelo de operaciones bien diseñado.

**Desventajas**

- Si no existe contrato estable, se traslada el problema a otro plano.
- Más complejidad operativa desde el inicio.
- Peor reutilización para CI o usuarios humanos si no hay también CLI.

**Veredicto**  
Buena segunda fase; **no la primera** si DVT todavía carece de interfaz estable.

---

## 8. Propuesta de arquitectura

### 8.1 Arquitectura lógica

```text
+-------------------+       +------------------+
| IA / CI / Usuario | ----> |     dvtctl       |
| avanzado          |       | CLI + JSON mode  |
+-------------------+       +------------------+
                                      |
                                      v
                           +----------------------+
                           | DVT Application       |
                           | Services              |
                           | - validación          |
                           | - políticas           |
                           | - auditoría           |
                           | - jobs                |
                           | - normalización error |
                           +----------------------+
                                      |
                                      v
                           +----------------------+
                           | DVT Core / Domain /   |
                           | backends existentes   |
                           +----------------------+
```

### 8.2 Evolución prevista

```text
                      +------------------+
                      |  MCP Adapter     |
                      |  (opcional)      |
                      +------------------+
                               |
+-------------------+          v          +------------------+
| IA host MCP       | ----> Application Services <---- dvtctl |
+-------------------+                     +------------------+
```

La idea central es **un solo contrato funcional** y **varios adaptadores**. No múltiples implementaciones duplicadas.

---

## 9. Cómo debería verse el CLI

### 9.1 Principios de diseño

- **No interactivo por defecto**.
- **JSON soportado en todos los comandos relevantes**.
- **Nombres explícitos** y sin solapamientos innecesarios.
- **Errores tipados**.
- **Paginación/filtros** para resultados grandes.
- **Dry-run** en operaciones de cambio donde tenga sentido.
- **Request ID / trace ID** en cada ejecución.
- **Salidas acotadas**: devolver lo necesario, no volcados masivos.
- **Compatibilidad** mediante `apiVersion` y versionado de schema.

### 9.2 Convención de comandos

Propongo una taxonomía por dominios funcionales:

```text
dvtctl <dominio> <acción> [argumentos]
```

Ejemplos:

```bash
dvtctl project open --project P123 --json
dvtctl query search --text "timeout on node 17" --limit 20 --json
dvtctl object inspect --id OBJ-8821 --json
dvtctl diag explain --diag D-204 --json
dvtctl run start --recipe smoke --target T42 --json
dvtctl job status --job J-90012 --json
dvtctl artifact export --job J-90012 --format json --output out/report.json
```

### 9.3 Modo JSON para agentes

Además del modo de argumentos, conviene añadir un modo “invoke” por `stdin`, más robusto para agentes:

```bash
echo '{
  "apiVersion": "1.0",
  "op": "diag.explain",
  "args": {
    "diag": "D-204"
  }
}' | dvtctl invoke --json
```

Esto evita problemas de quoting y hace más fácil encapsular el CLI como herramienta para un agente.

---

## 10. Contrato propuesto

### 10.1 Envelope de respuesta

```json
{
  "ok": true,
  "apiVersion": "1.0",
  "requestId": "a5d69a88-5d64-4cf7-9f4d-4698d6b32f7a",
  "durationMs": 83,
  "data": {},
  "warnings": []
}
```

### 10.2 Envelope de error

```json
{
  "ok": false,
  "apiVersion": "1.0",
  "requestId": "a5d69a88-5d64-4cf7-9f4d-4698d6b32f7a",
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project P123 does not exist",
    "retryable": false,
    "details": {
      "project": "P123"
    }
  }
}
```

### 10.3 Códigos de salida del proceso

Sugerencia:

| Exit code | Significado                            |
| --------- | -------------------------------------- |
| 0         | Éxito                                  |
| 2         | Argumentos inválidos                   |
| 3         | Error de validación de dominio         |
| 4         | No autorizado / bloqueado por política |
| 5         | Recurso no encontrado                  |
| 6         | Conflicto / estado inválido            |
| 7         | Timeout / dependencia no disponible    |
| 10        | Error interno                          |

|

### 10.4 Modelo de operaciones largas

Cuando una operación tarde más de lo razonable para modo síncrono:

- `dvtctl run start ...` devuelve `jobId`
- `dvtctl job status --job <id>` devuelve estado
- `dvtctl job logs --job <id>` devuelve logs paginados/filtrados
- `dvtctl job cancel --job <id>` cancela si aplica

Esto evita timeouts absurdos y da una semántica limpia a CI y agentes.

---

## 11. Seguridad y gobernanza

### 11.1 Principio general

El agente **no** debe tener shell ilimitado si lo que necesita realmente es una lista concreta de capacidades DVT.

### 11.2 Medidas mínimas

- **Lista explícita de operaciones soportadas**.
- **Separación clara entre lectura y mutación**.
- **Confirmación reforzada** para operaciones destructivas.
- **Política por perfil**: por ejemplo `human`, `ci`, `agent-safe`, `admin`.
- **Auditoría**: quién llamó, qué operación, con qué parámetros relevantes, cuándo, resultado.
- **Redacción/filtrado** de datos sensibles en outputs y logs.
- **Allowlist** de recursos/ámbitos cuando tenga sentido.

### 11.3 Semántica sugerida para mutaciones

Ejemplo:

- modo por defecto: lectura permitida;
- mutaciones requieren `--apply` o `approved: true` en JSON;
- algunas mutaciones exigen además `approvalToken` o política `agent-safe` que las habilite.

### 11.4 Por qué importa

Con agentes, el problema no es sólo “qué sabe hacer”, sino **qué puede invocar** y **con qué permisos**. La interfaz debe diseñarse para minimizar privilegios y acotar el radio de daño.

---

## 12. Observabilidad

Cada invocación debería producir, como mínimo:

- `requestId`
- `callerType` (`human`, `ci`, `agent`)
- operación
- duración
- resultado
- error tipado si falla
- métricas de uso

Y cada job largo:

- `jobId`
- timestamps
- progreso
- estado
- artefactos generados

Sin observabilidad, el CLI no será operable a escala.

---

## 13. “Ahora” vs “cómo quedaría”

| Dimensión          | Ahora                               | Cómo quedaría                        |
| ------------------ | ----------------------------------- | ------------------------------------ |
| Punto de entrada   | UI, scripts o integración implícita | `dvtctl` oficial                     |
| Contrato           | implícito / no estable              | explícito y versionado               |
| Consumo por IA     | frágil                              | soportado                            |
| Formato de salida  | texto libre / heterogéneo           | JSON estable + texto humano opcional |
| Gestión de errores | logs / excepciones internas         | códigos tipados + exit codes         |
| Operaciones largas | manejo ad hoc                       | modelo de `job`                      |
| Seguridad          | dependiente del entorno             | políticas y perfiles                 |
| Auditoría          | parcial o inexistente               | sistemática por invocación           |
| Evolución a MCP    | difícil                             | directa, sobre el mismo contrato     |

---

## 14. MVP recomendado

### 14.1 Qué sí meter en el MVP

- binario `dvtctl`
- `--json`
- modo `invoke` por `stdin`
- 5–10 operaciones **read-only** de alto valor
- errores tipados
- `requestId`
- help y documentación por comando
- tests de contrato

### 14.2 Qué dejar fuera del MVP

- todas las mutaciones complejas
- integración remota avanzada
- capa MCP completa
- comandos duplicados u “omniscientes”

### 14.3 Comandos iniciales sugeridos

Ajustando nombres al dominio real de DVT, el MVP debería cubrir categorías como:

- `project.*`
- `query.*`
- `object.*`
- `diag.*`
- `run/job.*`
- `artifact.*`

La regla es simple: empezar por operaciones que **den contexto útil** a la IA con el menor riesgo posible.

---

## 15. Cómo evolucionaría después del MVP

### Fase 1 — Contrato estable y lectura

- servicios de aplicación
- CLI
- JSON
- auditoría mínima
- catálogo corto de operaciones

### Fase 2 — Mutaciones controladas

- `--apply`
- perfiles de política
- confirmaciones explícitas
- dry-run

### Fase 3 — Jobs y artefactos

- asíncronos
- progreso
- cancelación
- exportación de resultados

### Fase 4 — Adaptador MCP

- exposición de las mismas capacidades por MCP
- descubrimiento de herramientas
- integración con hosts IA que soporten MCP

### Fase 5 — SDKs o HTTP si realmente aportan valor

Sólo si existe una necesidad clara y sostenida.

---

## 16. Riesgos y mitigaciones

### Riesgo 1 — Publicar demasiadas operaciones demasiado pronto

**Impacto:** interfaz confusa, mala selección por parte de la IA, más superficie de error.  
**Mitigación:** empezar con catálogo corto, bien nombrado y con semántica muy clara.

### Riesgo 2 — Acoplar el CLI a detalles internos

**Impacto:** cada refactor rompe la automatización.  
**Mitigación:** capa de servicios de aplicación y tests de contrato.

### Riesgo 3 — Salidas enormes o poco útiles

**Impacto:** peor coste de contexto, peor calidad de razonamiento del agente.  
**Mitigación:** filtros, límites, paginación y comandos de alto nivel que devuelvan sólo lo relevante.

### Riesgo 4 — Seguridad insuficiente

**Impacto:** acciones no deseadas o fuga de información.  
**Mitigación:** privilegio mínimo, perfiles, auditoría, confirmación y allowlists.

### Riesgo 5 — Intentar resolver todo con MCP desde el día uno

**Impacto:** se añade complejidad sin haber estabilizado el núcleo.  
**Mitigación:** CLI primero, adaptadores después.

---

## 17. Recomendación final

La decisión correcta no es “ponerle shell a la IA”. La decisión correcta es:

> **darle a la IA una interfaz pequeña, estable, observable y gobernable sobre DVT.**

La forma más sólida de hacerlo es:

- **capa de servicios de aplicación** dentro de DVT,
- **`dvtctl`** como interfaz oficial,
- **JSON estable** para automatización,
- **jobs, políticas y auditoría** desde el principio,
- y **MCP como adaptador posterior**, no como sustituto del contrato.

### Recomendación ejecutiva en una línea

**Implementar `dvtctl` como CLI AI-first sobre una capa de servicios de aplicación, con salida JSON, permisos mínimos y evolución posterior a MCP.**

---

## 18. Apéndice: ejemplo de experiencia final

### 18.1 Desde un agente

```bash
echo '{
  "apiVersion": "1.0",
  "op": "query.search",
  "args": {
    "text": "timeout on node 17",
    "limit": 10
  }
}' | dvtctl invoke --json
```

### 18.2 Desde CI

```bash
dvtctl run start --recipe smoke --target nightly --json > job.json
dvtctl job status --job J-90012 --json
```

### 18.3 Desde una persona

```bash
dvtctl diag explain --diag D-204
```

Misma lógica. Mismo contrato. Distintos consumidores.

---

## 19. Referencias externas utilizadas para el rationale

Estas referencias **no definen DVT**; se usan para justificar principios de diseño de herramientas para agentes, versionado de capacidades, transportes y seguridad.

1. Model Context Protocol Specification  
   https://modelcontextprotocol.io/specification/2025-11-25

2. Model Context Protocol — Architecture overview  
   https://modelcontextprotocol.io/docs/learn/architecture

3. Model Context Protocol — Tools  
   https://modelcontextprotocol.io/specification/draft/server/tools

4. Model Context Protocol — Authorization  
   https://modelcontextprotocol.io/docs/tutorials/security/authorization

5. Anthropic Engineering — Writing effective tools for AI agents  
   https://www.anthropic.com/engineering/writing-tools-for-agents

6. Anthropic Engineering — Harness design for long-running application development  
   https://www.anthropic.com/engineering/harness-design-long-running-apps

7. Progent: Programmable Privilege Control for LLM Agents  
   https://arxiv.org/abs/2504.11703

8. AgenTRIM: Tool Risk Mitigation for Agentic AI  
   https://arxiv.org/abs/2601.12449
