# UI_API_CONTRACT.v1.md - Frontend API Contract

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Normative (Contract)  
**Location**: docs/architecture/frontend/contracts/UI_API_CONTRACT.v1.md

---

## Executive Summary

This contract defines the **REST API** (or BFF if used) between frontend and backend backend must expose these endpoints with the specified request/response shapes, error codes, and paginationversioning strategy.

**Key Principles**:

- **Versioned**: Breaking changes → new version (v2)
- **Standard errors**: Consistent error shape across all endpoints
- **Pagination**: Cursor-based (not offset) for performance
- **Idempotency**: POST/PUT with idempotency keys where needed

---

## Base URL & Versioning

```
Base URL: https://api.dvt.example.com/v1
Versioning: URL path (/v1, /v2, ...)
```

**Version negotiation**:

- Frontend sends `Accept: application/json; version=1` header
- Backend responds with `API-Version: 1` header
- Breaking changes require new version number

---

## Authentication

All requests MUST include JWT token:

```http
Authorization: Bearer <jwt-token>
```

**Token payload** (minimum):

```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "roles": ["plan-author", "operator"],
  "exp": 1707648000
}
```

---

## Standard Error Response

```typescript
interface APIError {
  error: {
    code: string; // Machine-readable: "UNAUTHORIZED", "PLAN_NOT_FOUND"
    message: string; // Human-readable: "Insufficient permissions"
    requestId: string; // For support/debugging
    details?: unknown; // Optional context (validation errors, etc.)
  };
}
```

### HTTP Status Codes

| Code | Meaning             | Example                                                   |
| ---- | ------------------- | --------------------------------------------------------- |
| 200  | Success             | Plan retrieved                                            |
| 201  | Created             | Plan created                                              |
| 400  | Bad Request         | Invalid JSON, missing required field                      |
| 401  | Unauthenticated     | Missing/expired JWT                                       |
| 403  | Unauthorized        | User lacks permission (RBAC denial)                       |
| 404  | Not Found           | Plan ID doesn't exist **OR** user has no access (no leak) |
| 409  | Conflict            | Optimistic lock failure, plan already published           |
| 429  | Rate Limited        | Too many requests                                         |
| 500  | Internal Error      | Unhandled exception                                       |
| 503  | Service Unavailable | Backpressure, circuit breaker open                        |

**Security note**: `404` MUST NOT leak resource existence. Use `404` for both "doesn't exist" and "no access".

---

## Endpoints

### Plans

#### `GET /v1/plans`

List plans in current tenant/project.

**Query Parameters**:

```typescript
{
  projectId?: string;       // Filter by project
  status?: 'draft' | 'published' | 'archived';
  cursor?: string;          // Pagination cursor (opaque)
  limit?: number;           // Default: 20, max: 100
}
```

**Response** (200 OK):

```json
{
  "data": [
    {
      "planId": "plan-abc",
      "name": "dbt_daily_build",
      "status": "published",
      "version": 3,
      "createdAt": "2026-02-01T10:00:00Z",
      "updatedAt": "2026-02-10T15:30:00Z",
      "author": {
        "userId": "user-123",
        "name": "Alice"
      }
    }
  ],
  "pagination": {
    "nextCursor": "eyJwbGFuSWQiOiJwbGFuLXh5eiJ9", // Opaque cursor
    "hasMore": true
  }
}
```

---

#### `GET /v1/plans/:planId`

Get plan details + graph definition.

**Response** (200 OK):

```json
{
  "planId": "plan-abc",
  "name": "dbt_daily_build",
  "status": "published",
  "version": 3,
  "graph": {
    "nodes": [
      {
        "id": "node-1",
        "type": "dbt-model",
        "config": { "model": "staging.users" },
        "position": { "x": 100, "y": 200 }
      }
    ],
    "edges": [{ "source": "node-1", "target": "node-2" }]
  },
  "metadata": {
    "createdAt": "2026-02-01T10:00:00Z",
    "updatedAt": "2026-02-10T15:30:00Z",
    "author": { "userId": "user-123", "name": "Alice" }
  }
}
```

---

#### `POST /v1/plans`

Create new plan (draft).

**Request Body**:

```json
{
  "name": "my_new_plan",
  "projectId": "project-xyz",
  "graph": { "nodes": [], "edges": [] }
}
```

**Headers**:

```
Idempotency-Key: <uuid>  // Optional but recommended
```

**Response** (201 Created):

```json
{
  "planId": "plan-new",
  "name": "my_new_plan",
  "status": "draft",
  "version": 1
}
```

---

#### `PUT /v1/plans/:planId`

Update plan (draft only, no published edits).

**Request Body**:

```json
{
  "name": "updated_name",
  "graph": {
    /* updated graph */
  },
  "version": 2 // Optimistic locking
}
```

**Response** (200 OK):

```json
{
  "planId": "plan-abc",
  "version": 3 // Incremented
}
```

**Error** (409 Conflict if version mismatch):

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Plan was updated by another user. Please refresh.",
    "requestId": "req-xyz",
    "details": { "currentVersion": 4, "submittedVersion": 2 }
  }
}
```

---

### Runs

#### `GET /v1/runs`

List runs.

**Query Parameters**:

```typescript
{
  planId?: string;
  status?: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  cursor?: string;
  limit?: number;
}
```

**Response** (200 OK):

```json
{
  "data": [
    {
      "runId": "run-xyz",
      "planId": "plan-abc",
      "status": "RUNNING",
      "startedAt": "2026-02-11T10:00:00Z",
      "progress": { "completed": 5, "total": 10 },
      "cost": { "estimate": "$0.45 USD" }
    }
  ],
  "pagination": { "nextCursor": "...", "hasMore": false }
}
```

---

#### `POST /v1/runs`

Start new run.

**Request Body**:

```json
{
  "planId": "plan-abc",
  "environmentId": "prod",
  "inputs": { "start_date": "2026-02-01" }
}
```

**Headers**:

```
Idempotency-Key: <uuid>  // Prevent duplicate runs
```

**Response** (201 Created):

```json
{
  "runId": "run-new",
  "status": "RUNNING",
  "startedAt": "2026-02-11T10:05:00Z"
}
```

---

#### `POST /v1/runs/:runId/signal`

Send signal (PAUSE, RESUME, CANCEL, custom).

**Request Body**:

```json
{
  "signal": "PAUSE",
  "reason": "Deploy in progress" // Optional justification (Decision Record)
}
```

**Response** (200 OK):

```json
{
  "signalId": "sig-123",
  "status": "PAUSED"
}
```

---

### Artifacts

#### `GET /v1/runs/:runId/artifacts`

List artifacts produced by run.

**Response** (200 OK):

```json
{
  "data": [
    {
      "artifactId": "artifact-1",
      "name": "output.csv",
      "size": 1024000,
      "downloadUrl": "https://storage.../artifact-1?token=..."
    }
  ]
}
```

---

### Audit Logs

#### `GET /v1/audit`

Query audit logs (auditor role required).

**Query Parameters**:

```typescript
{
  actorId?: string;
  action?: string;
  resourceId?: string;
  startDate?: string;       // ISO8601
  endDate?: string;
  cursor?: string;
  limit?: number;
}
```

**Response** (200 OK):

```json
{
  "data": [
    {
      "auditId": "audit-123",
      "timestamp": "2026-02-11T10:00:00Z",
      "actor": { "userId": "user-123", "name": "Alice" },
      "action": "RUN_START",
      "resource": { "type": "run", "id": "run-xyz" },
      "decision": "GRANTED"
    }
  ],
  "pagination": { "nextCursor": "...", "hasMore": true }
}
```

---

## Pagination

**Cursor-based** (not offset):

```json
{
  "data": [
    /* items */
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6MTIzfQ==", // Opaque base64 cursor
    "hasMore": true
  }
}
```

**Why cursor?** Offset pagination breaks with concurrent inserts. Cursor encodes last item ID.

**Client usage**:

```http
GET /v1/plans?cursor=eyJpZCI6MTIzfQ==&limit=20
```

---

## Rate Limiting

**Headers** (per-tenant):

```
X-RateLimit-Limit: 1000        # Requests per hour
X-RateLimit-Remaining: 975
X-RateLimit-Reset: 1707651600  # Unix timestamp
```

**Response** (429 Too Many Requests):

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Retry after 120 seconds.",
    "requestId": "req-abc",
    "details": { "retryAfter": 120 }
  }
}
```

---

## Testing Requirements

### Contract Tests

```typescript
describe('UI_API_CONTRACT.v1', () => {
  it('GET /v1/plans returns standard shape', async () => {
    const response = await api.get('/v1/plans');

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('data');
    expect(response.data).toHaveProperty('pagination');
    expect(response.data.pagination).toHaveProperty('nextCursor');
    expect(response.data.pagination).toHaveProperty('hasMore');
  });

  it('POST /v1/plans with idempotency', async () => {
    const key = uuidv4();

    const resp1 = await api.post('/v1/plans', body, {
      headers: { 'Idempotency-Key': key },
    });

    const resp2 = await api.post('/v1/plans', body, {
      headers: { 'Idempotency-Key': key },
    });

    // Should return same planId (not create duplicate)
    expect(resp1.data.planId).toBe(resp2.data.planId);
  });
});
```

---

## References

- [VIEW_MODELS.v1.md](./VIEW_MODELS.v1.md) - UI-ready data structures
- [UI_EVENT_STREAM.v1.md](./UI_EVENT_STREAM.v1.md) - Real-time updates
- [Error Handling RFC](https://datatracker.ietf.org/doc/html/rfc7807) - Problem Details for HTTP APIs

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Normative - Backend MUST implement this contract_
