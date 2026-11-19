---
id: R-20261118-CODE-MODEL-RUN-PARAMETERS
title: Parameter drift between dbt compilation and materialization
status: Mitigating
date: 2026-11-18
owners:
  - API
  - Web
  - Temporal
severity: High
probability: Medium
---

# Parameter drift between dbt compilation and materialization

A stale browser receipt or a worker that resolves variables again could write
rows using a different filter, environment or target than the one the user
compiled. The same risk applies when two selected dbt models declare the same
variable differently, since dbt exposes a single variable namespace.

The protected Preview resolves the effective executable selection, authoritative
declarations and authorized environment. Changes to a result-affecting value
or flag must affect the plan identity. At Run, compare the recorded provider
context with the admitted identity and dispatch only the matching values.
Authentication and write authorization are required by the existing endpoints.
Provider diagnostics must omit the supplied value payload and credentials.

In the editor, opening a different file, changing parameters or receiving an
outdated compile response must not enable Run for the old selection. Test the
disabled filter, active filter, conflicting declarations, unsupported parameters,
stale receipts and replay in another environment. The provider proof must
materialize different rows from the same source model at two different values.

The parameter model is for non-secret business inputs. Passing `--vars` as
structured process arguments preserves the CLI boundary. dbt still renders
Jinja into SQL, so the declaration restricts text inputs to a fixed domain
and the model author must render each value for its SQL context. Editing
trusted dbt source and project privileges remains governed by
[ADR-0060](../adr/ADR-0060-dbt-project-authoring-authority.md). The proposed
[decision](../adr/ADR-0071-typed-parameters-for-model-execution.md) and the
[validation evidence](../evidence/ED-20261118-code-model-run-parameters.md)
cover the Code editor and dbt provider.
