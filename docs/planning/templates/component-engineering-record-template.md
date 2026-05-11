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
```

Do not maintain this as a parallel hand-written component record. If a field
cannot be populated from governed sources, the DB projection must expose a
`completenessGaps` entry instead.

## Record Shape

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

## Traceability Rule

Each record should converge toward this path:

```text
Requirement -> Decision -> Design -> Contract -> Code -> Test -> Runtime evidence
```

The first DB-first version is allowed to report missing links as explicit gaps.
It must not invent requirements, tests, APIs, ADRs, or runtime evidence.
