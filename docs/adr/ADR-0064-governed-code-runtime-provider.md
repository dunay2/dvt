---
title: ADR-0064 - Governed code-runtime provider boundary
status: Accepted
date: 2026-08-08
owners:
  - architecture
  - contracts
  - temporal-runtime
  - web
arc_level: ARC-2
---

# ADR-0064 - Governed Code-Runtime Provider Boundary

## Status

Accepted.

## Context

DVT needs code-bearing graph nodes for Python and later R and SQL. The system
already has four boundaries that must remain authoritative:

1. Canvas Graph Draft owns authored graph meaning.
2. Planner owns deterministic immutable executable plans.
3. The engine and Temporal adapter own generic orchestration and run state.
4. Independently composed plugin profiles own provider-specific execution.

Code execution can easily violate all four. Executing in the browser or API
process bypasses stored-plan authority. Reusing one notebook kernel introduces
variables and package state that are absent from the graph. Putting language
switches in the generic dispatcher makes Temporal core a plugin owner. Treating
`python -I`, a container, WebAssembly, or a kernel protocol as a complete
sandbox creates a false security claim.

The existing SQL-first transformation contract is closed to a governed
`source -> sql_transform -> sink` shape. It cannot become a generic language
contract without changing its meaning and invalidating its architecture guards.

## Decision

DVT introduces a provider-neutral code-runtime boundary and delivers Python as
the first concrete plugin.

### Authoring

- A language plugin owns its node kind, Canvas kind, fields, connection policy,
  and graph projection.
- The existing Inspector command seam applies the node draft to Graph Draft.
- Language-specific Canvas execution sources use their own versioned source
  family. Python does not extend `transformation-sql-first-v1`.

### Planning

- Every executable code node becomes a canonical versioned step kind with a
  strict schema and explicit runtime capability.
- The plan contains source, explicit bounded input, an opaque runtime reference,
  scope, protocol version, and resource/output limits.
- Plans do not contain a live kernel/session/process identifier.

### Runtime

- Generic Temporal dispatch remains plugin-neutral.
- A language plugin owns a runtime port, schema admission, result mapping, and
  stable refusal vocabulary.
- Runtime providers are replaceable adapters. Native processes, Jupyter kernels,
  Enterprise Gateway, and sandbox jobs are infrastructure choices rather than
  domain semantics.
- Every production execution begins from clean runtime state. The Python v1
  adapter uses one fresh process per step.
- The real language parser/compiler is authoritative. Editor parsers are
  advisory only.

### Data and evidence

- Inputs and outputs are explicit, versioned, and bounded.
- V1 Python accepts JSON input and requires a JSON-serializable `result`.
- Raw source, input, stdout, stderr, secrets, and provider exception strings are
  not canonical evidence.
- Dynamic downstream data binding requires a later immutable artifact-reference
  contract; hidden kernel variables are forbidden.

### Security

- Interpreter flags, WebAssembly, containers, and kernel protocols are not by
  themselves security boundaries.
- Enabling arbitrary code requires a dedicated workload boundary with non-root
  identity, read-only filesystem, dropped capabilities, resource limits, and
  deny-by-default networking appropriate to the trust model.
- The Python native-process profile is disabled by default and must not be
  enabled in a general-purpose worker deployment for untrusted tenants.

## Consequences

Positive:

- Python, R, and SQL can share lifecycle concepts without sharing incorrect
  execution semantics.
- SQL remains owned by the target database engine.
- The Web and API do not become code executors.
- Stored plans, capability admission, cancellation, retries, and run evidence
  remain on existing rails.
- A stronger sandbox or Enterprise Gateway can replace the first Python adapter
  without changing the plan or plugin contract.

Costs:

- Each language still needs a concrete schema, adapter, diagnostics mapper, and
  operational image/provider policy.
- Fresh runtime startup costs more than a shared notebook session.
- The first Python slice cannot silently pass arbitrary results between nodes;
  artifact binding is an additional contract.
- Production untrusted-code support requires deployment work beyond application
  code.

## Rejected Alternatives

### Execute code in the browser

Rejected as production authority. Pyodide and webR remain useful advisory
surfaces, but browser execution has a different package, interrupt, resource,
and trust boundary from the governed worker runtime.

### Execute code in the API process

Rejected because it co-locates untrusted workloads with authentication,
planning, and transport responsibilities and bypasses Temporal cancellation and
stored-plan dispatch.

### Use one persistent kernel per Canvas or user

Rejected because cross-cell variables, imports, current directory, random state,
and package mutation become hidden graph dependencies. A future interactive
notebook experience may exist, but it cannot be the workflow execution
semantics.

### Make the existing SQL transform node language-selectable

Rejected because the SQL-first graph, workspace artifacts, target PostgreSQL
semantics, and tests are one cohesive bounded context. A language switch would
create divergent change and make one node own unrelated runtime policies.

### Treat SQLGlot/tree-sitter as authoritative execution validation

Rejected. They can improve editor diagnostics, but database dialect, schema,
permissions, extensions, and runtime behavior remain owned by the actual target
engine.

## Validation

- architecture guards reject language-process imports outside worker adapters;
- generic Temporal dispatcher tests prove no Python kind branch;
- contracts reject unbounded or scope-divergent code steps;
- fresh-process tests prove no cross-step state;
- compiler tests prove syntax failure occurs before user execution;
- output/event tests prove raw source, input, stdout, stderr, and secrets are
  absent;
- existing SQL-first and dbt plugin behavior remains unchanged;
- a dedicated live proof is required before enabling the profile outside tests.

## References

- [Python `compile`](https://docs.python.org/3/library/functions.html#compile)
- [Python isolated mode](https://docs.python.org/3/using/cmdline.html#cmdoption-I)
- [Jupyter messaging](https://jupyter-client.readthedocs.io/en/stable/messaging.html)
- [Jupyter Enterprise Gateway](https://jupyter-enterprise-gateway.readthedocs.io/en/latest/)
- [Kubernetes security contexts](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [Kubernetes network policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Apache Arrow C data interface](https://arrow.apache.org/docs/format/CDataInterface.html)

## Related Decisions

- [ADR-0003](./ADR-0003-execution-model.md)
- [ADR-0035](./ADR-0035-planner-public-contract-evolution-protocol.md)
- [ADR-0057](./ADR-0057-temporal-step-activity-routing-by-capability.md)
- [ADR-0060](./ADR-0060-dbt-project-authoring-authority.md)
