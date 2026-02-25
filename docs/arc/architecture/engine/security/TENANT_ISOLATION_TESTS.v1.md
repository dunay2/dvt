# TENANT_ISOLATION_TESTS.v1.md - Tenant Isolation Test Suite

**Version**: 1.1  
**Date**: 2026-02-12  
**Status**: Normative  
**Location**: docs/architecture/engine/security/TENANT_ISOLATION_TESTS.v1.md

**Changelog**:

- **v1.1** (2026-02-12): High-impact improvements for CI portability and statistical robustness:
  - MASKING_MODE parametrization across all API tests (remove hard-coded 403)
  - Statistical timing oracle: added Kolmogorov-Smirnov distribution test (p ≥ 0.01)
  - **No observable timing oracle beyond calibrated thresholds** (enforcement via statistical test, not prescriptive internal structure)
  - DB scaling test split: MUST (predicate + row isolation) vs SHOULD (performance scaling)
  - Cache/ETag normative policy: `Cache-Control: no-store`, ETag omitted for masked endpoints
  - Concurrency-based quota test (ISOL-QUOTA-003): noisy neighbor validation under parallel load
  - GraphQL production mode support (introspection disabled → masked error or errors[])
  - Header comparison: explicit whitelist for consistency validation
- **v1.0** (initial): Core tenant isolation test suite

---

## Purpose

This document defines **mandatory test cases** for verifying **INV-SCOPE-03**: Tenant A cannot read, write, or infer existence of Tenant B's data via any channel (direct access, timing, error messages, resource limits).

These tests are **normative**: all DVT Engine deployments MUST pass these tests before production deployment. Failures indicate security vulnerabilities requiring immediate remediation.

**MASKING_MODE Configuration**: Tests are parametrized by deployment-configured `MASKING_MODE` per endpoint class:

- `MASKING_MODE=FORBIDDEN`: Always return 403 Forbidden (masks existence as "no permission")
- `MASKING_MODE=NOT_FOUND`: Always return 404 Not Found (masks permission as "does not exist")

Deployments MUST configure one consistent mode per endpoint class; tests adapt expectations accordingly. See [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) for HTTP status semantics.

---

## Test Categories

1. **Direct Access Tests**: Verify RLS (Row-Level Security) blocks cross-tenant queries
2. **Timing Inference Tests**: Detect timing side-channels using statistical analysis (N≥200 samples)
3. **Error Message Inference Tests**: Ensure indistinguishable error responses per MASKING_MODE policy
4. **Quota Leakage Tests**: Verify independent resource limits (no noisy neighbor effect)
5. **Existence Oracle Tests**: Confirm no endpoint leaks resource existence via API behavior, GraphQL schema, or cache/ETag headers

---

## 1. Direct Access Tests

### Test 1.1: Cross-Tenant Plan Read Blocked

**Test ID**: `ISOL-DIRECT-001`  
**Invariant**: INV-SCOPE-01, INV-SCOPE-02  
**Requirement**: Tenant A cannot read Tenant B's plan via API or database query.

**Setup**:

```typescript
const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

const planB = await createPlan({
  tenantId: tenantB.id,
  name: 'Secret Plan',
  definition: {
    /* sensitive workflow */
  },
});
```

**Test**:

```typescript
// Attempt 1: API request from Tenant A to read Tenant B's plan
const response = await apiClient.withAuth(tenantA.auth).get(`/plans/${planB.id}`);

// Parametrized by deployment MASKING_MODE configuration
const expectedStatus = MASKING_MODE === 'FORBIDDEN' ? 403 : 404;
expect(response.status).toBe(expectedStatus);
expect(response.body.message).toBe(MASKING_MODE === 'FORBIDDEN' ? 'Access denied' : 'Not found'); // Generic error per mode
```

**Verification**:

- ✅ HTTP status matches MASKING_MODE configuration (403 or 404)
- ✅ Error message is generic per mode (no hint that plan exists)
- ✅ No plan data leaked in response body or headers
- ✅ Audit log records attempted access with `decision: DENIED`

---

### Test 1.2: Cross-Tenant StateStore Query Returns Zero Rows

**Test ID**: `ISOL-DIRECT-002`  
**Invariant**: INV-SCOPE-02  
**Requirement**: StateStore adapter MUST enforce tenant-scope filtering; cross-tenant queries return zero rows.

**Setup**:

```typescript
const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

await stateStore.savePlan(
  {
    tenantId: tenantB.id,
    planId: 'plan-b-123',
    definition: {
      /* sensitive data */
    },
  },
  { tenantId: tenantB.id, projectId: tenantB.defaultProject }
);
```

**Test** (storage-agnostic):

```typescript
// Attempt to query with Tenant A scope
const results = await stateStore.listPlans({
  tenantId: tenantA.id,
  projectId: tenantA.defaultProject,
  environmentId: tenantA.defaultEnvironment, // Complete scope tuple per INV-SCOPE-01
});

// MUST return zero rows even though Tenant B plan exists
expect(results).toHaveLength(0);

// Verify tenant scope is required (no default)
try {
  await stateStore.listPlans({ projectId: tenantA.defaultProject }); // Missing tenantId
  throw new Error('Should have thrown validation error');
} catch (err) {
  expect(err.message).toMatch(/tenantId.*required/i);
}
```

**Verification**:

- ✅ Zero rows returned to Tenant A (MUST, adapter-level enforcement)
- ✅ Missing tenant scope throws validation error (MUST)
- ✅ StateStore contract enforces complete scope tuple: {tenantId, projectId, environmentId} (MUST)

**Predicate Verification Hook** (optional test-only contract extension):
For mechanical predicate verification beyond row isolation, `IStateStoreAdapter` MAY expose (TEST_MODE only):

```typescript
interface IStateStoreAdapter {
  // Production methods...

  // TEST-MODE ONLY: Returns last executed query structure
  // MUST return null or throw if TEST_MODE !== 'true'
  __debugLastQuery?(): { sql?: string; params?: unknown[]; predicates?: string[] } | null;
}
```

**Example usage** (integration tests):

```typescript
if (process.env.TEST_MODE === 'true' && stateStore.__debugLastQuery) {
  await stateStore.listPlans({
    tenantId: tenantA.id,
    projectId: tenantA.defaultProject,
    environmentId: tenantA.defaultEnvironment,
  });

  const query = stateStore.__debugLastQuery();
  if (query && query.sql) {
    expect(query.sql).toMatch(/WHERE.*tenant_id\s*=\s*\$/i); // Tenant predicate present
    expect(query.params).toContain(tenantA.id);
  } else if (query && query.predicates) {
    expect(query.predicates).toContainEqual({ field: 'tenant_id', op: '=', value: tenantA.id });
  }
}
```

This enables **white-box verification** without requiring storage-specific EXPLAIN analysis. If not available, rely on row isolation tests as normative proof.

**Storage Profile: PostgreSQL RLS (SHOULD)**  
Optionally verify database-level RLS as defense-in-depth:

```typescript
if (db.dialect === 'postgres') {
  // Direct SQL query with RLS policy active (session tenant binding)
  const sqlResults = await db.query(
    'BEGIN; SET app.current_tenant = $1; SELECT * FROM plans; COMMIT;',
    [tenantA.id]
  );
  expect(sqlResults.rows).toHaveLength(0);

  // Verify RLS enabled at table level (pg_class.relrowsecurity)
  const rlsEnabled = await db.query(
    `SELECT c.relname, c.relrowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = 'public' AND c.relname = 'plans'`
  );
  expect(rlsEnabled.rows[0].relrowsecurity).toBe(true); // RLS enabled

  // Verify at least one RLS policy exists (pg_policies)
  const policies = await db.query(
    `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
     FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'plans'`
  );
  expect(policies.rows.length).toBeGreaterThan(0); // At least one policy defined
  // Optionally verify policy uses tenant_id in qual expression
  expect(policies.rows.some((p) => p.qual?.includes('tenant_id'))).toBe(true);
}
```

**Reference**: [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - policy-based access control

---

### Test 1.3: Cross-Tenant Run Cancellation Blocked

**Test ID**: `ISOL-DIRECT-003`  
**Invariant**: INV-SCOPE-01  
**Requirement**: Tenant A cannot cancel Tenant B's workflow run.

**Setup**:

```typescript
const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

const runB = await startWorkflow({
  tenantId: tenantB.id,
  planId: 'plan-b',
  runId: 'run-b-456',
});
```

**Test**:

```typescript
// Attempt to cancel Tenant B's run from Tenant A context
const response = await apiClient.withAuth(tenantA.auth).post(`/runs/${runB.id}/cancel`);

// Parametrized by deployment MASKING_MODE configuration
const expectedStatus = MASKING_MODE === 'FORBIDDEN' ? 403 : 404;
expect(response.status).toBe(expectedStatus);
expect(response.body.message).toBe(MASKING_MODE === 'FORBIDDEN' ? 'Access denied' : 'Not found');

// Body schema MUST be identical to "nonexistent run" case (indistinguishability)
const nonexistentResponse = await apiClient.withAuth(tenantA.auth).post(`/runs/nonexistent/cancel`);
expect(response.status).toBe(nonexistentResponse.status);
expect(Object.keys(response.body).sort()).toEqual(Object.keys(nonexistentResponse.body).sort());

// Verify run still RUNNING
const status = await getRunStatus({ runId: runB.id, tenantId: tenantB.id });
expect(status.state).toBe('RUNNING');
```

**Verification**:

- ✅ Cancellation request denied
- ✅ Run state unchanged
- ✅ Audit log records attempted cancellation with denial reason

---

## 2. Timing Inference Tests

### Test 2.1: No Statistically Significant Timing Oracle

**Test ID**: `ISOL-TIMING-001`  
**Invariant**: INV-SCOPE-03  
**Requirement**: Authorization checks MUST NOT exhibit a timing oracle with statistically significant separation between "exists-but-forbidden" and "nonexistent" cases.

**Threat**: If `existingResource` authorization consistently takes 100ms and `nonexistentResource` takes 10ms (early exit), attacker can infer existence via timing oracle. See [OWASP Timing Attacks](https://owasp.org/www-community/attacks/Timing_Attack).

**Normative test requirements**:

- MUST use monotonic timer (`performance.now()` in Node.js, not `Date.now()`)
- MUST compare statistical distributions (median + P95 + **distribution test**) across N ≥ 200 samples per case
- MUST include warm-up phase (W ≥ 20 samples, discarded) to eliminate cold-cache/JIT effects
- **MUST execute in controlled environment** (recommended): Same host, pinned CPU, minimal background load; if not feasible, use non-parametric statistical test with p ≥ 0.01 to account for CI noise
- **MUST read and discard full response body** consistently for both cases (prevent timing variance from partial reads)
- **No observable timing oracle beyond calibrated thresholds**: Authorization implementation SHOULD avoid timing side-channels (e.g., database existence checks before authz, early-exit optimization) BUT enforcement relies on statistical verification (median/P95/p-value), not prescriptive code structure. Thresholds calibrated per deployment environment.
- Pass criteria: median/P95 differences ≤ threshold **AND** distribution test p ≥ 0.01 (no statistically significant separation)

**Profile-gated execution** (normative):

- **Controlled Performance Profile** (pinned CPU, stable network, same host): This test MUST pass as-is (nightly gate)
- **Standard CI / PR** (shared runners, cloud latency): Core timing tests MAY be skipped if flaky; run DI RECT/ERROR/ORACLE/QUOTA tests instead. Timing gate enforced nightly on Performance Profile runners, NOT on every PR merge unless runners are pinned. ADR required if skipping timing tests permanently.

**Test** (statistical, N≥200 samples):

```typescript
import { performance } from 'node:perf_hooks';

const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

// Tenant B creates a plan (exists)
const planB = await createPlan({ tenantId: tenantB.id, name: 'Real Plan' });

// Helper: sample latency distribution (keep raw samples for KS test)
async function sampleLatency(fn: () => Promise<void>, n: number): Promise<number[]> {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  return samples; // Return raw (unsorted) for KS test
}

// Helper: consume full response body (prevent timing variance from partial reads)
async function fetchAndConsume(url: string, auth: any): Promise<void> {
  const response = await apiClient.withAuth(auth).get(url);
  const body = await response.text(); // Or .json() - MUST fully consume body
  // Discard body to measure pure request/response timing
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b); // Sort a copy
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function p95(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b); // Sort a copy
  const idx = Math.floor(sorted.length * 0.95);
  return sorted[Math.min(idx, sorted.length - 1)];
}

const WARMUP = 20;
const N = 200; // CI baseline; increase to N≥1000 for controlled performance environment / penetration testing
const THRESHOLD_MS = 25; // Calibrated for same-host CI; adjust only via ADR

// Warm-up phase (discard samples to eliminate cold cache/JIT effects)
await sampleLatency(() => fetchAndConsume(`/plans/${planB.id}`, tenantA.auth), WARMUP);
await sampleLatency(() => fetchAndConsume(`/plans/nonexistent-id`, tenantA.auth), WARMUP);

// Measurement phase
const existsLat = await sampleLatency(() => fetchAndConsume(`/plans/${planB.id}`, tenantA.auth), N);
const noneLat = await sampleLatency(
  () => fetchAndConsume(`/plans/nonexistent-id`, tenantA.auth),
  N
);

const medDiff = Math.abs(median(existsLat) - median(noneLat));
const p95Diff = Math.abs(p95(existsLat) - p95(noneLat));

// Pass criteria: absolute difference in milliseconds
expect(medDiff).toBeLessThanOrEqual(THRESHOLD_MS);
expect(p95Diff).toBeLessThanOrEqual(THRESHOLD_MS);

// Normative: Distribution test (Kolmogorov-Smirnov for normality-free comparison)
const ksTest = kolmogorovSmirnovTest(existsLat, noneLat);
expect(ksTest.pValue).toBeGreaterThanOrEqual(0.01); // No statistically significant difference (p ≥ 0.01)
```

**Helper: Kolmogorov-Smirnov Test** (normative: MUST use library implementation):

```typescript
function kolmogorovSmirnovTest(
  sample1: number[],
  sample2: number[]
): { statistic: number; pValue: number } {
  // NORMATIVE REQUIREMENT: Use well-tested library for production tests
  // - Node.js: `simple-statistics`, `jstat`, or equivalent with correct KS implementation
  // - CI: Call Python `scipy.stats.ks_2samp` for authoritative p-value
  // The implementation below is illustrative ONLY; production MUST use vetted library

  // For reference implementation, see:
  // - SciPy KS test: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html
  // - jStat KS test: https://github.com/jstat/jstat#kolmogorov-smirnov-test

  // Placeholder assertion to enforce library usage:
  throw new Error(
    'MUST use library implementation (simple-statistics, jstat, scipy) for KS test. ' +
      'Hand-rolled approximations risk incorrect p-values and false negatives.'
  );
}

// Alternative: Use Python scipy in CI
// const ksTest = await execPython("scipy.stats.ks_2samp", existsLat, noneLat);

// Helper for async sleep (used in concurrency tests)
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Verification**:

- ✅ Median difference ≤ THRESHOLD_MS (25ms for same-host CI; adjust per ADR for cloud/network latency)
- ✅ P95 difference ≤ THRESHOLD_MS (controls tail latency, critical for oracle detection)
- ✅ **Distribution test p ≥ 0.01** (KS test confirms no statistically significant separation)
- ✅ Same error message for both cases (per MASKING_MODE policy)
- ✅ Warm-up phase eliminates cold-cache variance
- ✅ **Full response body consumed** (fetchAndConsume helper) to avoid incomplete-read variance

**Implementation note**: Authorization logic MUST:

1. **Always query resource existence** (or use constant-time stub): No early exit based on RBAC-only checks
2. Perform full RBAC evaluation even if resource missing
3. Return generic error with consistent processing path
4. Avoid optimization shortcuts that create timing side-channels

**Alternative approach** (via ADR): Some deployments MAY adopt "never query existence for unauthorized callers" (always return masked response without DB lookup). This eliminates DB timing side-channels but requires constant-time RBAC evaluation. Document via Architectural Decision Record (ADR) if using this approach.

**Reference**: [OWASP Timing Attack](https://owasp.org/www-community/attacks/Timing_Attack) - side-channel mitigation via constant-time logic

---

### Test 2.2: Database Query Tenant-Scoped Predicate Enforcement (MUST)

**Test ID**: `ISOL-DIRECT-004` (**renamed from ISOL-TIMING-002**; moved to Direct Access category)  
**Invariant**: INV-SCOPE-02, INV-SCOPE-03  
**Requirement**: Database queries MUST include tenant-scoped predicate; cross-tenant queries return zero rows.

**Test** (MUST: predicate enforcement + row isolation):

```typescript
const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

// Baseline: Tenant A with 10 plans, Tenant B with 100 plans
await bulkCreatePlans({ tenantId: tenantA.id, count: 10 });
await bulkCreatePlans({ tenantId: tenantB.id, count: 100 });

// MUST: Tenant-scoped predicate present in query
const results = await stateStore.listPlans({
  tenantId: tenantA.id,
  projectId: tenantA.defaultProject,
});

// MUST: Zero cross-tenant rows
expect(results).toHaveLength(10); // Only Tenant A plans
expect(results.every((p) => p.tenantId === tenantA.id)).toBe(true);
```

**Verification (MUST)**:

- ✅ Tenant-scoped predicate present in all queries (enforced by adapter contract)
- ✅ Zero cross-tenant rows returned (row isolation)
- ✅ Correct row count per tenant scope

---

### Test 2.3: Database Query Scaling Independence (SHOULD - Performance Profile)

**Test ID**: `ISOL-PERF-001` (**optional performance validation**)  
**Invariant**: INV-SCOPE-03 (timing inference prevention)  
**Requirement**: In controlled performance environments, database query timing SHOULD NOT scale materially with cross-tenant data volume.

**Test** (SHOULD: relative scaling in PerfProfile):

```typescript
import { performance } from 'node:perf_hooks';

const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

// Baseline: Tenant A with 10 plans, Tenant B with 100 plans
await bulkCreatePlans({ tenantId: tenantA.id, count: 10 });
await bulkCreatePlans({ tenantId: tenantB.id, count: 100 });

// Measure baseline latency for Tenant A query
const tBase0 = performance.now();
const baselineResults = await stateStore.listPlans({
  tenantId: tenantA.id,
  projectId: tenantA.defaultProject,
});
const baseMs = performance.now() - tBase0;
expect(baselineResults).toHaveLength(10);

// Scale up Tenant B: add K more plans (simulates "noisy neighbor" scenario)
const K = 5000;
await bulkCreatePlans({ tenantId: tenantB.id, count: K });

// Measure latency after Tenant B scaling
const tAfter0 = performance.now();
const afterResults = await stateStore.listPlans({
  tenantId: tenantA.id,
  projectId: tenantA.defaultProject,
});
const afterMs = performance.now() - tAfter0;
expect(afterResults).toHaveLength(10); // Still only Tenant A plans

// Performance Profile (SHOULD): Tenant A query latency SHOULD NOT increase materially
// Pass if latency increase is ≤ 30% + 10ms absolute (allows for index growth, lock contention)
// NOTE: This is a SHOULD constraint, not MUST; flakiness due to vacuum/autovacuum/IO is expected
expect(afterMs).toBeLessThanOrEqual(baseMs * 1.3 + 10);
```

**Verification (SHOULD - Performance Profile only)**:

- ✅ Query latency increase ≤ 30% + 10ms despite 50x cross-tenant data growth (relative scaling, not absolute)
- ⚠️ **Flakiness expected**: This test SHOULD run only in controlled Performance Profile environments (warmed caches, pinned CPU, no vacuum interference)
- ✅ MUST requirements verified in Test 2.2 (predicate + row isolation)

**Storage Profile: PostgreSQL (SHOULD)**  
If using PostgreSQL, verify query plan includes tenant-scoped filter (EXPLAIN analysis):

```typescript
if (db.dialect === 'postgres') {
  const explainResult = await db.query(
    'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM plans WHERE tenant_id = $1',
    [tenantA.id]
  );
  const plan = explainResult.rows.map((r) => r['QUERY PLAN']).join('\n');

  // Verify tenant-scoped filter present (NOT prescriptive about index usage)
  expect(plan).toMatch(/Filter:.*tenant_id\s*=\s*['"]?[^'"]+['"]?/i); // Tenant predicate exists

  // AVOID: expect(plan).not.toMatch(/Seq Scan/) - Seq scan MAY be legitimate for small tables or outdated stats
  // Accept any plan shape (Index Scan, Bitmap, Seq Scan) as long as tenant filter is applied

  // Verify no cross-tenant access in actual rows returned
  const actualResults = await db.query(
    'SELECT DISTINCT tenant_id FROM plans WHERE tenant_id = $1 LIMIT 100',
    [tenantA.id]
  );
  expect(actualResults.rows.every((r) => r.tenant_id === tenantA.id)).toBe(true);
}
```

**Note**: PostgreSQL query planner may choose Seq Scan legitimately (small table, low cardinality, missing stats, or after VACUUM). Normative requirement is **tenant predicate presence** and **correct rowresults**, not specific plan shape.

**References**:

- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) - query plan analysis
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - RLS policies as defense-in-depth

---

## 3. Error Message Inference Tests

### Existence Masking Policy

**Policy Configuration**: APIs MUST choose one consistent **MASKING_MODE** per endpoint class:

- `MASKING_MODE=FORBIDDEN`: Always return 403 Forbidden (masks existence as "no permission")
- `MASKING_MODE=NOT_FOUND`: Always return 404 Not Found (masks permission as "does not exist")

What matters for **INV-SCOPE-03** is **indistinguishability**, not the specific HTTP status code. See [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) for HTTP semantics.

**Endpoint Class Mapping** (normative configuration guide):

| Endpoint Class                  | Examples                                     | Recommended MASKING_MODE | Rationale                                       |
| ------------------------------- | -------------------------------------------- | ------------------------ | ----------------------------------------------- |
| Object read by ID               | `/plans/:id`, `/runs/:id`                    | `FORBIDDEN`              | RBAC denial semantics ("you can't access this") |
| Object mutation (update/delete) | `POST /runs/:id/cancel`, `DELETE /plans/:id` | `FORBIDDEN`              | Action-based; implies permission model          |
| Collection listing              | `GET /plans`, `GET /runs`                    | N/A (return empty list)  | Implicit tenant-scoping; no masking needed      |
| Artifact/blob fetch             | `/artifacts/:id/download`                    | `NOT_FOUND`              | Resource-centric semantics ("doesn't exist")    |

Deployments MUST document their chosen MASKING_MODE per endpoint class in deployment configuration. Tests adapt expectations accordingly.

### Test 3.1: Indistinguishable Error Responses

**Test ID**: `ISOL-ERROR-001`  
**Invariant**: INV-SCOPE-03  
**Requirement**: Error responses MUST be indistinguishable between "exists-but-forbidden" and "nonexistent" cases.

**Anti-pattern**:

```typescript
// ❌ BAD: Reveals resource existence via status code difference
if (!resourceExists(id)) {
  return { status: 404, message: 'Resource not found' };
}
if (!hasPermission(user, resource)) {
  return { status: 403, message: "You don't own this resource" };
}
```

**Correct patterns**:

```typescript
// ✅ GOOD (MASKING_MODE=FORBIDDEN): Always 403
if (!resourceExists(id) || !hasPermission(user, resource)) {
  return { status: 403, message: 'Access denied' };
}

// ✅ GOOD (MASKING_MODE=NOT_FOUND): Always 404
if (!resourceExists(id) || !hasPermission(user, resource)) {
  return { status: 404, message: 'Not found' };
}
```

**Test** (MASKING_MODE-agnostic):

```typescript
const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

const planB = await createPlan({ tenantId: tenantB.id, name: 'Tenant B Plan' });

// Case 1: Tenant A accesses Tenant B's plan (exists, but no permission)
const response1 = await apiClient.withAuth(tenantA.auth).get(`/plans/${planB.id}`);

// Case 2: Tenant A accesses non-existent plan
const response2 = await apiClient.withAuth(tenantA.auth).get(`/plans/nonexistent`);

// Responses MUST be indistinguishable
expect(response1.status).toBe(response2.status); // Same status code (per MASKING_MODE)
expect(response1.body.message).toBe(response2.body.message); // Same error message
expect(response1.body.code).toBe(response2.body.code); // Same error code (if present)

// Body schema MUST be identical (no extra fields in one case)
expect(Object.keys(response1.body).sort()).toEqual(Object.keys(response2.body).sort());

// Headers MUST be consistent (whitelist approach: only compare standard headers)
// Normative header whitelist for masked error responses:
const HEADER_WHITELIST_MASKED = [
  'content-type',
  'cache-control',
  'vary',
  'content-language',
  // Excluded (unique per request): date, x-request-id, x-trace-id, server
];
const standardHeaders = (res: Response) => {
  const headers: Record<string, any> = {};
  HEADER_WHITELIST_MASKED.forEach((key) => {
    if (res.headers[key]) headers[key] = res.headers[key];
  });
  return headers;
};
expect(standardHeaders(response1)).toEqual(standardHeaders(response2));
```

**Verification**:

- ✅ Same HTTP status code (403 or 404, per MASKING_MODE)
- ✅ Identical error message and error code
- ✅ Identical body schema (no extra fields)
- ✅ Consistent headers (except unique request IDs)
- ✅ No metadata leaked (owner, creation date, etc.)

---

### Test 3.2: No Stack Trace Leakage

**Test ID**: `ISOL-ERROR-002`  
**Invariant**: INV-SCOPE-03  
**Requirement**: Error responses must not include stack traces or internal paths in production.

**Test**:

```typescript
// Induce error condition (e.g., malformed request)
const response = await apiClient.post('/plans', {
  tenantId: null, // Invalid scope
  plan: {
    /* malformed */
  },
});

expect(response.status).toBe(400);
expect(response.body.message).toMatch(/^Invalid request/);

// MUST NOT include stack trace (production mode)
expect(response.body.stack).toBeUndefined();
expect(response.body.trace).toBeUndefined();
expect(response.body.stackTrace).toBeUndefined();

// MUST NOT include internal file paths or package details
const bodyStr = JSON.stringify(response.body);
expect(bodyStr).not.toMatch(/\/src\//);
expect(bodyStr).not.toMatch(/\/engine\//);
expect(bodyStr).not.toMatch(/node_modules/);
expect(bodyStr).not.toMatch(/\.ts:\d+/); // TypeScript source locations
```

**Verification**:

- ✅ No stack traces in production errors
- ✅ No internal file paths leaked
- ✅ Generic error code + user-friendly message only

---

## 4. Quota Leakage Tests

### Test 4.1: Resource Exhaustion Does Not Reveal Other Tenant Quotas

**Test ID**: `ISOL-QUOTA-001`  
**Invariant**: INV-SCOPE-03  
**Requirement**: Tenant A hitting their quota must not reveal Tenant B's quota or usage.

**Test**:

```typescript
const tenantA = await createTenant({ name: 'Tenant A', quota: { maxRuns: 10 } });
const tenantB = await createTenant({ name: 'Tenant B', quota: { maxRuns: 1000 } });

// Exhaust Tenant A quota
for (let i = 0; i < 10; i++) {
  await startWorkflow({ tenantId: tenantA.id, planId: 'plan-a' });
}

// 11th run should fail with generic quota error
const response = await apiClient.withAuth(tenantA.auth).post('/runs', {
  planId: 'plan-a',
});

expect(response.status).toBe(429); // Too Many Requests
expect(response.body.message).toMatch(/quota exceeded/i);

// Error MUST NOT reveal:
// - Tenant B quota (1000 runs)
// - Total system capacity
// - Other tenant usage
expect(response.body.systemQuota).toBeUndefined();
expect(response.body.otherTenants).toBeUndefined();
```

**Verification**:

- ✅ Quota error is tenant-specific (no system-wide info)
- ✅ No cross-tenant quota information leaked
- ✅ Retry-After header uses tenant-specific calculation

---

### Test 4.2: Rate Limiting Independence

**Test ID**: `ISOL-QUOTA-002`  
**Invariant**: INV-SCOPE-03  
**Requirement**: Tenant A rate limiting MUST NOT affect Tenant B's ability to make requests within their quota.

**Test** (independence, not absolute throughput):

```typescript
const tenantA = await createTenant({ name: 'Tenant A', rateLimit: { rps: 10 } });
const tenantB = await createTenant({ name: 'Tenant B', rateLimit: { rps: 100 } });

// Exhaust Tenant A rate limit (send 2x their quota)
for (let i = 0; i < 20; i++) {
  await apiClient.withAuth(tenantA.auth).get('/plans');
}

// Tenant A now rate-limited
const responseA = await apiClient.withAuth(tenantA.auth).get('/plans');
expect(responseA.status).toBe(429); // Too Many Requests

// Tenant B should continue to succeed (make requests at ~50% of their quota)
const responsesB = [];
for (let i = 0; i < 50; i++) {
  responsesB.push(await apiClient.withAuth(tenantB.auth).get('/plans'));
}

// Tenant B requests MUST succeed (within their quota, despite Tenant A exhaustion)
const successCount = responsesB.filter((r) => r.status === 200).length;
const errorRate = 1 - successCount / responsesB.length;
expect(errorRate).toBeLessThan(0.05); // < 5% error rate (allows for transient issues)

// Optional: Verify separate rate limit bucket keys (instrumentation hook)
if (rateLimiter.getInstrumentation) {
  const keysUsed = rateLimiter.getInstrumentation().lastKeys;
  expect(keysUsed).toContain(`tenant:${tenantA.id}`);
  expect(keysUsed).toContain(`tenant:${tenantB.id}`);
  expect(keysUsed.length).toBeGreaterThanOrEqual(2); // Separate buckets
}
```

**Verification**:

- ✅ Tenant A rate-limited (429 status)
- ✅ Tenant B requests succeed with < 5% error rate
- ✅ Independent rate limit buckets per tenant (verified via instrumentation)
- ✅ No "noisy neighbor" effect (Tenant A exhaustion doesn't block Tenant B)

**Shared downstream saturation** (additional consideration):

- This test proves **rate limiter bucket isolation** (entrypoint-level fairness)
- Does NOT prove isolation when shared downstream resources saturate (DB connection pool, worker queue, disk I/O)
- For full noisy neighbor prevention, deployments MUST also enforce per-tenant concurrency caps at worker execution layer (e.g., max 10 concurrent DB queries per tenant)
- See [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) - API4:2023 Unrestricted Resource Consumption

**Error rate definition** (normative):

- **Numerator**: HTTP 5xx responses (500, 502, 503, 504) indicating server-side failure
- **Denominator**: Total requests sent by Tenant B
- **Exclusions**: 429 (rate limit) and 4xx (client errors) do NOT count as "errors" for this metric
- Threshold: < 5% indicates stable multi-tenant isolation under load

### Test 4.3: Rate Limiting Independence Under Concurrency

**Test ID**: `ISOL-QUOTA-003`  
**Invariant**: INV-SCOPE-03  
**Requirement**: Tenant A rate limiting under concurrent load MUST NOT affect Tenant B's ability to make requests within their quota.

**Test** (concurrency-based noisy neighbor validation):

```typescript
const tenantA = await createTenant({ name: 'Tenant A', rateLimit: { rps: 10 } });
const tenantB = await createTenant({ name: 'Tenant B', rateLimit: { rps: 100 } });

// Tenant A saturates rate limit with 100 parallel requests (10x quota)
const tenantARequests = Array.from({ length: 100 }, () =>
  apiClient.withAuth(tenantA.auth).get('/plans')
);

// Tenant B makes steady requests at 50% of their quota (50 RPS over 1 second)
const tenantBRequests = [];
const startTime = Date.now();
while (Date.now() - startTime < 1000) {
  tenantBRequests.push(apiClient.withAuth(tenantB.auth).get('/plans'));
  await sleep(20); // ~50 RPS
}

// Execute concurrently
const [responsesA, responsesB] = await Promise.all([
  Promise.allSettled(tenantARequests),
  Promise.allSettled(tenantBRequests),
]);

// Tenant A MUST be rate-limited (majority 429 responses)
const tenantARateLimited = responsesA.filter(
  (r) => r.status === 'fulfilled' && r.value.status === 429
).length;
expect(tenantARateLimited).toBeGreaterThan(50); // > 50% rate-limited

// Tenant B MUST succeed (< 5% 5xx error rate despite Tenant A saturation)
const tenantBSuccess = responsesB.filter(
  (r) => r.status === 'fulfilled' && r.value.status === 200
).length;
const tenantB5xxErrors = responsesB.filter(
  (r) => r.status === 'fulfilled' && r.value.status >= 500 && r.value.status < 600
).length;
// Error rate counts 5xx only (excludes 4xx client errors and 429 rate limits)
const errorRate5xx = tenantB5xxErrors / responsesB.length;
expect(errorRate5xx).toBeLessThan(0.05); // < 5% 5xx error rate
```

**Verification**:

- ✅ Tenant A rate-limited under concurrent saturation (> 50% 429 responses)
- ✅ Tenant B requests succeed with < 5% error rate despite Tenant A load
- ✅ **Concurrency isolation**: Parallel execution reveals true noisy neighbor behavior
- ✅ Independent rate limit buckets per tenant (functional independence)

**Note**: Use deterministic fake clock or test rate limiter adapter to avoid CI flakiness.

---

## 5. Existence Oracle Tests

### Test 5.1: No Existence Leakage via API Behavior

**Test ID**: `ISOL-ORACLE-001`  
**Invariant**: INV-SCOPE-03  
**Requirement**: API behavior must be identical whether resource exists (but unauthorized) or does not exist.

**Test**:

```typescript
const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

const planB = await createPlan({ tenantId: tenantB.id, name: 'Tenant B Plan' });

// Request 1: Existing plan (Tenant B owns it)
const req1 = await apiClient.withAuth(tenantA.auth).get(`/plans/${planB.id}`);

// Request 2: Non-existent plan
const req2 = await apiClient.withAuth(tenantA.auth).get(`/plans/fake-id-999`);

// Both requests MUST be indistinguishable
expect(req1.status).toBe(req2.status); // Same HTTP status
expect(req1.body.message).toBe(req2.body.message); // Same error message
expect(req1.headers['x-request-id']).toBeTruthy(); // Request ID present
expect(req2.headers['x-request-id']).toBeTruthy();

// Response timing MUST be similar (tested in ISOL-TIMING-001)
```

**Verification**:

- ✅ HTTP status identical (403 or 404 per MASKING_MODE, for both queries)
- ✅ Error message identical
- ✅ Response headers identical (except request-specific IDs)

---

### Test 5.2: No Existence Leakage via GraphQL Schema

**Test ID**: `ISOL-ORACLE-002`  
**Invariant**: INV-SCOPE-03  
**Requirement**: If using GraphQL, schema introspection must not reveal tenant-specific types or fields.

**Production mode consideration**: If `GRAPHQL_INTROSPECTION=DISABLED` (hardened production deployment), introspection queries MUST return masked error (403/404 per MASKING_MODE), not schema data.

**Test** (introspection enabled):

```graphql
# Anti-pattern: Tenant-specific types visible in schema
type TenantBSpecialPlan { # ❌ BAD: Reveals Tenant B exists
  id: ID!
  secretField: String
}
```

**Correct pattern**:

```graphql
# Generic types only; tenant context implicit in auth
type Plan {
  id: ID!
  name: String
  # tenantId resolved from auth token, not user input
}
```

**Test** (introspection query from Tenant A):

```typescript
//If introspection disabled, accept either HTTP-level or GraphQL-level masking
if (GRAPHQL_INTROSPECTION === 'DISABLED') {
  const response = await apiClient.withAuth(tenantA.auth).post('/graphql', {
    query: `{ __schema { types { name } } }`,
  });

  // GraphQL servers MAY return 200 with errors[] OR HTTP error status
  if (response.status === 200) {
    // Standard GraphQL error pattern (errors[], no data)
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(response.body.errors[0].message).toMatch(/access denied|introspection.*disabled/i);
    expect(response.body.data).toBeUndefined(); // No schema leaked
  } else {
    // HTTP-level masking (gateway policy)
    const expectedStatus = MASKING_MODE === 'FORBIDDEN' ? 403 : 404;
    expect(response.status).toBe(expectedStatus);
    expect(response.body.message || response.body.errors?.[0]?.message).toMatch(
      /access denied|not found/i
    );
  }
} else {
  // Introspection enabled: verify schema does not leak tenant-specific types
  const schema = await apiClient.withAuth(tenantA.auth).post('/graphql', {
    query: `{
      __schema {
        types {
          name
          fields { name }
        }
      }
    }`,
  });

  // Schema MUST NOT include tenant-specific types
  const typeNames = schema.data.__schema.types.map((t) => t.name);
  expect(typeNames).not.toContain('TenantBSpecialPlan');
  expect(typeNames).not.toContain('TenantBSecret');
}
```

**Verification**:

- ✅ **Production mode**: Introspection disabled → masked error (per MASKING_MODE)
- ✅ **Development mode**: Schema does not contain tenant-specific types
- ✅ Tenant context implicit (from auth token)
- ✅ GraphQL errors generic (no field-level leakage)

**Reference**: [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) - API3:2023 Broken Object Property Level Authorization

---

### Test 5.3: No Cache/ETag Existence Oracle

**Test ID**: `ISOL-ORACLE-003`  
**Invariant**: INV-SCOPE-03  
**Requirement**: HTTP cache headers and ETags MUST NOT differ between "exists-but-forbidden" and "nonexistent" cases.

**Normative cache policy for masked endpoints**: To eliminate cache oracle classes, endpoints returning masked errors (403/404) MUST:

- Set `Cache-Control: no-store` (prevent caching entirely)
- Omit `ETag` header (or use fixed constant ETag across all masked responses)
- Use consistent `Vary` header (if any)

This is the **simplest and safest normative stance**. See [RFC 9111 (HTTP Caching)](https://www.rfc-editor.org/rfc/rfc9111.html) for cache semantics.

**Test**:

```typescript
const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

const planB = await createPlan({ tenantId: tenantB.id, name: 'Tenant B Plan' });

// Request 1: Existing plan (Tenant B owns it)
const req1 = await apiClient.withAuth(tenantA.auth).get(`/plans/${planB.id}`);

// Request 2: Non-existent plan
const req2 = await apiClient.withAuth(tenantA.auth).get(`/plans/nonexistent`);

// Normative: Both MUST have Cache-Control: no-store
expect(req1.headers['cache-control']).toMatch(/no-store/);
expect(req2.headers['cache-control']).toMatch(/no-store/);

// Normative: ETag MUST be omitted for masked responses (simplest oracle prevention)
expect(req1.headers['etag']).toBeUndefined();
expect(req2.headers['etag']).toBeUndefined();

// Standard headers MUST be identical (RFC 9111)
const standardHeaders = (res: Response) => ({
  cacheControl: res.headers['cache-control'],
  vary: res.headers['vary'],
  contentType: res.headers['content-type'],
});
expect(standardHeaders(req1)).toEqual(standardHeaders(req2));

// Response body schema MUST be identical
const schema1 = Object.keys(req1.body).sort();
const schema2 = Object.keys(req2.body).sort();
expect(schema1).toEqual(schema2);
```

**Verification**:

- ✅ **Normative**: `Cache-Control: no-store` present in both responses (simplest oracle elimination)
- ✅ **Normative**: ETag MUST be omitted for masked responses (resource-derived ETags leak metadata)
- ✅ Standard headers identical (whitelist: content-type, cache-control, vary, content-language)
- ✅ Response body schema identical (same keys)
- ✅ No cache HIT/MISS differences (no-store prevents caching)
- ⚠️ **Content-Length caveat**: If error payloads differ in size (e.g., due to randomized request IDs), compression side-channels (gzip/br) may reveal size differences. Best practice: use constant-size error payloads for masked responses, or disable compression for error endpoints.

**Reference**: [RFC 9111 HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) - `no-store` directive eliminates cache-based oracles

---

### Test 5.4: No Collection Listing Inference (Pagination Oracle)

**Test ID**: `ISOL-ORACLE-004`  
**Invariant**: INV-SCOPE-03  
**Requirement**: Collection listing endpoints MUST NOT leak cross-tenant information via pagination metadata (`totalCount`, `pageCount`, `nextCursor`) or response timing.

**Threat**: API returns `{items: [], totalCount: 0}` for Tenant A but `totalCount` field presence/absence differs when system has zero vs many plans. Or pagination cursors leak existence of cross-tenant resources.

**Test**:

```typescript
const tenantA = await createTenant({ name: 'Tenant A' });
const tenantB = await createTenant({ name: 'Tenant B' });

// Tenant A has zero plans, Tenant B has 1000 plans
await bulkCreatePlans({ tenantId: tenantB.id, count: 1000 });

// Tenant A lists plans (empty result)
const responseA = await apiClient.withAuth(tenantA.auth).get('/plans?limit=50');

// Verify:
// 1. Zero rows returned (no cross-tenant leakage)
expect(responseA.body.items).toHaveLength(0);

// 2. Pagination metadata MUST NOT leak system-wide counts
if (responseA.body.totalCount !== undefined) {
  expect(responseA.body.totalCount).toBe(0); // Tenant-scoped count, not system-wide
}
if (responseA.body.pageCount !== undefined) {
  expect(responseA.body.pageCount).toBe(0); // Tenant-scoped pages
}
if (responseA.body.nextCursor !== undefined) {
  expect(responseA.body.nextCursor).toBeNull(); // No next page for empty tenant
}

// 3. Response schema MUST be identical to "single-item tenant" case (no schema drift)
const tenantC = await createTenant({ name: 'Tenant C' });
await createPlan({ tenantId: tenantC.id, name: 'Single Plan' });
const responseC = await apiClient.withAuth(tenantC.auth).get('/plans?limit=50');

const schemaA = Object.keys(responseA.body).sort();
const schemaC = Object.keys(responseC.body).sort();
expect(schemaA).toEqual(schemaC); // Same keys (items, totalCount, etc.)

// 4. Timing MUST NOT scale with cross-tenant data volume
const t0 = performance.now();
await apiClient.withAuth(tenantA.auth).get('/plans?limit=50');
const latencyA = performance.now() - t0;

// Latency SHOULD be similar to single-item tenant (within 2x + 10ms)
const t1 = performance.now();
await apiClient.withAuth(tenantC.auth).get('/plans?limit=50');
const latencyC = performance.now() - t1;

expect(latencyA).toBeLessThan(latencyC * 2 + 10); // Generous threshold for flaky CI
```

**Verification**:

- ✅ Zero rows returned (no cross-tenant data)
- ✅ `totalCount` is tenant-scoped (0 for empty tenant, not system-wide count)
- ✅ `nextCursor` / `pageCount` consistent (null for empty, not hinting at other tenants)
- ✅ Response schema identical across tenants (no schema drift based on data volume)
- ✅ Timing does not scale with cross-tenant data volume (relative threshold)

**Reference**: [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) - API3:2023 Broken Object Property Level Authorization

---

## Test Execution

### Automated Test Suite

**Location**: `engine/test/security/tenant-isolation.test.ts`

**Execution**:

```bash
# Run all isolation tests
npm test -- --grep="tenant-isolation"

# Run specific test category
npm test -- --grep="ISOL-DIRECT"   # Direct access (RLS, tenant-scoped predicate)
npm test -- --grep="ISOL-TIMING"   # Timing analysis (statistical, KS test, N≥200)
npm test -- --grep="ISOL-PERF"     # Performance scaling (SHOULD, PerfProfile only)
npm test -- --grep="ISOL-ERROR"    # Error message indistinguishability
npm test -- --grep="ISOL-QUOTA"    # Resource independence (rate limiting, concurrency)
npm test -- --grep="ISOL-ORACLE"   # Existence oracles (API, GraphQL, cache/ETag)
```

**CI Integration** (normative gating strategy):

- **Every PR + main commit** (MUST):
  - ISOL-DIRECT-\* (RLS, scope enforcement, row isolation)
  - ISOL-ERROR-\* (error message indistinguishability)
  - ISOL-ORACLE-\* (API oracles, GraphQL, cache/ETag, collection listing)
  - ISOL-QUOTA-001/002 (independent quotas, rate limiting)
- **Nightly on Performance Profile runners** (MUST for timing-sensitive tests):
  - ISOL-TIMING-001 (statistical timing oracle with N=200+, pinned CPU)
  - ISOL-PERF-001 (database scaling independence, EXPLAIN analysis)
  - ISOL-QUOTA-003 (concurrency-based noisy neighbor)
- **Optional on PR** (SHOULD, but MAY skip if flaky):
  - ISOL-TIMING-001 (if using pinned runners; otherwise nightly only)

**Merge gate**: PR merge blocked by failures in MUST-run-on-PR tests. Nightly timing failures block next day's releases (not individual PRs) unless using pinned runners.

**Rationale**: Timing tests are sensitive to shared CI runner contention, cloud network latency, and non-pinned CPU scheduling. Running them nightly on controlled Performance Profile runners (pinned CPU, stable network, same host) eliminates flakiness while maintaining strong security guarantees. Teams with pinned CI runners MAY enable timing tests on every PR.

---

### Manual Penetration Testing

**Frequency**: Quarterly (before each major release)

**Scope**:

- Attempt SQL injection with cross-tenant queries (test adapter + RLS)
- **Statistical timing analysis with N≥1000 samples** (controlled Performance Profile environment, non-parametric tests)
- Error message fuzzing (malformed requests, boundary conditions)
- Cache oracle testing (verify `Cache-Control: no-store` policy, ETag consistency)
- **Quota exhaustion under concurrent load** (100+ parallel requests, noisy neighbor validation)
- GraphQL introspection + mutation testing (if applicable; test both enabled and disabled modes)

**Report**: Document findings in `docs/security/pentest-YYYY-MM-DD.md`

---

## Compliance Checklist

### Pre-Production Deployment (MUST)

- [ ] All ISOL-DIRECT tests pass (RLS enforcement, zero cross-tenant rows, tenant-scoped predicates)
- [ ] All ISOL-TIMING tests pass (no statistically significant timing oracle: median/P95 ≤ threshold AND KS test p ≥ 0.01)
- [ ] All ISOL-ERROR tests pass (indistinguishable error responses per MASKING_MODE configuration)
- [ ] All ISOL-QUOTA tests pass (independent rate limits under concurrency, < 5% error rate for unaffected tenant)
- [ ] All ISOL-ORACLE tests pass (no existence leakage via API, GraphQL production mode, `Cache-Control: no-store` policy)

### Performance Profile (SHOULD - optional for performance environments)

- [ ] ISOL-PERF-001 passes (database query scaling independence: latency increase ≤ 30% + 10ms)
- [ ] Controlled environment: warmed caches, pinned CPU, no vacuum/autovacuum interference

### Continuous Monitoring

- [ ] Automated test suite runs in CI (every commit)
- [ ] Quarterly penetration testing scheduled
- [ ] Audit log reviewed for suspicious access patterns
- [ ] Alerting configured for authorization denial spikes

---

## References

### Security Contracts

- [SECURITY_INVARIANTS.v1.md](SECURITY_INVARIANTS.v1.md) - INV-SCOPE-03 (no cross-tenant inference)
- [IAuthorization.v1.md](../contracts/security/IAuthorization.v1.md) - Authorization interface
- [IStateStoreAdapter.v1.md](../contracts/state-store/IStateStoreAdapter.v1.md) - Tenant-scoped query requirements
- [THREAT_MODEL.md](THREAT_MODEL.md) - T1 (cross-tenant data access), T10 (timing attacks)

### Standards & Security Best Practices

- [OWASP Timing Attacks](https://owasp.org/www-community/attacks/Timing_Attack) - Statistical analysis methodology (Kolmogorov-Smirnov, Mann-Whitney U)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) - API3:2023 Broken Object Property Level Authorization
- [RFC 9110 (HTTP Semantics)](https://www.rfc-editor.org/rfc/rfc9110.html) - Status code semantics (403 vs 404)
- [RFC 9111 (HTTP Caching)](https://www.rfc-editor.org/rfc/rfc9111.html) - Cache-Control: no-store directive, cache oracle prevention

### Database & Performance

- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - RLS implementation guide
- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) - Query plan analysis for tenant-scoped index verification

---

_Last updated: 2026-02-12_  
_Version: 1.1_  
_Status: Normative - MUST pass all ISOL-DIRECT, ISOL-TIMING, ISOL-ERROR, ISOL-QUOTA, ISOL-ORACLE tests_
