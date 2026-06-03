---
title: Component Engineering Record Template
status: Active
owner: Architecture / Docs
last_reviewed: 2026-05-11
planning_type: template
---

# Component Engineering Record Template

Use this shape to review the DB-first Component Engineering Record projection.
The operational source is the planning query store, exposed through:

```bash
pnpm planning:db:query cer --component <component_id>
pnpm planning:db:query cer --component <component_id> --schema-version v2
```

Do not maintain this as a parallel hand-written component record. If a field
cannot be populated from governed sources, the DB projection must expose a
`completenessGaps` entry instead.

## Versioning

`schemaVersion: v1` is the compatibility projection used by existing operators.
`schemaVersion: v2` is the industrial component contract projection. It keeps
the v1 identity, ownership, subcomponent, test, evidence, and remediation fields
and adds normalized sections for related documents, domain, composition,
contracts, code surface, connections, capabilities, invariant posture,
dependency classification, runtime operation, observability, failure modes, and
cost modelling.

The v2 projection may expose sections as `indexed: false` while the governed
source remains unavailable. That is expected. The rule is to report the gap
explicitly, not to invent component facts in the query layer.

The v2 JSON record is a render projection. The relational read side is exposed
through normalized query views first:

- `planning_query_store.component_engineering_component_query`
- `planning_query_store.component_engineering_document_query`
- `planning_query_store.component_engineering_file_query`
- `planning_query_store.component_engineering_file_rollup_query`
- `planning_query_store.component_engineering_relation_query`
- `planning_query_store.component_engineering_contract_query`
- `planning_query_store.component_engineering_gap_query`

## v1 Record Shape

```yaml
recordType: componentEngineeringRecord
schemaVersion: v1
identity:
  componentId: <governance component id>
  name: <component name>
  level: <system | workspace | module | component>
  parentId: <parent component id or null>
  rootUnit: <root governance unit>
  domainUnit: <domain governance unit>
  unitPath: <governance unit lineage>
purpose:
  summary: <current component purpose>
  governanceState: <coverage-required | stable | drift>
  fowlerSignals: <indexed Fowler signals>
ownership:
  dddOwner: <DDD owner>
  canonicalRole: <canonical role>
  evidenceState: <evidence state>
subcomponents:
  - componentId: <child component id>
    name: <child component name>
publicContract:
  commandQueryRails: <component command/query rail text>
  apiStatus: <indexed | gap>
inputsOutputs:
  indexed: <true | false>
  gaps: []
invariants:
  indexed: <true | false>
  gaps: []
stateModel:
  indexed: <true | false>
  gaps: []
errorModel:
  indexed: <true | false>
  gaps: []
securityRules:
  indexed: <true | false>
  gaps: []
dependencies:
  owns: []
  excludes: []
configuration:
  indexed: <true | false>
  gaps: []
events:
  indexed: <true | false>
  gaps: []
persistenceImpact:
  indexed: <true | false>
  gaps: []
observability:
  indexed: <true | false>
  gaps: []
tests:
  testComponents: []
  testFiles: []
  testFileCount: 0
  expectedValidation: []
adrsLinked: []
requirementsLinked: []
runtimeEvidence: []
lifecycle:
  status: <component status>
  isLegacy: <true | false>
  isDrift: <true | false>
  childrenRequired: <true | false>
governingDocuments: []
coverage: []
ownedFiles: []
remediation: []
completenessGaps: []
```

## v2 Industrial Record Additions

```yaml
recordType: componentEngineeringRecord
schemaVersion: v2
relatedDocuments:
  governing: []
  adrs: []
  requirements: []
  runtimeEvidence: []
domain:
  rootUnit: <root governance unit>
  domainUnit: <domain governance unit>
  unitPath: []
  dddOwner: <DDD owner>
  canonicalRole: <canonical role>
composition:
  parentComponentId: <parent component id or null>
  children: []
  childComponentIds: []
  level: <system | workspace | module | component>
contracts:
  indexed: <true | false>
  provides: []
  consumes: []
  eventsEmitted: []
  eventsConsumed: []
  apiSurface: <indexed API or command/query rail reference>
  gaps: []
codeSurface:
  indexed: <true | false>
  ownedFiles: []
  testFiles: []
  interfaces: []
  methods: []
  gaps: []
connections:
  indexed: <true | false>
  parentComponentId: <parent component id or null>
  childComponentIds: []
  commandQueryRails: <indexed command/query rail reference>
  gaps: []
capabilities:
  indexed: <true | false>
  items: []
  gaps: []
invariants:
  indexed: <true | false>
  architecture: []
  gaps: []
dependencies:
  indexed: <true | false>
  runtime: []
  build: []
  external: []
  forbidden: []
  ownedPaths: []
  excludedPaths: []
  gaps: []
configuration:
  indexed: <true | false>
  required: []
  optional: []
  secrets: []
  gaps: []
runtime:
  indexed: <true | false>
  deployable: <true | false | null>
  runtimeType: <node | browser | worker | serverless | database | null>
  stateless: <true | false | null>
  statefulResources: []
  scalingModel: <horizontal | vertical | singleton | null>
  gaps: []
observability:
  indexed: <true | false>
  logs: []
  metrics: []
  traces: []
  gaps: []
failureModes:
  indexed: <true | false>
  modes: []
  recovery: []
  gaps: []
costModel:
  indexed: <true | false>
  cpuWeight: <number | null>
  memoryMb: <number | null>
  ioWeight: <number | null>
  networkWeight: <number | null>
  estimatedCostPerRun: <number | null>
  gaps: []
completenessGaps:
  - missing_contract_index
  - missing_capability_index
  - missing_dependency_classification_index
  - missing_runtime_profile_index
  - missing_failure_mode_index
  - missing_cost_model_index
  - missing_code_symbol_index
  - missing_component_connection_index
```

## Traceability Rule

Each record should converge toward this path:

```text
Requirement -> Decision -> Design -> Contract -> Code -> Test -> Runtime evidence
```

The first DB-first version is allowed to report missing links as explicit gaps.
It must not invent requirements, tests, APIs, ADRs, or runtime evidence.
