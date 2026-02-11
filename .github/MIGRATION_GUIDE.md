# Migration Guide: WORKFLOW_ENGINE.md → Modular Architecture

**Effective Date**: 2026-02-11 (merge date)  
**Deprecation Period**: 90 days  
**WORKFLOW_ENGINE.md Removal Date**: 2026-05-12  
**Target Audience**: SDK implementers, Plan authors, SREs, Documentation maintainers

---

## 📋 What Changed?

### High-Level Changes

1. **WORKFLOW_ENGINE.md deprecated** (3,227 lines) → use [INDEX.md](../docs/architecture/engine/INDEX.md) navigation hub
2. **Separation of concerns**: Core contracts (agnostic) vs adapters (backend-specific)
3. **New storage layer**: State Store Contract + Snowflake/Postgres adapters
4. **New engine policies**: Temporal-specific policies extracted to separate doc
5. **CI/CD gates**: 4 automated quality gates (Markdown, TypeScript, links, contract structure)

### Semantic Changes

**NONE**. All changes are structural only. Existing implementations remain compatible.

---

## Link Migration Table

### Core Contracts

| Old Link (DEPRECATED)                  | New Link                                                                                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WORKFLOW_ENGINE.md#interface`         | [IWorkflowEngine.v1.md](../docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md)                                                         |
| `WORKFLOW_ENGINE.md#state-store-model` | [ExecutionSemantics.v1.md § 1](../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md)                                               |
| `WORKFLOW_ENGINE.md#events`            | [ExecutionSemantics.v1.md § 1.2](../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md#12-append-only-event-model)                  |
| `WORKFLOW_ENGINE.md#dual-attempt`      | [ExecutionSemantics.v1.md § 1.3](../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md#13-dual-attempt-strategy-critical-invariant) |
| `WORKFLOW_ENGINE.md#snapshots`         | [ExecutionSemantics.v1.md § 1.4](../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md#14-snapshot-projections-derived-state)       |

### Storage Layer (NEW)

| Old Link                       | New Link                                                                                                       | Notes                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| N/A (DDL was inline)           | [State Store Contract](../docs/architecture/engine/contracts/state-store/README.md)                            | Storage-agnostic interface             |
| ExecutionSemantics § 1.1 (DDL) | [Snowflake StateStoreAdapter](../docs/architecture/engine/adapters/state-store/snowflake/StateStoreAdapter.md) | Snowflake-specific DDL, MERGE patterns |
| N/A (not documented)           | [Postgres StateStoreAdapter](../docs/architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md)   | Postgres-specific DDL, ON CONFLICT     |

### Engine Policies (NEW)

| Old Link                                 | New Link                                                                                      | Notes                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| ExecutionSemantics § 6 (continue-as-new) | [Temporal EnginePolicies.md](../docs/architecture/engine/adapters/temporal/EnginePolicies.md) | Temporal limits, continue-as-new, determinism |
| N/A (not documented)                     | Conductor EnginePolicies.md (TBD)                                                             | Phase 2                                       |

### Capabilities

| Old Link                          | New Link                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `WORKFLOW_ENGINE.md#capabilities` | [capabilities/README.md](../docs/architecture/engine/contracts/capabilities/README.md)                  |
| N/A (was scattered)               | [capabilities.schema.json](../docs/architecture/engine/contracts/capabilities/capabilities.schema.json) |

### Operations

| Old Link                           | New Link                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `WORKFLOW_ENGINE.md#observability` | [observability.md](../docs/architecture/engine/ops/observability.md)                           |
| `WORKFLOW_ENGINE.md#runbooks`      | [runbooks/incident_response.md](../docs/architecture/engine/ops/runbooks/incident_response.md) |

### Developer Tooling

| Old Link                         | New Link                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `WORKFLOW_ENGINE.md#determinism` | [determinism-tooling.md](../docs/architecture/engine/dev/determinism-tooling.md) |

### Roadmap

| Old Link                     | New Link                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| `WORKFLOW_ENGINE.md#roadmap` | [engine-phases.md](../docs/architecture/engine/roadmap/engine-phases.md) |

---

## 👥 Migration by Role

### SDK Implementers

**Action required**: Update implementation guide bookmarks

**Old workflow**:

1. Read `WORKFLOW_ENGINE.md` (3,227 lines)
2. Extract relevant sections manually
3. Guess storage backend from Snowflake DDL

**New workflow**:

1. Start at [INDEX.md](../docs/architecture/engine/INDEX.md)
2. Read [IWorkflowEngine.v1.md](../docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md) (interface)
3. Read [ExecutionSemantics.v1.md](../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md)
   (core semantics, agnostic)
4. Read [State Store Contract](../docs/architecture/engine/contracts/state-store/README.md) (persistence interface)
5. **Choose storage backend**:
   - Snowflake: Read [Snowflake StateStoreAdapter](../docs/architecture/engine/adapters/state-store/snowflake/StateStoreAdapter.md)
   - Postgres: Read [Postgres StateStoreAdapter](../docs/architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md)
6. **Choose execution engine**:
   - Temporal: Read [TemporalAdapter.spec.md](../docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md) + [EnginePolicies.md](../docs/architecture/engine/adapters/temporal/EnginePolicies.md)
   - Conductor: Read [ConductorAdapter.spec.md]
     (../docs/architecture/engine/adapters/conductor/ConductorAdapter.spec.md) (DRAFT)

**Code changes**: None (semantics unchanged)

---

### Plan Authors

**Action required**: Update internal docs with new links

**Old workflow**:

1. Read `WORKFLOW_ENGINE.md#determinism`

**New workflow**:

1. Start at [INDEX.md](../docs/architecture/engine/INDEX.md)
2. Read [determinism-tooling.md](../docs/architecture/engine/dev/determinism-tooling.md)
3. Read [capabilities/README.md](../docs/architecture/engine/contracts/capabilities/README.md)

**Plan changes**: None (capability validation unchanged)

---

### SREs

**Action required**: Update runbook bookmarks

**Old workflow**:

1. Read `WORKFLOW_ENGINE.md#observability`
2. Read `WORKFLOW_ENGINE.md#runbooks`

**New workflow**:

1. Start at [INDEX.md](../docs/architecture/engine/INDEX.md)
2. Read [observability.md](../docs/architecture/engine/ops/observability.md)
3. Read [runbooks/incident_response.md](../docs/architecture/engine/ops/runbooks/incident_response.md)

**Operational changes**: None (metrics, alerts, dashboards unchanged)

---

### Documentation Maintainers

**Action required**: Update contribution workflow

**Old workflow**:

1. Edit `WORKFLOW_ENGINE.md` (risk of merge conflicts, 3,227 lines)
2. Manual Markdown linting
3. No Code Owners (manual reviewer assignment)

**New workflow**:

1. Read [CONTRIBUTING.md](../docs/CONTRIBUTING.md) (full guide)
2. Edit relevant modular document (avg 280 lines)
3. Run pre-commit checks:

   ```bash
   markdownlint-cli2 "docs/**/*.md"
   markdown-link-check docs/architecture/engine/INDEX.md
   ```

4. Push → CI runs 4 quality gates automatically
5. Code Owners auto-assign reviewers by file path

**New requirements**:

- Normative contracts require architecture team approval (see [CODEOWNERS](../.github/CODEOWNERS))
- Follow [VERSIONING.md](../docs/architecture/engine/VERSIONING.md) for contract changes (MAJOR/MINOR/PATCH)

---

## 🔧 Technical Migration Details

### For Internal Documentation (Confluence, Notion, etc.)

**Search & replace** (across all pages):

```text
Old: docs/architecture/engine/WORKFLOW_ENGINE.md
New: docs/architecture/engine/INDEX.md
```

**Specific section replacements**:

```bash
# State Store Model
Old: WORKFLOW_ENGINE.md#state-store-model
New: contracts/engine/ExecutionSemantics.v1.md#1-source-of-truth-statestore-model

# Snowflake DDL
Old: WORKFLOW_ENGINE.md (DDL was inline)
New: adapters/state-store/snowflake/StateStoreAdapter.md#1-physical-schema-ddl

# Continue-As-New
Old: WORKFLOW_ENGINE.md#continue-as-new
New: adapters/temporal/EnginePolicies.md#1-continue-as-new-policy-normative
```

### For Code Comments

**Before**:

```typescript
// See WORKFLOW_ENGINE.md#dual-attempt for idempotency key structure
const idempotencyKey = generateKey(runId, stepId, logicalAttemptId, ...);
```

**After**:

```typescript
// See ExecutionSemantics.v1.md § 1.3 for idempotency key structure
const idempotencyKey = generateKey(runId, stepId, logicalAttemptId, ...);
```

### For README.md / Getting Started Guides

**Before**:

```markdown
## Architecture

See [WORKFLOW_ENGINE.md](docs/architecture/engine/WORKFLOW_ENGINE.md) for complete specification.
```

**After**:

```markdown
## Architecture

See [Engine Architecture Index](docs/architecture/engine/INDEX.md) for navigation hub:

- [IWorkflowEngine.v1.md](docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md) - Interface
- [ExecutionSemantics.v1.md](docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md) - Core semantics
- [State Store Contract](docs/architecture/engine/contracts/state-store/README.md) - Persistence layer
- [Snowflake Adapter](docs/architecture/engine/adapters/state-store/snowflake/StateStoreAdapter.md) - Snowflake implementation
```

---

## 📅 Timeline & Deprecation Schedule

| Date           | Event                                                                 |
| -------------- | --------------------------------------------------------------------- |
| **2026-02-11** | PR merged, WORKFLOW_ENGINE.md deprecated (90-day grace period starts) |
| **2026-02-18** | Week 1: Slack announcement, Confluence updates                        |
| **2026-02-25** | Week 2: Monitor 404s, proactive outreach for high-traffic pages       |
| **2026-03-11** | Week 4: CI gate tuning based on false positive rate                   |
| **2026-05-12** | **90-day mark**: WORKFLOW_ENGINE.md removed from repo                 |

---

## ⚠️ Known Breaking Changes

### 1. External Links (Medium Severity)

**Impact**: External sites linking to `WORKFLOW_ENGINE.md` will get 404 after removal (2026-05-12)

**Mitigation**:

- 90-day grace period (deprecation banner with redirect)
- GitHub Pages 301 redirect (if applicable):

  ```nginx
  /docs/architecture/engine/WORKFLOW_ENGINE.md → /docs/architecture/engine/INDEX.md
  ```

- Monitor web analytics for 404s, proactive outreach

### 2. Internal Bookmarks (Low Severity)

**Impact**: Team members' browser bookmarks will break

**Mitigation**:

- Slack announcement with "Update your bookmarks" call-to-action
- Deprecation banner in `WORKFLOW_ENGINE.md` with prominent link to INDEX.md

### 3. CI/CD Pipelines (Low Severity)

**Impact**: Build scripts referencing `WORKFLOW_ENGINE.md` may fail

**Mitigation**:

- Search codebase for hardcoded paths:

  ```bash
  grep -r "WORKFLOW_ENGINE.md" . --exclude-dir={node_modules,.git}
  ```

- Update to `INDEX.md` or modular doc paths

---

## 🆘 Support & Questions

### FAQ

**Q: Do I need to change my code?**  
A: No. This is a documentation-only refactor. Semantics unchanged.

**Q: When does WORKFLOW_ENGINE.md get removed?**  
A: 2026-05-12 (90 days after merge). Deprecation banner includes countdown.

**Q: I maintain external docs linking to WORKFLOW_ENGINE.md. What should I do?**  
A: Update links to [INDEX.md](../docs/architecture/engine/INDEX.md) before 2026-05-12.
See [Link Migration Table](#link-migration-table) above.

**Q: Where do I report broken links?**  
A: File GitHub issue tagged `documentation` or ping `#architecture` in Slack.

**Q: Can I still read the old WORKFLOW_ENGINE.md?**  
A: Yes, for 90 days. After 2026-05-12, use git history: `git show <commit>:docs/architecture/engine/WORKFLOW_ENGINE.md`

### Contact

- **Slack**: #architecture, #documentation
- **GitHub**: File issue tagged `documentation`, `migration`
- **Email**: <architecture-team@yourorg.com> (if applicable)

---

## ✅ Checklist for Teams

### SDK Team

- [ ] Update internal implementation guides (links to INDEX.md)
- [ ] Review [State Store Contract](../docs/architecture/engine/contracts/state-store/README.md)
- [ ] Choose storage backend:
  - Read [Snowflake StateStoreAdapter](../docs/architecture/engine/adapters/state-store/snowflake/StateStoreAdapter.md)
  - OR [Postgres StateStoreAdapter](../docs/architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md)
- [ ] Review [Temporal EnginePolicies](../docs/architecture/engine/adapters/temporal/EnginePolicies.md) (if using Temporal)

### Documentation Team

- [ ] Update Confluence pages (mark WORKFLOW_ENGINE references as deprecated)
- [ ] Search & replace in all docs: `WORKFLOW_ENGINE.md` → `INDEX.md`
- [ ] Add link to [CONTRIBUTING.md](../docs/CONTRIBUTING.md) in team wiki
- [ ] Review [VERSIONING.md](../docs/architecture/engine/VERSIONING.md) for contract evolution policy

### SRE Team

- [ ] Update runbook bookmarks
- [ ] Review [observability.md](../docs/architecture/engine/ops/observability.md) (unchanged, but new location)
- [ ] Review [incident_response.md](../docs/architecture/engine/ops/runbooks/incident_response.md)

### Architecture Team

- [ ] Review [CODEOWNERS](../.github/CODEOWNERS) (architecture team auto-assigned)
- [ ] Review [VERSIONING.md](../docs/architecture/engine/VERSIONING.md) (contract evolution policy)
- [ ] Monitor CI gate false positive rate (Weeks 2-4)

---

**See [PR_TEMPLATE.md](../.github/PR_TEMPLATE.md) for complete PR details** (rationale, testing, rollback instructions).
