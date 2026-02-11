# Plugin Sandbox Contract (Extension, Normative v1.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0  
**Stability**: Extension policy — breaking changes require version bump  
**Consumers**: Engine Runtime, PluginRuntime, Security/Ops  
**Scope**: Applies only when an ExecutionPlan references plugins or extension code.  
**References**:  
- [IWorkflowEngine.v1.md](../engine/IWorkflowEngine.v1.md)  
- Node.js security guidance: https://nodejs.org/en/learn/security/  
- gVisor: https://gvisor.dev/  
- isolated-vm: https://www.npmjs.com/package/isolated-vm  

---

## 1) Goals & Non-Goals

### Goals
- Provide a **normative** sandbox and trust-tier policy for executing plugins.
- Prevent plugins from becoming an implicit capability escalation path.
- Define a **minimal contract surface** for plugin execution inputs/outputs.

### Non-Goals
- Define plugin APIs in detail (that belongs to `IPluginRuntime` contract).
- Specify implementation details for every runtime (only normative constraints + required properties).

---

## 2) Trust Tiers (Normative)

Plugins MUST be classified into exactly one trust tier:

```ts
type PluginTrustTier = "trusted" | "partner" | "untrusted";
```

### 2.1 Tier Semantics (MUST)

| Tier | Intended Source | Default Network | Isolation | Notes |
|------|------------------|----------------|-----------|------|
| `trusted` | Core-maintained | allow (tenant-network allowed) | process/container boundary REQUIRED | still least-privilege |
| `partner` | Verified vendors | allowlist only | stronger isolation REQUIRED | outbound only to allowlist |
| `untrusted` | Community / unknown | none | strongest isolation REQUIRED | deny-by-default everywhere |

**Invariant**:
- Engine MUST NOT execute a plugin without an explicit tier classification.
- If absent, runtime MUST treat plugin as `untrusted`.

---

## 3) Isolation Requirements (Normative)

### 3.1 VM-based sandboxing is forbidden
- Runtime MUST NOT rely on `vm2` or Node `vm`-based sandboxing as a security boundary.
- For `untrusted` and `partner`, runtime MUST use a **process/container/VM** isolation boundary.

Rationale (non-normative): JS VM sandboxes have a long history of escapes; treat them as unsafe boundaries.

### 3.2 Minimum isolation by tier

#### trusted
- MUST run in a separate OS process OR container boundary.
- SHOULD run with a dedicated OS user, least privileges.

#### partner
- MUST run in a container sandbox with restrictive seccomp/AppArmor (or equivalent).
- MUST enforce network allowlist.
- MUST enforce CPU/memory limits.

#### untrusted
- MUST run in a hardened sandbox (e.g., gVisor / microVM / equivalent strong isolation).
- MUST enforce **network none** (no outbound, no inbound).
- MUST enforce strict resource quotas and timeouts.

---

## 4) Environment & Secret Access (Normative)

### 4.1 process.env access is forbidden for partner/untrusted
- `partner` and `untrusted` plugins MUST NOT receive `process.env`.
- Inputs MUST be explicitly provided via the plugin invocation payload.

### 4.2 Secrets handling
- Plugins MUST receive only **resolved secret values** required for the invocation, scoped to:
  `(tenantId, environmentId, projectId, runId)` (or stricter).
- Secrets MUST NOT be persisted to StateStore event log.
- Plugins MUST NOT be able to enumerate all secrets.

---

## 5) Network Policy (Normative)

### 5.1 Default deny
- Network MUST be deny-by-default for `partner` and `untrusted`.

### 5.2 Allowlist
- If `partner` requires network, outbound destinations MUST be configured via allowlist:
  - domains and/or IP ranges
  - ports
  - protocols

### 5.3 Untrusted network
- `untrusted` MUST have no network access.

---

## 6) Filesystem Policy (Normative)

- `partner` and `untrusted` MUST run with a read-only filesystem, except a dedicated ephemeral temp directory.
- Temp directory MUST be cleared after invocation.
- Plugins MUST NOT access host filesystem paths outside assigned sandbox.

---

## 7) Execution Limits (Normative)

Runtime MUST enforce:
- `timeoutMs` (wall-clock)
- `maxMemoryMb`
- `maxCpuMillis` (or equivalent CPU quota)
- max output size (stdout/stderr and returned payload)

If limit exceeded:
- Invocation MUST fail with a structured error:
  - `category = "PLUGIN_SANDBOX"`
  - `code = "TIMEOUT" | "OOM" | "CPU_LIMIT" | "OUTPUT_LIMIT" | "POLICY_DENIED"`

---

## 8) Observability & Audit (Normative)

For every plugin invocation, runtime MUST emit an audit record (as an event or separate audit store), containing:
- `tenantId`, `projectId`, `environmentId`, `runId`, `stepId` (if applicable)
- `pluginId`, `pluginVersion`
- `trustTier`
- `startedAt`, `completedAt`, `status`
- `resourceUsage` (cpu/mem best-effort)
- `policy` summary (network=none/allowlist, fs=ro, isolation kind)

Audit records MUST NOT include secret values.

---

## 9) Integration Point with ExecutionPlan (Normative)

This extension MAY be referenced by plan metadata.

Allowed optional metadata field:

```ts
type PluginPolicyRef = {
  trustTier?: PluginTrustTier;  // default: "untrusted"
  network?: { mode: "none" | "allowlist"; allowlist?: string[] };
  limits?: { timeoutMs?: number; maxMemoryMb?: number; maxCpuMillis?: number };
};
```

**Rules**:
- If `trustTier` is provided, runtime MUST enforce at least the tier minimums in Sections 3-7.
- If `trustTier` is absent, treat as `untrusted`.
- Plan metadata MUST NOT weaken platform policy (can only be stricter).

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-11 | Initial extension contract (trust tiers, sandboxing, env/secrets, network, limits, audit) |
