# DVT+ — Engine & Temporal Quality Pack (Gaps + Antipatterns + Capability Versioning Policy)

**Date**: 2026-02-14  
**Scope**: `packages/engine`, `packages/adapter-temporal`, capability registry/contracts  
**Audience**: Engine/Adapter maintainers, Planner/UI implementers  
**Status**: Mixed — clearly marked per section (**NORMATIVE / POLICY** vs informative)

---

## Table of contents

1. Gaps, problems, risks (what’s missing / must improve) — **Informative**
2. Implemented: RBAC negative tests + tenant-scope enforcement — **Informative (done)**
3. Temporal / Engine antipatterns (quality + efficiency) — **Informative**
4. Remediation plan (ordered) — **Informative**
5. CAPABILITY_VERSIONING.md — Capability Governance & Versioning Policy — **NORMATIVE / POLICY** (moved to `docs/CAPABILITY_VERSIONING.md`)
6. Capability Registry: executable schema shape + adapter declarations — **Normative constraints + reference schemas**
7. Enforcement and CI hooks — **Normative requirements + practical checks**
8. Appendix: PR templates (ready to paste) — **Informative**
9. References (links)

---

## 1) Gaps, problems, risks (what’s missing / must improve) — Informative

### 1.1 SchemaVersion compatibility (policy incomplete) ⚠️

- **Problem**: `validateSchemaVersionOrThrow` currently accepts only `v1.*` (too restrictive).
- **Spec intent**: support up to **3 minor versions back**.
- **Risk**: valid older plans get rejected (operational breakage).

**Fix recommended**

- Allow same major, and `incomingMinor >= currentMinor - 3`.
- Reject forward minors and different major.

### 1.2 RBAC / authorization enforcement & tests ⚠️

- Hook exists (`IAuthorizer` / `assertTenantAccess`), but default is AllowAll (test-only behavior).
- Spec requires tenant validation + negative tests.

**Status**: implemented + tested (see §2).

### 1.3 Signal catalog coverage (`RETRY_STEP` / `RETRY_RUN`) ⚠️

- Explicitly `NotImplemented` (Phase 2).
- If spec requires immediate support: gap.
- If Phase 2 is acceptable: MUST be clearly documented + include a deterministic test skeleton asserting `NotImplemented`.

### 1.4 Operational alerts/audit for integrity failures ⚠️

- `PlanIntegrityValidator` throws but no **alerting/logging/audit hook** exists.
- Spec recommends **critical alerts** on integrity failures.

**Fix recommended**

- Add `onIntegrityFailure` hook (see §7) + unit test (sha mismatch → hook called).

### 1.5 CI coverage for Temporal time-skipping integration ⚠️

- Integration test exists; ensure it runs in PR pipelines.
- Add explicit job/step: `pnpm --filter @dvt/adapter-temporal test:integration`.

### 1.6 Type hygiene ℹ️

- Ensure all code imports canonical types from `@dvt/contracts` (avoid local placeholders).

### 1.7 Documentation / acceptance criteria ℹ️

- Close tracking PRs/issues (for example, Issue #5 → canonical #68) and complete the operational process.

---

## 2) Implemented: RBAC negative tests + tenant-scope enforcement — Informative (done)

### What was implemented

- **Typed `AuthorizationError`** (exported).
- **RBAC negative tests + tenant-scope example**:
  - `authorizer.deny.test.ts`
  - `DenyAuthorizer` + `TenantScopeAuthorizer` (implement existing `assertTenantAccess` hook).
  - Verifies engine throws `AuthorizationError` and does **not delegate** to adapter (`CountingAdapter` asserts zero calls).
- Minimal, backwards-compatible change (no interface break).

### Why it’s safe

- No contract breaks; only adds error type + tests.
- Demonstrates tenant-scoped RBAC and “no delegate on deny”.

(Optional future enhancement: promote `AuthorizationError` to `@dvt/contracts` for cross-package reuse.)

---

## 3) Temporal / Engine Antipatterns (quality + efficiency) — Informative

**Reviewed scope**: `packages/adapter-temporal` + adapter selection in engine.

### 3.1 Full state rebuild per query (O(n) per `getRunStatus`) — **High**

- **Evidence**: `TemporalAdapter.getRunStatus()` loads all events via `stateStore.listEvents()` and rebuilds with `projector.rebuild()`.
- **Risk**: long runs + frequent polling → high CPU and latency.

**Recommendation**

- Read materialized snapshot (if available).
- Otherwise use incremental replay by `runSeq` (cache last snapshot/runSeq).

### 3.2 Attempts fixed to 1 (idempotency collision risk) — **High**

- **Evidence**: `engineAttemptId: 1`, `logicalAttemptId: 1` and event key generation ignoring attempts.
- **Risk**: retries collapse into attempt 1 → collisions and misleading metrics/debugging.

**Recommendation**

- Propagate Temporal attempt from Activity/Workflow context.
- Include attempt ids in event envelope + idempotency key.

### 3.3 Two cancel paths (native `cancelRun` vs `signal('cancel')`) — **Medium–High**

- **Evidence**: `cancelRun()` uses `handle.cancel()`, while `signal(CANCEL)` used a dedicated signal route.
- **Risk**: divergent terminal events/cleanup behavior.

**Recommendation**

- Choose one canonical route:
  - Recommended: native cancel everywhere; map `signal(CANCEL)` → `cancelRun()` semantics.

### 3.4 Strong coupling to string literals (workflow name + signal names) — **Medium**

- **Risk**: silent runtime break after rename.

**Recommendation**

- Export typed constants from one module (workflow name + signal names).

### 3.5 `validateStepShape` creates `Set` per call — **Low**

- Micro overhead repeated in large plans.

**Recommendation**

- Hoist to module-level constant.

### 3.6 Integration test uses polling + fixed sleeps — **Medium**

- Flakiness risk in CI.

**Recommendation**

- Replace with deterministic wait helper (deadline + backoff), or await store/query transitions.

### 3.7 `require.resolve()` fragility under ESM/TS — **Medium**

- **Risk**: bundling / compiled path mismatches.

**Recommendation**

- Explicit path resolution strategy by environment + packaged-worker smoke test.

---

## 4) Remediation plan (ordered) — Informative

1. **Fix attempts/idempotency** (§3.2).
2. **Unify cancellation strategy** (§3.3).
3. **Optimize `getRunStatus`** (§3.1).
4. **De-stringify workflow/signals + harden `workflowsPath`** (§3.4 + §3.7).
5. **Test stability + micro-efficiency** (§3.5 + §3.6).

---

## 5) `CAPABILITY_VERSIONING.md` — Capability Governance & Versioning Policy (**NORMATIVE / POLICY**)

**Location**: `docs/CAPABILITY_VERSIONING.md`

### 5.1 Purpose

Define how capabilities are **introduced**, **versioned**, **declared by adapters**, and **gated** by Planner/UI to prevent adapter drift and ensure controlled evolution.

### 5.2 Definitions (Normative)

- **CapabilityId**: stable identifier (string), e.g. `signal.pause`, `cancel.cooperative`.
- **CapabilityVersion**: `vMAJOR.MINOR` (patch omitted by policy), e.g. `v1.1`, `v2.0`.
- **SupportLevel**: `native | emulated | degraded | unsupported`.
- **Stage**: `proposed | experimental | stable | deprecated | removed`.

### 5.3 Lifecycle (Normative)

|        Stage | Meaning                               | Requirements                                                    | Default plan policy                  |
| -----------: | ------------------------------------- | --------------------------------------------------------------- | ------------------------------------ |
|     proposed | RFC stage; no implementation required | RFC issue + draft spec                                          | MUST NOT be used in production plans |
| experimental | ≥1 adapter implements; may change     | 1 adapter + tests + docs                                        | MUST require explicit opt-in         |
|       stable | contract frozen                       | ≥2 adapters OR (1 native + documented emulation + parity tests) | Allowed by default                   |
|   deprecated | scheduled removal                     | migration guide + removal date                                  | Allowed with warning                 |
|      removed | no longer supported                   | registry removal                                                | Plans MUST be rejected               |

### 5.4 Versioning rules (Normative)

- **Breaking change** → bump MAJOR (`v2.0`).
- **Backward-compatible** → bump MINOR (`v1.2`).
- Within a major:
  - If adapter declares `v1.2`, it MUST satisfy semantics for `v1.0..v1.2` unless marked `degraded` with documented limitations.

### 5.5 Support levels (Normative)

- `native`: implemented directly by provider primitives.
- `emulated`: implemented via documented workaround.
- `degraded`: partial support with known limitations.
- `unsupported`: not available.

### 5.6 Adapter declarations (Normative)

Adapters MUST declare support as structured data, at minimum:

```json
{
  "capability": "signal.pause",
  "version": "v1.1",
  "support": "native",
  "limitations": [],
  "notes": "Maps to provider primitive."
}
```

### 5.7 Planner/UI gating (Normative)

Plans SHOULD declare required capabilities with minimum versions.

Reference validator logic:

- error if required capability is unsupported or version too old,
- warning if capability is emulated/degraded/deprecated.

### 5.8 Deprecation policy (Normative)

- **12 months notice** before removal.
- Migration guide required.
- UI MUST warn for deprecated capabilities.
- After removal, plans MUST be rejected.

### 5.9 Governance process (Normative)

- New capability requires Engineering Lead approval.
- Security-sensitive capabilities require security review.
- Required artifacts:
  - capability spec (contract),
  - registry update (executable schema),
  - conformance tests,
  - usage/limitations documentation.
- RFC window: **2 weeks** minimum before promotion to Experimental.

### 5.10 Index reference (Normative)

`INDEX.v1.0.md` MUST reference this policy.

### 5.11 Migration example (v1 → v2) (Normative example)

If `signal.pause` v2.0 introduces required payload `{ mode: 'drain' | 'freeze' }`:

- plans requiring `v2.0` MUST be rejected by adapters supporting only `v1.1`,
- UI MUST disable v2-only controls unless adapter reports `v2.*`,
- migration guide required within deprecation window.

---

## 6) Capability Registry: executable schema shape + adapter declarations

### 6.1 Canonical registry entry (Normative shape)

Each capability in the registry MUST contain:

```ts
export type CapabilityStage = 'proposed' | 'experimental' | 'stable' | 'deprecated' | 'removed';
export type SupportLevel = 'native' | 'emulated' | 'degraded' | 'unsupported';
export type CapabilityVersion = `v${number}.${number}`;

export type CapabilityDefinitionV1 = Readonly<{
  id: string;
  title: string;
  description: string;
  introducedIn: CapabilityVersion;
  latest: CapabilityVersion;
  stage: CapabilityStage;
  replacedBy?: string;
  docs?: Readonly<{ specPath?: string; url?: string }>;
  deprecation?: Readonly<{
    deprecatedAt: string;
    removalAt: string;
    migrationGuidePath: string;
  }>;
  versions: ReadonlyArray<
    Readonly<{
      version: CapabilityVersion;
      status: 'active' | 'deprecated' | 'removed';
      changelog?: string[];
      compatibility?: Readonly<{ requiresPlanField?: string[]; breaks?: string[] }>;
    }>
  >;
}>;
```

**Normative constraints**

- `introducedIn` MUST be present in `versions[].version`.
- `latest` MUST equal the highest version in `versions[]`.
- If `stage === 'deprecated'`, `deprecation` MUST exist.
- If `stage === 'removed'`, `versions[]` MUST include a `removed` marker.
- `removalAt - deprecatedAt` MUST be ≥ 12 months.

### 6.2 Adapter capability declaration shape (Normative)

```ts
export type AdapterCapabilitySupportV1 = Readonly<{
  capability: string;
  version: CapabilityVersion;
  support: SupportLevel;
  limitations?: readonly string[];
  notes?: string;
}>;
```

### 6.3 Recommended storage layout (Informative)

- Canonical registry in `@dvt/contracts` exports:
  - `capabilityRegistry` (data)
  - `parseCapabilityRegistry()` (runtime validation)
  - capability types
- Adapters expose `getCapabilities(): AdapterCapabilitySupportV1[]` or normalized map.

### 6.4 Planner gating reference implementation (Normative reference)

```ts
type RequiredCapability = Readonly<{
  id: string;
  minVersion?: `v${number}.${number}`;
  optional?: boolean;
}>;
type Registry = Readonly<
  Record<string, { stage: string; introducedIn: string; deprecated?: boolean }>
>;

function parseCapVer(v: string): { major: number; minor: number } {
  const raw = v.trim().replace(/^v/i, '');
  const [maj, min] = raw.split('.');
  const major = Number(maj);
  const minor = Number(min ?? 0);
  if (!Number.isInteger(major) || !Number.isInteger(minor))
    throw new Error(`CAPABILITY_VERSION_INVALID: ${v}`);
  return { major, minor };
}

function satisfies(minV: string, supportedV: string): boolean {
  const a = parseCapVer(minV);
  const b = parseCapVer(supportedV);
  if (a.major !== b.major) return false;
  return b.minor >= a.minor;
}

export function validatePlanCapabilities(args: {
  required: readonly RequiredCapability[];
  adapterCaps: Readonly<Record<string, { version: string; support: SupportLevel }>>;
  registry: Registry;
  allowExperimental: boolean;
}): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const req of args.required) {
    const reg = args.registry[req.id];
    if (!reg) {
      errors.push(`CAPABILITY_UNKNOWN: ${req.id}`);
      continue;
    }

    if (reg.stage === 'experimental' && !args.allowExperimental) {
      errors.push(`CAPABILITY_EXPERIMENTAL_NOT_ALLOWED: ${req.id}`);
      continue;
    }

    const minVersion = req.minVersion ?? reg.introducedIn;
    const sup = args.adapterCaps[req.id];

    if (!sup || sup.support === 'unsupported') {
      if (req.optional) continue;
      errors.push(`CAPABILITY_NOT_SUPPORTED: ${req.id}`);
      continue;
    }

    if (!satisfies(minVersion, sup.version)) {
      if (req.optional) continue;
      errors.push(
        `CAPABILITY_VERSION_TOO_OLD: ${req.id} required>=${minVersion} supported=${sup.version}`
      );
      continue;
    }

    if (sup.support === 'emulated') warnings.push(`CAPABILITY_EMULATED: ${req.id}`);
    if (sup.support === 'degraded') warnings.push(`CAPABILITY_DEGRADED: ${req.id}`);
    if (reg.deprecated) warnings.push(`CAPABILITY_DEPRECATED: ${req.id}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## 7) Enforcement and CI hooks

### 7.1 Required checks (Normative)

CI MUST:

1. Validate capability registry data against schema.
2. Validate adapter declarations against capability declaration schema.
3. Reject plan references to unknown/removed capabilities.
4. Enforce 12-month deprecation notice.

### 7.2 Practical checks (Informative)

- Unit suite `capabilities.registry.test.ts`:
  - `introducedIn` in `versions[]`,
  - `latest` equals max,
  - deprecated window check.
- Contract suite `adapter.capabilities.test.ts`:
  - declaration schema validity,
  - only known capability IDs.

### 7.3 Integrity failure hook (Recommended hardening)

```ts
export type IntegrityFailureMeta = Readonly<{
  tenantId: string;
  planId?: string;
  runId?: string;
  adapter: string;
}>;
export type EngineHooks = Readonly<{
  onIntegrityFailure?: (meta: IntegrityFailureMeta, reason: string) => void;
}>;
```

**Test**: sha mismatch triggers hook once + throws.

---

## 8) Appendix — PR templates (ready to paste)

### 8.1 PR: Capability versioning policy (Issue #11)

**Title**: `docs(contracts): add CAPABILITY_VERSIONING policy`

**What**

- Add `CAPABILITY_VERSIONING.md` (Normative/Policy).
- Define lifecycle, versioning, support levels, governance, gating, and deprecation.
- Add index reference.

### 8.2 PR: Attempts/idempotency fix (Temporal)

**Title**: `fix(adapter-temporal): propagate attempt ids into event keys (idempotency safe)`

**What**

- Use Temporal attempt from Activity/Workflow context.
- Include attempt ids in `runEventKey`/idempotency key.

### 8.3 PR: Cancel unification

**Title**: `fix(adapter-temporal): canonicalize cancel (signal(CANCEL) -> native cancel)`

**What**

- Remove divergent cancel route or map `signal(CANCEL)` to native cancel semantics.
- Ensure parity in terminal status/events.

---

## 9) References

- Semantic Versioning: https://semver.org/
- OWASP Least Privilege: https://owasp.org/www-community/controls/Least_Privilege
- NIST SP 800-53 Rev.5 (Access Control): https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
- Temporal cancellation (TypeScript): https://docs.temporal.io/develop/typescript/cancellation
- Temporal message passing (signals): https://docs.temporal.io/develop/typescript/message-passing
- Temporal Activity Info (`attempt`): https://typescript.temporal.io/api/interfaces/activity.Info
- Netflix Conductor: https://conductor.netflix.com/
- Orkes Conductor docs: https://orkes.io/
