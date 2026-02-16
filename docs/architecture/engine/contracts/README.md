# Engine Contracts Registry

Source path: `docs/architecture/engine/contracts`

This file tracks:

- current contract artifacts in repository,
- lifecycle state for each one,
- missing contracts that must be developed for US-1.1 (#133).

---

## 1) Current contracts in repository

| Area         | Contract                                                                 | Version | Lifecycle | Type      | Path                                                                                       |
| ------------ | ------------------------------------------------------------------------ | ------- | --------- | --------- | ------------------------------------------------------------------------------------------ |
| engine       | [IWorkflowEngine (baseline)](./engine/IWorkflowEngine.v1.md)             | v1      | DRAFT     | Core      | [engine/IWorkflowEngine.v1.md](./engine/IWorkflowEngine.v1.md)                             |
| engine       | [ExecutionSemantics](./engine/ExecutionSemantics.v1.md)                  | v1      | DRAFT     | Core      | [engine/ExecutionSemantics.v1.md](./engine/ExecutionSemantics.v1.md)                       |
| engine       | [RunEvents](./engine/RunEvents.v1.md)                                    | v1      | DRAFT     | Core      | [engine/RunEvents.v1.md](./engine/RunEvents.v1.md)                                         |
| engine       | [SignalsAndAuth](./engine/SignalsAndAuth.v1.md)                          | v1      | DRAFT     | Core      | [engine/SignalsAndAuth.v1.md](./engine/SignalsAndAuth.v1.md)                               |
| engine       | [PlanIntegrityAndPause](./engine/PlanIntegrityAndPause.v1.md)            | v1      | DRAFT     | Core      | [engine/PlanIntegrityAndPause.v1.md](./engine/PlanIntegrityAndPause.v1.md)                 |
| engine       | [GlossaryContract](./engine/GlossaryContract.v1.md)                      | v1      | DRAFT     | Core      | [engine/GlossaryContract.v1.md](./engine/GlossaryContract.v1.md)                           |
| engine       | [RunEventCatalog (alias)](./engine/RunEventCatalog.v1.md)                | v1      | DRAFT     | Alias     | [engine/RunEventCatalog.v1.md](./engine/RunEventCatalog.v1.md)                             |
| state-store  | [State Store Contract](./state-store/README.md)                          | v1      | DRAFT     | Core      | [state-store/README.md](./state-store/README.md)                                           |
| security     | [IAuthorization](./security/IAuthorization.v1.md)                        | v1      | DRAFT     | Core      | [security/IAuthorization.v1.md](./security/IAuthorization.v1.md)                           |
| security     | [AuditLog](./security/AuditLog.v1.md)                                    | v1      | DRAFT     | Core      | [security/AuditLog.v1.md](./security/AuditLog.v1.md)                                       |
| extensions   | [PluginSandbox](./extensions/PluginSandbox.v1.md)                        | v1      | DRAFT     | Extension | [extensions/PluginSandbox.v1.md](./extensions/PluginSandbox.v1.md)                         |
| capabilities | [Capabilities schema](./capabilities/capabilities.schema.json)           | v1      | DRAFT     | Schema    | [capabilities/capabilities.schema.json](./capabilities/capabilities.schema.json)           |
| capabilities | [ValidationReport schema](./capabilities/validation-report.schema.json)  | v1      | DRAFT     | Schema    | [capabilities/validation-report.schema.json](./capabilities/validation-report.schema.json) |
| capabilities | [Adapter capabilities matrix](./capabilities/adapters.capabilities.json) | v1      | DRAFT     | Matrix    | [capabilities/adapters.capabilities.json](./capabilities/adapters.capabilities.json)       |

---

## 1.1) Historical / reference contracts

| Area   | Contract                                                                | Version | Lifecycle | Type      | Path                                                                               |
| ------ | ----------------------------------------------------------------------- | ------- | --------- | --------- | ---------------------------------------------------------------------------------- |
| engine | [IWorkflowEngine (reference)](./engine/IWorkflowEngine.reference.v1.md) | v1      | DRAFT     | Reference | [engine/IWorkflowEngine.reference.v1.md](./engine/IWorkflowEngine.reference.v1.md) |

---

## 2) Contracts to develop (US-1.1 scope)

These contracts are required to complete the domain base-contract track and avoid ambiguity in implementation.

| Contract to develop                      | Target version | Lifecycle | Why it is needed                                                              | Tracking |
| ---------------------------------------- | -------------- | --------- | ----------------------------------------------------------------------------- | -------- |
| IRunStateStore (domain baseline)         | v1             | DRAFT     | Define minimal storage invariants and append/query guarantees for v1 baseline | #217     |
| IProviderAdapter (domain baseline)       | v1             | DRAFT     | Define provider boundary, responsibilities, and error/correlation rules       | #218     |
| LogicalGraph (GCM) JSON Schema           | v1             | DRAFT     | Canonical domain graph shape for ingestion/planning compatibility             | #219     |
| CanvasState JSON Schema                  | v1             | DRAFT     | Stable workspace/canvas model for deterministic reads/writes                  | #220     |
| ProvenanceEvent JSON Schema              | v1             | DRAFT     | Auditable provenance envelope and minimal event semantics                     | #221     |
| schemaVersion policy (contracts/schemas) | v1             | DRAFT     | Explicit compatibility/rejection rules to prevent version drift               | #222     |
| Validation + PR closure bundle           | v1             | DRAFT     | Evidence, checks, and traceable closure for US-1.1                            | #223     |
| Existing contracts consistency review    | v1             | DRAFT     | Identify drift, broken links, status/version mismatches                       | #224     |

---

## 3) Lifecycle definitions

- **DRAFT**: Under development; not for production enforcement.
- **ACTIVE**: Current normative baseline; MUST be implemented/used.
- **DEPRECATED**: Still supported; new implementations SHOULD migrate.
- **SUNSET**: Scheduled retirement date defined.
- **RETIRED**: No longer supported.

---

## 4) Compatibility policy

- `ACTIVE` contracts are backward-compatible within the same major version.
- Breaking changes require a version bump and changelog entry.
- New consumers MUST integrate at least one `ACTIVE` version.
- `DRAFT` contracts are not compatibility commitments.

---

## 5) Notes

- The current working baseline for US-1.1 is [IWorkflowEngine (baseline)](./engine/IWorkflowEngine.v1.md).
- Historical context is retained in [IWorkflowEngine (reference)](./engine/IWorkflowEngine.reference.v1.md).
- This registry is the discoverability entrypoint; detailed normative rules remain in each contract file.

---

## 6) Authoring template

- Use the normalized template for any new contract: [CONTRACT_TEMPLATE.v1.md](./CONTRACT_TEMPLATE.v1.md).
