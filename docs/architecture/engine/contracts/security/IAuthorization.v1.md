# IAuthorization.v1.md - Authorization Contract

**Version**: 1.0  
**Status**: NORMATIVE (Required Contract)  
**Phase**: Phase 1 (documentation), Phase 4 (implementation)  

---

## Purpose

Define the authorization interface that the **API boundary** must implement to prevent unauthorized access to resources.

**Invariant**: Every resource access (plan, run, artifact) must be authorized before reaching the engine.

---

## Interface

```typescript
interface IAuthorization {
  /**
   * Check if actor can perform action on resource.
   * 
   * @throws UnauthorizedError if authorization check fails
   * @param actor - User or service account performing the action
   * @param action - What they're trying to do (PLAN_READ, RUN_START, etc.)
   * @param resource - What they're trying to access (plan-123, run-456, etc.)
   * @param context - Request context (IP, user agent, request ID for audit)
   * 
   * @example
   * await auth.authorize(
   *   'user-123',
   *   'PLAN_READ',
   *   { type: 'plan', id: 'plan-abc', tenantId: 'tenant-1' },
   *   { ip: '1.2.3.4', requestId: 'req-xyz' }
   * );
   */
  authorize(
    actor: ActorId,
    action: Action,
    resource: Resource,
    context: AuthContext
  ): Promise<void>;

  /**
   * Emit audit event for authorization decision.
   * 
   * Called **both on success and failure** to create complete audit trail.
   * 
   * @param decision - 'GRANTED' | 'DENIED'
   * @param context - Full context including why decision was made
   */
  auditAuthDecision(
    decision: AuthDecision,
    context: AuthContext
  ): Promise<void>;
}
```

---

## Type Definitions

```typescript
/**
 * Actor: User or service account performing the action
 */
type ActorId = 'user-123' | 'service-account-456';

/**
 * Action: What resource operation the actor is trying to perform
 */
enum Action {
  // Plan operations
  PLAN_CREATE = 'PLAN_CREATE',
  PLAN_READ = 'PLAN_READ',
  PLAN_UPDATE = 'PLAN_UPDATE',
  PLAN_DELETE = 'PLAN_DELETE',
  
  // Run operations
  RUN_START = 'RUN_START',
  RUN_CANCEL = 'RUN_CANCEL',
  RUN_READ_STATUS = 'RUN_READ_STATUS',
  
  // Signal operations
  SIGNAL_SEND = 'SIGNAL_SEND',
  
  // Artifact operations
  ARTIFACT_READ = 'ARTIFACT_READ',
  ARTIFACT_DELETE = 'ARTIFACT_DELETE',
  
  // Plugin operations
  PLUGIN_INSTALL = 'PLUGIN_INSTALL',
  PLUGIN_UNINSTALL = 'PLUGIN_UNINSTALL',
  
  // Admin operations
  TENANT_READ = 'TENANT_READ',
  RBAC_ROLE_ASSIGN = 'RBAC_ROLE_ASSIGN',
}

/**
 * Resource: What's being accessed (must include tenantId)
 */
interface Resource {
  type: 'plan' | 'run' | 'artifact' | 'plugin' | 'tenant';
  id: string;
  tenantId: string;
}

/**
 * Authorization decision with audit context
 */
interface AuthDecision {
  actor: ActorId;
  action: Action;
  resource: Resource;
  decision: 'GRANTED' | 'DENIED';
  reason?: string;  // Why was it denied? 'RBAC_POLICY_X', 'TENANT_ISOLATION', etc.
  decisionPolicy?: string;  // Which policy enforced this? (for audit)
}

/**
 * Request context for both authorization and audit
 */
interface AuthContext {
  tenantId: string;
  requestId: string;
  timestamp: ISO8601;
  ip: string;
  userAgent?: string;
  // Optional custom context
  [key: string]: any;
}
```

---

## RBAC Roles (Phase 4)

At implementation time (Phase 4), define roles with specific permissions:

```typescript
enum Role {
  TENANT_ADMIN = 'tenant-admin',      // All permissions within tenant
  PLAN_AUTHOR = 'plan-author',        // Create, update plans
  OPERATOR = 'operator',               // Start, cancel, signal runs
  AUDITOR = 'auditor',                 // Read-only logs
  VIEWER = 'viewer',                   // Read plans and run status
}

interface RolePermissions {
  role: Role;
  permissions: Set<Action>;
}

const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  [Role.TENANT_ADMIN]: {
    role: Role.TENANT_ADMIN,
    permissions: new Set([
      // All actions
      ...Object.values(Action)
    ]),
  },
  [Role.PLAN_AUTHOR]: {
    role: Role.PLAN_AUTHOR,
    permissions: new Set([
      Action.PLAN_CREATE,
      Action.PLAN_READ,
      Action.PLAN_UPDATE,
      Action.PLAN_DELETE,
      Action.RUN_READ_STATUS,
    ]),
  },
  [Role.OPERATOR]: {
    role: Role.OPERATOR,
    permissions: new Set([
      Action.RUN_START,
      Action.RUN_CANCEL,
      Action.RUN_READ_STATUS,
      Action.SIGNAL_SEND,
    ]),
  },
  [Role.AUDITOR]: {
    role: Role.AUDITOR,
    permissions: new Set([
      Action.PLAN_READ,
      Action.RUN_READ_STATUS,
      // Audit log read (not in Action enum, assumed)
    ]),
  },
  [Role.VIEWER]: {
    role: Role.VIEWER,
    permissions: new Set([
      Action.PLAN_READ,
      Action.RUN_READ_STATUS,
    ]),
  },
};
```

---

## Authorization Invariants

**I1: Authorization Enforced at API Boundary**
```
┌─────────────────────┐
│     EXTERNAL API    │
│   ↓ authenticate    │
│   ↓ authorize ← I1   │  ← Security boundary
└─────────────────────┘
┌─────────────────────┐
│      ENGINE         │  ← Assumes commands are
│   (no auth check)   │     pre-authorized
└─────────────────────┘
```

**I2: Engine Never Performs Authorization**
- Engine is a pure state machine
- Assumes input is pre-authorized
- Does not know about RBAC, tenants, or permissions
- If authorization check is needed at runtime, it's a bug in API boundary design

**I3: Every Authorization Decision is Audited**
```typescript
try {
  await auth.authorize(actor, action, resource, context);
  // SUCCESS - log grant
  await auth.auditAuthDecision('GRANTED', { actor, action, resource, ... });
} catch (e) {
  // FAILURE - log denial
  await auth.auditAuthDecision('DENIED', { actor, action, resource, reason: e.message, ... });
  throw e;
}
```

**I4: tenantId in Every Resource**
```typescript
// ✅ GOOD - tenantId included
const resource = {
  type: 'plan',
  id: 'plan-abc',
  tenantId: 'tenant-1'  // Always present
};

// ❌ BAD - no tenantId
const badResource = {
  type: 'plan',
  id: 'plan-abc'
  // Missing tenantId - breaks isolation
};
```

**I5: Tenant Isolation Checks at Query Time**
```typescript
// ❌ WRONG - check tenantId in application code
const plan = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
if (plan.tenantId !== actor.tenantId) {
  throw new UnauthorizedError();
}

// ✅ RIGHT - check tenantId at database level (RLS)
// Database enforces: WHERE tenantId = current_user_tenant_id
const plan = await db.query(
  'SELECT * FROM plans WHERE id = $1 AND tenantId = $2',
  [planId, actor.tenantId]
);
// DB returns NULL if tenant mismatch, application never sees it
```

---

## Implementation Requirements (Phase 4)

1. **Must implement IAuthorization interface**
   - `authorize()` checks RBAC policy
   - `auditAuthDecision()` logs to audit trail

2. **Must validate tenantId before each action**
   - No cross-tenant data access at application level
   - Database RLS enforces at data level

3. **Must implement role-based access control**
   - Map actor → role → permissions
   - Handle custom roles (extension point)

4. **Must be testable**
   - Test grid: actors × actions × resources = coverage
   - Mock RBAC policy for test isolation

---

## Usage Example (Phase 4)

```typescript
// API endpoint for starting a run
async function startRun(req: Request) {
  const { planId } = req.params;
  const { actor, tenantId } = req.auth;
  
  // STEP 1: Authorize at API boundary
  await auth.authorize(
    actor,
    Action.RUN_START,
    { type: 'plan', id: planId, tenantId },
    {
      tenantId,
      requestId: req.id,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }
  );
  
  // STEP 2: Retrieve plan (database enforces tenantId)
  const plan = await stateStore.getPlan(planId, tenantId);
  
  // STEP 3: Delegate to engine (it's pre-authorized)
  const runRef = await engine.submit(plan);
  
  // STEP 4: Return (no authorization needed for response)
  return { runId: runRef };
}

// Error handling
async function startRunWithErrorHandling(req: Request) {
  try {
    return await startRun(req);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      // Log denial (audit trail)
      await auth.auditAuthDecision('DENIED', {
        actor: req.auth.actor,
        action: Action.RUN_START,
        resource: { type: 'plan', id: req.params.planId, tenantId: req.auth.tenantId },
        reason: e.message,
        decisionPolicy: e.policy,
        ...req.context,
      });
      
      // Return generic error (don't leak policy info to client)
      return res.status(403).json({ error: 'Forbidden' });
    }
    throw e;
  }
}
```

---

## References

- [THREAT_MODEL.md](../THREAT_MODEL.md) - Security boundaries, threat scenarios
- [AuditLog.v1.md](AuditLog.v1.md) - Audit log schema (populated by auditAuthDecision)
- [design_principles.md](../../design_principles.md) - Security as architectural concern

---

_Last updated: 2026-02-11_
