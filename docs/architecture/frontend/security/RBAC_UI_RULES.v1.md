# RBAC_UI_RULES.v1.md - Frontend Authorization Rules

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Normative (MUST follow these rules)  
**Location**: docs/architecture/frontend/security/RBAC_UI_RULES.v1.md

---

## Executive Summary

The frontend MUST enforce UI-level authorization rules based on the user's **effective permissions** retrieved from the backend.

**Philosophy**:

- **Defense in depth**: Backend always enforces authoritative decisions (see [IAuthorization.v1.md](../../engine/contracts/security/IAuthorization.v1.md))
- **Frontend responsibility**: Show/hide UI elements, disable buttons, prevent wasted API calls
- **NO client-side filtering**: Never filter lists (runs, plans) in the browser—always use backend `?filter=` queries

---

## 1. Permission Model

The frontend receives a **permission set** from `GET /v1/auth/me`:

```json
{
  "userId": "user-123",
  "roles": ["engineer", "viewer"],
  "permissions": [
    "plan:view:*",
    "plan:edit:team-123",
    "run:start:*",
    "run:cancel:*",
    "audit:view:self",
    "cost:view:team-123"
  ]
}
```

**Permission syntax**: `resource:action:scope`

- **resource**: `plan`, `run`, `audit`, `cost`, `admin`
- **action**: `view`, `edit`, `delete`, `start`, `cancel`, `signal`, `export`
- **scope**: `*` (all), `self` (own items), `team-123` (team-scoped)

---

## 2. UI Rules by Resource

### 2.1 Plans

| Permission                             | UI Rule                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `plan:view:*`                          | Show "Plans" nav link                                                                   |
| NO `plan:view:*`                       | Hide "Plans" nav link                                                                   |
| `plan:edit:*` or `plan:edit:${teamId}` | Enable "Edit Plan" button                                                               |
| NO edit permission                     | Disable "Edit Plan" button, show tooltip: "You don't have permission to edit this plan" |
| `plan:delete:*`                        | Show "Delete Plan" button (with confirmation modal)                                     |
| NO delete permission                   | Hide "Delete Plan" button entirely                                                      |
| `plan:create:*`                        | Show "New Plan" button                                                                  |
| NO create permission                   | Hide "New Plan" button                                                                  |

**Example React component**:

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function PlanDetailPage({ plan }) {
  const { can } = usePermissions();

  return (
    <div>
      <h1>{plan.name}</h1>

      {can('plan:edit', plan.teamId) && <button onClick={handleEdit}>Edit Plan</button>}

      {can('plan:delete', plan.teamId) && <button onClick={handleDelete}>Delete Plan</button>}

      {!can('plan:edit', plan.teamId) && (
        <Tooltip content="You don't have permission to edit this plan">
          <button disabled>Edit Plan</button>
        </Tooltip>
      )}
    </div>
  );
}
```

---

### 2.2 Runs

| Permission                               | UI Rule                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `run:start:*`                            | Enable "Run" button on plan detail page                                       |
| NO `run:start`                           | Disable "Run" button, show tooltip: "You don't have permission to start runs" |
| `run:cancel:*` or `run:cancel:${teamId}` | Show "Cancel" button (only for RUNNING/PAUSED runs)                           |
| NO cancel permission                     | Hide "Cancel" button                                                          |
| `run:signal:*`                           | Show "Pause", "Resume", "Retry" buttons                                       |
| NO signal permission                     | Disable signal buttons                                                        |
| `run:view:*`                             | Show "Runs" nav link, list all runs (via API)                                 |
| `run:view:self`                          | Show only user's own runs (backend filters via `?actor=self`)                 |
| NO `run:view`                            | Hide "Runs" nav link                                                          |

**CRITICAL**: Never filter runs in the browser. Always use backend query:

```tsx
// ❌ WRONG: Client-side filtering (leaks data)
const visibleRuns = allRuns.filter((run) => can('run:view', run.teamId));

// ✅ CORRECT: Backend filtering
const { data: runs } = useQuery(['runs', scope], () =>
  api.getRuns({ filter: scope === 'self' ? 'actor=self' : undefined })
);
```

---

### 2.3 Audit Logs

| Permission             | UI Rule                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `audit:view:*`         | Show "Audit" nav link, all records visible                   |
| `audit:view:self`      | Show only user's own actions (backend filters)               |
| NO `audit:view`        | Hide "Audit" nav link, return 403 if user navigates directly |
| `audit:export:*`       | Show "Export to CSV" button                                  |
| NO export permission   | Hide export button                                           |
| `audit:view-pii:*`     | Show IP addresses, emails in audit records                   |
| NO view-pii permission | Redact PII: `1.2.3.4` → `•••.•••.•••.•••`                    |

**Redaction example**:

```tsx
function AuditEntry({ entry, canViewPII }) {
  const ip = canViewPII ? entry.ip : entry.ip.replace(/\d+/g, '•••');

  return (
    <div>
      <span>IP: {ip}</span>
    </div>
  );
}
```

---

### 2.4 Cost Data

| Permission           | UI Rule                                                        |
| -------------------- | -------------------------------------------------------------- |
| `cost:view:*`        | Show cost panel on run detail page                             |
| `cost:view:team-123` | Show costs only for team-123 runs                              |
| NO `cost:view`       | Hide cost panel entirely, show message: "Cost data restricted" |
| `cost:export:*`      | Enable "Export Cost Breakdown" button                          |

---

### 2.5 Admin Features

| Permission           | UI Rule                              |
| -------------------- | ------------------------------------ |
| `admin:users:*`      | Show "Admin" nav link → "Users" page |
| `admin:roles:*`      | Show "Roles & Permissions" page      |
| NO admin permissions | Hide "Admin" nav link                |

---

## 3. Navigation Rules

The frontend MUST dynamically render the navigation menu based on permissions.

**Example navigation config**:

```tsx
const navItems = [
  {
    label: 'Plans',
    path: '/plans',
    permission: 'plan:view:*',
  },
  {
    label: 'Runs',
    path: '/runs',
    permission: 'run:view:*',
  },
  {
    label: 'Audit',
    path: '/audit',
    permission: 'audit:view:*',
  },
  {
    label: 'Admin',
    path: '/admin',
    permission: 'admin:users:*',
  },
];

function Navigation() {
  const { can } = usePermissions();

  return (
    <nav>
      {navItems
        .filter((item) => can(item.permission))
        .map((item) => (
          <NavLink key={item.path} to={item.path}>
            {item.label}
          </NavLink>
        ))}
    </nav>
  );
}
```

---

## 4. Route Guards

The frontend MUST guard routes and return **403 Forbidden** pages for unauthorized access.

**Example**:

```tsx
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

function ProtectedRoute({ permission, children }) {
  const { can, isLoading } = usePermissions();

  if (isLoading) return <Loading />;
  if (!can(permission)) return <Forbidden />;

  return children;
}

// In router config
<Route
  path="/admin"
  element={
    <ProtectedRoute permission="admin:users:*">
      <AdminPage />
    </ProtectedRoute>
  }
/>;
```

---

## 5. Preventing Wasted API Calls

The frontend SHOULD NOT make API calls that will fail with 403.

**Example**:

```tsx
// ❌ WRONG: Calls API even without permission
async function deleteRun(runId) {
  await api.delete(`/v1/runs/${runId}`); // → 403 error
}

// ✅ CORRECT: Check permission first
async function deleteRun(runId) {
  if (!can('run:delete', runId)) {
    toast.error('You do not have permission to delete this run');
    return;
  }

  await api.delete(`/v1/runs/${runId}`);
}
```

---

## 6. Button States

Buttons MUST follow this priority:

1. **Hidden**: If action is never available to this user (e.g., `plan:delete` for viewer role)
2. **Disabled with tooltip**: If action is temporarily unavailable (e.g., "Cancel" button on COMPLETED run)
3. **Enabled**: If action is available

**Example**:

```tsx
function RunControls({ run }) {
  const { can } = usePermissions();

  const canCancel = can('run:cancel', run.teamId);
  const isRunning = run.status === 'RUNNING';

  // Hidden if no permission at all
  if (!canCancel) return null;

  // Disabled if run is not running
  return (
    <Tooltip content={!isRunning ? 'Run is not active' : ''} disabled={isRunning}>
      <button disabled={!isRunning} onClick={handleCancel}>
        Cancel Run
      </button>
    </Tooltip>
  );
}
```

---

## 7. Error Handling

### 7.1 Backend Returns 403

If the backend returns `403 Forbidden` despite frontend checks:

```tsx
async function startRun(planId) {
  try {
    await api.post('/v1/runs', { planId });
  } catch (error) {
    if (error.status === 403) {
      toast.error('Permission denied. Your permissions may have changed.');
      // Optionally: Refresh permissions
      queryClient.invalidateQueries(['auth', 'me']);
    }
  }
}
```

### 7.2 Permission Expiry

Permissions MUST be refreshed:

- **On page load**: Always fetch `GET /v1/auth/me`
- **On 403 error**: Refetch permissions (may have been revoked)
- **Every 5 minutes**: Background refresh (optional, prevents stale permissions)

---

## 8. Testing Rules

Every UI rule MUST have a unit test:

```tsx
import { render, screen } from '@testing-library/react';
import { PermissionsProvider } from '@/contexts/PermissionsContext';

describe('PlanDetailPage', () => {
  it('hides delete button if user lacks plan:delete permission', () => {
    const mockPermissions = {
      permissions: ['plan:view:*'], // No delete permission
    };

    render(
      <PermissionsProvider value={mockPermissions}>
        <PlanDetailPage plan={mockPlan} />
      </PermissionsProvider>
    );

    expect(screen.queryByText('Delete Plan')).not.toBeInTheDocument();
  });

  it('shows delete button if user has plan:delete permission', () => {
    const mockPermissions = {
      permissions: ['plan:view:*', 'plan:delete:*'],
    };

    render(
      <PermissionsProvider value={mockPermissions}>
        <PlanDetailPage plan={mockPlan} />
      </PermissionsProvider>
    );

    expect(screen.getByText('Delete Plan')).toBeInTheDocument();
  });
});
```

---

## 9. Hook API: `usePermissions`

The frontend MUST provide a React hook for permission checks:

```tsx
import { useContext } from 'react';
import { PermissionsContext } from '@/contexts/PermissionsContext';

export function usePermissions() {
  const { permissions, isLoading } = useContext(PermissionsContext);

  function can(action: string, scope?: string): boolean {
    // Check exact match
    if (permissions.includes(`${action}:${scope || '*'}`)) {
      return true;
    }

    // Check wildcard
    const [resource, verb] = action.split(':');
    if (permissions.includes(`${resource}:${verb}:*`)) {
      return true;
    }

    return false;
  }

  return { can, isLoading };
}
```

**Usage**:

```tsx
const { can } = usePermissions();

if (can('plan:edit', 'team-123')) {
  // Show edit button
}
```

---

## 10. References

- [IAuthorization.v1.md](../../engine/contracts/security/IAuthorization.v1.md) - Backend authorization contract
- [AuditLog.v1.md](../../engine/contracts/security/AuditLog.v1.md) - Audit logging
- [UI_API_CONTRACT.v1.md](../contracts/UI_API_CONTRACT.v1.md) - API endpoints for permissions

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Normative - UI MUST follow these rules_
