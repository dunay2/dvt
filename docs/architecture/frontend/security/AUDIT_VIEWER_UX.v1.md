# AUDIT_VIEWER_UX.v1.md - Audit Viewer User Experience

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Normative (MUST follow this UX design)  
**Location**: docs/architecture/frontend/security/AUDIT_VIEWER_UX.v1.md

---

## Executive Summary

The **Audit Viewer** is a critical security tool for investigating user actions, compliance reporting, and incident response.

**Requirements**:
- **Search & Filter**: By actor, action, resource, date range
- **PII Redaction**: IP addresses, emails (unless user has `audit:view-pii` permission)
- **Export**: CSV export for compliance (max 10,000 rows per export)
- **Performance**: Search must return results in <2 seconds
- **Security**: Audit viewer access requires `audit:view:*` or `audit:view:self` permission

---

## 1. Page Layout

### 1.1 URL
`/audit`

**Route protection**:
- Requires `audit:view:*` OR `audit:view:self` permission
- Returns **403 Forbidden** page if user lacks permission
- No direct link in nav menu if user lacks permission (see [RBAC_UI_RULES.v1.md](RBAC_UI_RULES.v1.md))

### 1.2 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Audit Log                                    [Export]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filters:                                               │
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Actor       │ │ Action   │ │ Resource │ │ Dates  │ │
│  └─────────────┘ └──────────┘ └──────────┘ └────────┘ │
│  [Search]                                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Results: 250 entries (showing 1-50)         [Page 1/5]│
├─────────────────────────────────────────────────────────┤
│  Timestamp    Actor       Action       Resource         │
│  ─────────────────────────────────────────────────────  │
│  10:30 AM     alice@...   RUN_CANCEL   run-xyz          │
│  10:25 AM     bob@...     PLAN_EDIT    plan-abc         │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Filters

### 2.1 Actor Filter

**Type**: Text input with autocomplete

**Behavior**:
- User types email or user ID
- Autocomplete suggests recently seen actors (client-side cache)
- Backend query: `GET /v1/audit?actor=alice@example.com`

**Permissions**:
- If user has `audit:view:self`, default to own email (read-only)
- If user has `audit:view:*`, allow searching any actor

**Wireframe**:
```
Actor: [alice@example.com               ] ▼
       ┌──────────────────────────────┐
       │ alice@example.com (you)      │
       │ bob@example.com              │
       │ charlie@example.com          │
       └──────────────────────────────┘
```

---

### 2.2 Action Filter

**Type**: Multi-select dropdown

**Options**:
- `RUN_START`
- `RUN_CANCEL`
- `RUN_SIGNAL` (pause, resume, retry)
- `PLAN_CREATE`
- `PLAN_EDIT`
- `PLAN_DELETE`
- `ROLE_ASSIGN`
- `USER_INVITE`

**Backend query**: `GET /v1/audit?action=RUN_CANCEL,PLAN_EDIT`

**Wireframe**:
```
Action: [Select actions...              ] ▼
        ┌──────────────────────────────┐
        │ ☑ RUN_START                  │
        │ ☑ RUN_CANCEL                 │
        │ ☐ RUN_SIGNAL                 │
        │ ☐ PLAN_CREATE                │
        │ ☐ PLAN_EDIT                  │
        └──────────────────────────────┘
```

---

### 2.3 Resource Filter

**Type**: Text input

**Behavior**:
- User enters resource ID (e.g., `run-xyz`, `plan-abc`)
- No autocomplete (resource space is too large)
- Backend query: `GET /v1/audit?resource=run-xyz`

**Wireframe**:
```
Resource: [run-xyz                      ]
```

---

### 2.4 Date Range Filter

**Type**: Date range picker

**Default**: Last 30 days

**Max range**: 365 days (prevent expensive queries)

**Backend query**: `GET /v1/audit?startDate=2026-01-01&endDate=2026-01-31`

**Wireframe**:
```
Date Range: [2026-01-01] to [2026-01-31]
            ┌──────────────────────────────┐
            │   January 2026               │
            │  S  M  T  W  T  F  S         │
            │           1  2  3  4         │
            │  5  6  7  8  9 10 11         │
            │ 12 13 14 15 16 17 18         │
            │ ...                          │
            └──────────────────────────────┘
```

---

### 2.5 Search Button

**Behavior**:
- Triggers API call: `GET /v1/audit?actor=...&action=...&resource=...&startDate=...&endDate=...`
- Shows loading spinner while fetching
- Results appear in table below

**Performance**:
- Search MUST complete in <2 seconds
- Backend uses indexed queries (actor, action, timestamp)
- Pagination: 50 results per page

---

## 3. Results Table

### 3.1 Columns

| Column | Description | Width |
|--------|-------------|-------|
| **Timestamp** | ISO8601 timestamp, formatted as "MMM DD, HH:mm" | 15% |
| **Actor** | User email (redacted if no `view-pii` permission) | 25% |
| **Action** | Action type (e.g., `RUN_CANCEL`) | 15% |
| **Resource** | Resource ID (e.g., `run-xyz`) | 20% |
| **Decision** | `GRANTED` or `DENIED` | 10% |
| **Details** | Link to expand panel | 15% |

**Example row**:
```
| 10:30 AM | alice@example.com | RUN_CANCEL | run-xyz | GRANTED | [View] |
```

---

### 3.2 PII Redaction

If user lacks `audit:view-pii` permission:

| Original | Redacted |
|----------|----------|
| `alice@example.com` | `a•••e@example.com` |
| `1.2.3.4` | `•••.•••.•••.•••` |

**Implementation**:
```tsx
function redactEmail(email: string, canViewPII: boolean): string {
  if (canViewPII) return email;
  
  const [local, domain] = email.split('@');
  const redacted = `${local[0]}•••${local[local.length - 1]}`;
  return `${redacted}@${domain}`;
}
```

---

### 3.3 Row Click: Expand Details Panel

**Behavior**:
- Clicking a row expands a detail panel below it
- Panel shows full Decision Record (see [AuditLog.v1.md](../../engine/contracts/security/AuditLog.v1.md))

**Detail Panel Content**:

```
┌───────────────────────────────────────────────────────┐
│  Audit Entry: audit-12345                             │
├───────────────────────────────────────────────────────┤
│  Timestamp:      2026-02-11 10:30:15 UTC              │
│  Actor:          alice@example.com (user-123)         │
│  Action:         RUN_CANCEL                           │
│  Resource:       run-xyz (plan: dbt_daily_build)      │
│  Decision:       ✅ GRANTED                            │
│  Justification:  "Deploy in progress"                 │
│  IP Address:     1.2.3.4 (redacted if no view-pii)    │
│  Context:                                             │
│    - Previous status: RUNNING                         │
│    - Cancelled by: alice@example.com                  │
│    - Affected steps: 5 (3 completed, 2 cancelled)     │
└───────────────────────────────────────────────────────┘
```

---

### 3.4 Pagination

**Behavior**:
- 50 results per page
- Page controls at bottom of table: `[< Prev] [1] [2] [3] [4] [5] [Next >]`
- Cursor-based pagination (see [UI_API_CONTRACT.v1.md](../contracts/UI_API_CONTRACT.v1.md))

**API calls**:
```http
GET /v1/audit?cursor=abc123&limit=50
```

**Response**:
```json
{
  "entries": [ /* 50 audit entries */ ],
  "cursor": {
    "next": "def456", 
    "hasMore": true
  }
}
```

---

## 4. Export to CSV

### 4.1 Export Button

**Location**: Top-right corner of page

**Behavior**:
- Clicking "Export" opens modal
- Modal shows:
  - "Export 250 results to CSV?"
  - Warning: "Max 10,000 rows per export"
  - Button: "Download CSV"

**Permissions**:
- Requires `audit:export:*` permission
- Button hidden if user lacks permission

---

### 4.2 CSV Format

**Filename**: `audit-log-2026-02-11.csv`

**Columns**:
```csv
audit_id,timestamp,actor,action,resource,decision,justification,ip_address
audit-12345,2026-02-11T10:30:15Z,alice@example.com,RUN_CANCEL,run-xyz,GRANTED,"Deploy in progress",1.2.3.4
audit-12346,2026-02-11T10:25:00Z,bob@example.com,PLAN_EDIT,plan-abc,GRANTED,"Update schedule",5.6.7.8
```

**PII handling**:
- If user lacks `audit:view-pii`, redact email and IP in CSV
- CSV includes redacted values (not original)

---

### 4.3 Export API Call

```http
POST /v1/audit/export
Content-Type: application/json

{
  "filters": {
    "actor": "alice@example.com",
    "action": ["RUN_CANCEL"],
    "startDate": "2026-01-01",
    "endDate": "2026-01-31"
  },
  "limit": 10000
}
```

**Response**:
```json
{
  "downloadUrl": "https://s3.amazonaws.com/exports/audit-log-2026-02-11.csv?expires=...",
  "expiresAt": "2026-02-11T11:00:00Z"
}
```

**Frontend behavior**:
- Show progress bar: "Generating export..."
- Once `downloadUrl` received, automatically trigger browser download
- Link expires in 1 hour (backend-enforced)

---

## 5. Error States

### 5.1 No Results

**Display**:
```
┌───────────────────────────────────────────────────────┐
│  No audit entries found for the selected filters.    │
│  Try adjusting your search criteria.                 │
└───────────────────────────────────────────────────────┘
```

---

### 5.2 Search Timeout

If search takes >5 seconds, show:
```
┌───────────────────────────────────────────────────────┐
│  ⚠ Search is taking longer than expected...           │
│  Large date ranges or unindexed filters may be slow.  │
└───────────────────────────────────────────────────────┘
```

If search times out (backend returns 504), show:
```
┌───────────────────────────────────────────────────────┐
│  ❌ Search timed out. Try narrowing the date range.   │
└───────────────────────────────────────────────────────┘
```

---

### 5.3 Export Limit Exceeded

If user tries to export >10,000 rows:
```
┌───────────────────────────────────────────────────────┐
│  ⚠ Export limit exceeded                              │
│  Your filters match 15,000 entries, but the max       │
│  export size is 10,000 rows. Please narrow your       │
│  search criteria.                                     │
│                                        [OK]            │
└───────────────────────────────────────────────────────┘
```

---

## 6. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus actor filter |
| `Enter` | Trigger search |
| `Cmd/Ctrl + E` | Open export modal |
| `Esc` | Close detail panel |

---

## 7. Accessibility (A11y)

### 7.1 Screen Reader Support

- Table must have `role="table"` with proper headers
- Detail panel must announce when expanded: "Audit entry details expanded"
- Export modal must trap focus
- Filters must have `aria-label` attributes

**Example**:
```tsx
<table role="table" aria-label="Audit log entries">
  <thead>
    <tr>
      <th scope="col">Timestamp</th>
      <th scope="col">Actor</th>
      <th scope="col">Action</th>
      <th scope="col">Resource</th>
      <th scope="col">Decision</th>
    </tr>
  </thead>
  <tbody>
    {entries.map(entry => (
      <tr key={entry.id} onClick={() => expand(entry)}>
        <td>{formatTimestamp(entry.timestamp)}</td>
        <td>{redactEmail(entry.actor)}</td>
        <td>{entry.action}</td>
        <td>{entry.resource}</td>
        <td aria-label={entry.decision}>
          {entry.decision === 'GRANTED' ? '✅' : '❌'}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### 7.2 Keyboard Navigation

- Users MUST be able to navigate the table with `Tab` key
- Row selection via `Enter` key
- Detail panel closes with `Esc` key

---

## 8. Performance Requirements

| Metric | Target |
|--------|--------|
| Search response time | <2 seconds (p95) |
| Export generation (10k rows) | <10 seconds |
| Page load time (audit viewer) | <1 second |
| Detail panel expand | <100ms |

**Optimizations**:
- Backend uses indexed queries (actor, action, timestamp)
- Pagination limits result size (50 per page)
- No expensive JOINs in backend queries

---

## 9. Testing Requirements

### 9.1 Unit Tests

- PII redaction logic (email, IP)
- Filter query string generation
- CSV export format

### 9.2 Integration Tests

- Search API with various filters
- Export API (mock S3 download URL)
- Permission checks (403 for unauthorized users)

### 9.3 E2E Tests (Playwright)

See [GOLDEN_PATHS_UI.v1.md](../golden-paths/GOLDEN_PATHS_UI.v1.md) - GP-03: Audit Trail Review

---

## 10. References

- [AuditLog.v1.md](../../engine/contracts/security/AuditLog.v1.md) - Backend audit log contract
- [RBAC_UI_RULES.v1.md](RBAC_UI_RULES.v1.md) - Permission checks
- [UI_API_CONTRACT.v1.md](../contracts/UI_API_CONTRACT.v1.md) - API endpoints

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Normative - Audit viewer MUST follow this UX design_
