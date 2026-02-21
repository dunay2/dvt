# Traceability Automation Guide

## Overview

This document defines the automation required to enforce ADR-0000.

Without automation, traceability becomes ceremonial.

---

## Required Tools

### 1. Header Validator

Script: node tools/traceability/validate-headers.js

Checks: - Presence of @baseline - ADR existence - ADR status == Accepted

---

### 2. Manifest Generator

node tools/traceability/generate-manifest.js

Outputs: - dist/traceability-manifest.json

---

### 3. Reverse ADR Coverage Check

node tools/traceability/validate-adr-coverage.js

Fails if: - Any Accepted ADR has no implementing file

---

### 4. Neo4j Publisher

Uses: https://github.com/neo4j/neo4j-javascript-driver

Publishes: (:File)-\[:BASELINED_ON\]-\>(:ADR)

---

## CI Example

```yaml
name: ADR Governance
on: [pull_request]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: node tools/traceability/validate-headers.js
      - run: node tools/traceability/generate-manifest.js
      - run: node tools/traceability/validate-adr-coverage.js
```

---

## References

- GitHub Actions: https://docs.github.com/en/actions
- Neo4j: https://neo4j.com/docs/
- Cypher: https://neo4j.com/docs/cypher-manual/current/
