---
title: G8 - Real Auth for apps/api Final Specification
status: Implemented
owner: architecture
last_reviewed: 2026-03-07
planning_type: final-spec
---

# G8 - Real Auth for apps/api Final Specification

Final consolidated specification for closing `G8` with a production-oriented authentication and authorization boundary for `apps/api`, aligned with:

- Domain-Driven Design (DDD)
- Hexagonal Architecture
- SOLID
- CQRS-compatible application boundaries
- Existing DVT+ invariants

## Related documents

- `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
- `docs/planning/gaps/GAP_PARALLEL_EXECUTION_TRACKS.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0031-adapter-tenant-isolation.md`
- `docs/architecture/engine/contracts/security/IAuthorization.v1.md`
- `docs/architecture/engine/security/SECURITY_INVARIANTS.v1.md`

## External references

- Martin Fowler — Service Layer: <https://martinfowler.com/eaaCatalog/serviceLayer.html>
- Martin Fowler — Repository: <https://martinfowler.com/eaaCatalog/repository.html>
- Martin Fowler — Separated Presentation: <https://martinfowler.com/eaaDev/SeparatedPresentation.html>
- Martin Fowler — Presentation Domain Data Layering: <https://martinfowler.com/bliki/PresentationDomainDataLayering.html>
- Martin Fowler — Layering Principles: <https://martinfowler.com/bliki/LayeringPrinciples.html>
- Martin Fowler — Gateway: <https://martinfowler.com/articles/gateway-pattern.html>
- Patterns of Enterprise Application Architecture catalog: <https://martinfowler.com/eaaCatalog/>

---

# 1. Executive decision

`G8` must be implemented as an **application-boundary authorization design**, not as a middleware-only feature.

The selected solution is:

1. Authentication at the HTTP boundary using a provider-agnostic verifier behind a port.
2. Authorization as explicit application/domain logic, independent from Fastify and independent from JWT libraries.
3. Protected-by-default runtime endpoints.
4. Structured audit of grant/deny decisions.
5. Explicit propagation of an authorized execution context into application use cases.

`G8` is **not closed** by merely adding JWT verification. It is closed only when authenticated identity, tenant-scoped authorization, auditability, and boundary enforcement are all implemented and tested together.

---

# 2. Normative architectural position

## 2.1 What G8 is

`G8` is the missing security boundary for `apps/api`.

It exists because the system already has:

- multi-tenant execution semantics,
- tenant-scoped persistence,
- engine-level authorization abstractions,
- and future runtime operations that will be exposed via HTTP,

but still lacks a real authenticated and authorized entry boundary.

## 2.2 What G8 is not

`G8` is not:

- a generic IAM integration exercise,
- a route-by-route collection of ad hoc checks,
- a Fastify-only plugin task,
- a full enterprise PDP rollout,
- or a reason to leak JWT/provider concerns into the engine core.

---

# 3. Mandatory invariants

The following invariants are mandatory for G8 close-out.

## 3.1 Authentication invariants

1. Every protected endpoint must require a valid authenticated principal.
2. Missing or invalid token must fail before application use-case execution.
3. JWT/provider logic must remain outside engine/core packages.
4. Verification must validate issuer, audience, algorithm, key selection, and temporal claims.

## 3.2 Authorization invariants

1. Every protected command/query must be authorized explicitly before execution.
2. Tenant scope must be enforced before the use case is invoked.
3. Default behavior is deny.
4. Authorization policy must be explicit, typed, and testable.
5. Authorization must not depend on raw Fastify request objects downstream.

## 3.3 Audit invariants

1. Every allow/deny decision must be auditable.
2. Audit records must be structured.
3. Audit records must not persist raw bearer tokens.
4. Audit must include correlation/request metadata sufficient for traceability.

## 3.4 Exposure invariants

1. Runtime endpoints are protected by default.
2. Public operational endpoints must be explicitly allowlisted.
3. Deployment-sensitive endpoints must be controllable by configuration and infrastructure exposure policy.

---

# 4. Layering model

## 4.1 Domain

The domain owns the vocabulary and semantics of authorization.

Domain objects include:

- `AuthenticatedPrincipal`
- `RequestedScope`
- `AuthorizationOutcome` (replaces `AuthorizationDecision` — includes `approvedScope` and `rationale`)
- `DeniedReason`
- `TenantId`, `ProjectId`, `EnvironmentId`
- `ExecutionScope`
- `EffectivePrincipalAccess`, `TenantGrant`, `ProjectGrant`, `EnvironmentGrant`
- `AuthorizationAction` (discriminated union: `command` | `query`)

The domain also owns the **authorization policy contract** because authorization rules are business/security rules, not HTTP concerns.

### Rule

`IAuthorizationPolicy` must be defined in the **domain layer**.

This resolves the ambiguity between application and domain: application orchestrates authorization, but domain defines what authorization means.

## 4.2 Application

The application layer orchestrates the sequence:

1. receive authenticated principal,
2. load effective access from server-side repository (Model B),
3. evaluate authorization policy,
4. build an authorized execution context,
5. call the use case,
6. emit security audit events.

The application layer must not know about:

- Fastify request objects,
- JWT parsing libraries,
- JWKS retrieval mechanisms.

## 4.3 Infrastructure

Infrastructure implements:

- token verification (`JwksJwtVerifier` via `jose`),
- JWKS/public-key retrieval (remote JWKS set),
- Fastify integration,
- HTTP error mapping (`authErrorMapper` in `entrypoints/http`),
- audit sink adapters (`StructuredAuditLogger`),
- principal access persistence (`PostgresPrincipalAccessRepository`).

Infrastructure does not define business authorization rules.

---

# 5. Boundary responsibilities

## 5.1 HTTP adapter responsibilities

The HTTP adapter is responsible for:

1. extracting bearer token,
2. invoking authentication,
3. parsing route/body/query input,
4. constructing requested scope,
5. invoking application facade,
6. mapping `StartRunFacadeResult` to HTTP response via `mapStartRunFacadeResult`.

It must not contain duplicated authorization rules.

## 5.2 Application facade responsibilities

`StartRunAuthorizedFacade` is responsible for:

1. invoking authentication,
2. invoking authorization,
3. invoking the use case with the authorized context,
4. returning a typed semantic result (`StartRunFacadeResult`), **not an HTTP model**.

## 5.3 Application service responsibilities

`AuthorizeCommandScopeService` is responsible for:

1. loading effective principal access from `IPrincipalAccessRepository`,
2. evaluating `IAuthorizationPolicy`,
3. emitting security audit via `IAuthAuditPort`,
4. returning either an `AuthorizedCommandExecutionContext` or a `DeniedReason`.

## 5.4 Domain policy responsibilities

`TenantHierarchyAuthorizationPolicy` is responsible for:

1. evaluating whether a principal can perform an action under a requested scope,
2. resolving tenant → project → environment hierarchy,
3. checking `TOKEN_ASSERTION_CONFLICT` when token carries asserted tenant IDs,
4. producing a typed `AuthorizationOutcome` with `rationale`,
5. remaining pure and testable.

---

# 6. Domain model

## 6.1 Principal

```ts
export interface AuthenticatedPrincipal extends PrincipalRef {
  readonly subjectId: string;
  readonly issuer: string;
  readonly audience: string;
  readonly principalType: 'user' | 'service';
  readonly tokenId?: string;
  readonly issuedAt?: Date;
  readonly expiresAt: Date;
  readonly rawScopes: ReadonlyArray<string>;
  readonly assertedTenantIds: ReadonlyArray<string>;
  readonly assertedProjectIds: ReadonlyArray<string>;
}
```

## 6.2 Effective access (Model B server-side resolution)

```ts
export interface EffectivePrincipalAccess {
  readonly principal: PrincipalRef;
  readonly suspended: boolean;
  readonly tenantAccess: ReadonlyMap<string, TenantGrant>;
}
```

Grant hierarchy: `TenantGrant` → `ProjectGrant` → `EnvironmentGrant`.
Each level carries `allowedActions: ReadonlyArray<string>`.

## 6.3 Scope and action

```ts
export type AuthorizationAction =
  | { readonly kind: 'command'; readonly name: 'run:start' | 'run:cancel' | 'run:retry' }
  | { readonly kind: 'query'; readonly name: 'run:view' | 'run:list' | 'run:logs:view' };

export interface RequestedScope {
  readonly tenantId: TenantId;
  readonly projectId?: ProjectId;
  readonly environmentId?: EnvironmentId;
  readonly action: AuthorizationAction;
}
```

## 6.4 Authorization outcome

```ts
export type AuthorizationOutcome =
  | {
      readonly kind: 'allow';
      readonly approvedScope: ExecutionScope;
      readonly rationale: AuthorizationRationale;
    }
  | {
      readonly kind: 'deny';
      readonly reason: DeniedReason;
      readonly rationale: AuthorizationRationale;
    };
```

`rationale` carries `evaluatedPrincipalId`, `source`, and matched IDs for traceability.

## 6.5 Domain authorization policy

```ts
export interface IAuthorizationPolicy {
  evaluate(
    principal: AuthenticatedPrincipal,
    effectiveAccess: EffectivePrincipalAccess,
    requestedScope: RequestedScope
  ): AuthorizationOutcome;
}
```

---

# 7. Authentication and authorization flow

## 7.1 Mandatory sequence

The sequence must be:

1. HTTP adapter extracts bearer token.
2. `OidcAuthenticator` delegates to `IJwtVerifierGateway` (implemented by `JwksJwtVerifier`).
3. On auth failure, adapter maps to `StartRunFacadeResult { kind: 'unauthenticated' }` → `401`.
4. HTTP adapter parses request body and builds `RequestedScope`.
5. `AuthorizeCommandScopeService` loads `EffectivePrincipalAccess` from `IPrincipalAccessRepository`.
6. `TenantHierarchyAuthorizationPolicy.evaluate()` is called.
7. Security audit is emitted via `IAuthAuditPort` for both grant and deny paths.
8. On denial, facade returns `{ kind: 'unauthorized' }` → `403`.
9. On grant, `AuthorizedCommandExecutionContext` is built and use case is invoked.
10. Facade returns `{ kind: 'accepted' }` → `202`.

## 7.2 Critical rule

The use case must not re-check raw authorization if it receives an `AuthorizedCommandExecutionContext`.

That avoids duplicated policy logic and removes the inconsistency of "already authorized but checked again anyway."

---

# 8. Failure model

## 8.1 Facade semantic result

The facade returns a typed semantic result — **not an HTTP model**:

```ts
export type StartRunFacadeResult =
  | { readonly kind: 'unauthenticated'; readonly code: AuthenticationFailureCode }
  | { readonly kind: 'unauthorized'; readonly reason: DeniedReason }
  | { readonly kind: 'accepted'; readonly result: StartRunResult };
```

## 8.2 HTTP mapping

HTTP mapping belongs **only** in `entrypoints/http/authErrorMapper.ts`:

```ts
export function mapStartRunFacadeResult(result: StartRunFacadeResult): HttpResponseModel {
  switch (result.kind) {
    case 'unauthenticated':
      return { status: 401, body: { error: 'UNAUTHORIZED', code: result.code } };
    case 'unauthorized':
      return { status: 403, body: { error: 'FORBIDDEN', code: result.reason } };
    case 'accepted':
      return {
        status: 202,
        body: { runId: result.result.runId, accepted: result.result.accepted },
      };
  }
}
```

No HTTP response types or mapping functions live in `application/ports`.

---

# 9. Authorized execution context

## 9.1 Context model

```ts
export interface AuthorizedCommandExecutionContext {
  readonly principal: AuthenticatedPrincipal;
  readonly scope: ExecutionScope; // approvedScope from policy outcome
  readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
  readonly requestId: string;
  readonly authorizedAt: Date;
}
```

## 9.2 Normative rule

Application use cases that require authorization must accept `AuthorizedCommandExecutionContext`, not a weaker context. This guarantees by type that the orchestration step has already succeeded.

---

# 10. Audit model

## 10.1 Separation of audit responsibilities

There are two different audit layers:

1. **Security decision audit** — emitted by `AuthorizeCommandScopeService` for every grant/deny.
2. **Business/domain audit** — inside or after use-case execution.

These must not be conflated.

## 10.2 Security audit event

```ts
export interface AuthAuditEvent {
  readonly eventType: 'AUTH_GRANTED' | 'AUTH_DENIED';
  readonly requestId: string;
  readonly principalId: string;
  readonly principalType: 'user' | 'service';
  readonly tenantId?: string;
  readonly action: string;
  readonly denialReason?: string;
  readonly occurredAt: Date;
}
```

## 10.3 Implementation

`StructuredAuditLogger` implements `IAuthAuditPort` using Pino:

- `AUTH_GRANTED` → `logger.info` with `audit: true`
- `AUTH_DENIED` → `logger.warn` with `audit: true`

Raw bearer tokens are never included in audit records.

---

# 11. Public and protected routes

## 11.1 Exposure policy

| Route              | Exposure              | Implementation                                             |
| ------------------ | --------------------- | ---------------------------------------------------------- |
| `/healthz`         | Public                | Always registered                                          |
| `/readyz`          | Deployment-controlled | `DVT_READYZ_ENABLED=true` required                         |
| `/version`         | Deployment-controlled | `DVT_VERSION_ENABLED=true` required                        |
| `/db/ready`        | Internal-only         | `DVT_DB_READY_ENABLED=true` required                       |
| `POST /runs/start` | Protected             | Requires `OIDC_JWKS_URI` + `OIDC_ISSUER` + `OIDC_AUDIENCE` |

## 11.2 Meaning of deployment-controlled

"Deployment-controlled" is enforced by **all** of:

1. environment flag in application runtime,
2. explicit route registration conditional on that flag,
3. infrastructure/network exposure policy (outside this codebase).

Convention alone is not sufficient.

## 11.3 Protected routes registration

Protected runtime routes are registered only when all three OIDC variables are present:

```
OIDC_JWKS_URI   — JWKS endpoint URL
OIDC_ISSUER     — expected token issuer
OIDC_AUDIENCE   — expected token audience
OIDC_ALGORITHMS — allowed signing algorithms (default: RS256)
```

If any is absent, a warning is logged and the protected routes are not registered.

---

# 12. Scope binding model

## 12.1 Adopted model: Model B — token identity + server-side authorization resolution

The token authenticates the principal. Effective scope is resolved server-side via `IPrincipalAccessRepository`.

Rationale:

1. safer for multi-tenant evolution,
2. reduces coupling to token shape,
3. preserves flexibility for future policy growth,
4. better fits a long-lived platform boundary.

## 12.2 Token assertions as conflict guard

`assertedTenantIds` / `assertedProjectIds` in the token are used as a **conflict guard** only: if the token carries asserted IDs and they do not include the requested tenant, the policy returns `TOKEN_ASSERTION_CONFLICT`. They are not used as the authoritative source of grants.

---

# 13. Infrastructure implementations

## 13.1 JWT verifier — `JwksJwtVerifier`

- Location: `apps/api/src/infrastructure/auth/jwksJwtVerifier.ts`
- Uses `jose` (`createRemoteJWKSet` + `jwtVerify`)
- Maps `jose` errors to typed `JwtVerificationFailureCode`
- Validates: signature, issuer, audience, algorithms, expiry, nbf

## 13.2 Principal access repository — `PostgresPrincipalAccessRepository`

- Location: `apps/api/src/infrastructure/auth/postgresPrincipalAccessRepository.ts`
- Table: `{schema}.principal_grants`
- Schema: `principal_id`, `principal_type`, `suspended`, `tenant_access` (JSONB)
- `tenant_access` stores the full grant hierarchy as JSON arrays (deserializes to `ReadonlyMap`)
- Includes `migrate()` for table creation

## 13.3 Audit logger — `StructuredAuditLogger`

- Location: `apps/api/src/infrastructure/audit/structuredAuditLogger.ts`
- Wraps Pino logger
- Emits `auth.granted` / `auth.denied` with `audit: true` field

---

# 14. Code layout

```text
apps/api/
  src/
    entrypoints/http/
      authErrorMapper.ts          ← HTTP mapping (mapStartRunFacadeResult)
      startRunRoute.ts            ← Route handler

    application/
      services/
        AuthorizeCommandScopeService.ts
        StartRunAuthorizedFacade.ts
        NotImplementedStartRunUseCase.ts  ← placeholder until engine use case wired
      ports/
        auth.ts                   ← IAuthenticator, IAuthAuditPort, IPrincipalAccessRepository,
                                     StartRunFacadeResult, AuthorizedCommandExecutionContext

    domain/
      auth/
        types.ts                  ← All domain types and value objects
        policy.ts                 ← IAuthorizationPolicy, TenantHierarchyAuthorizationPolicy

    infrastructure/
      auth/
        oidcAuthenticator.ts      ← OidcAuthenticator + IJwtVerifierGateway
        jwksJwtVerifier.ts        ← JwksJwtVerifier (jose-based)
        postgresPrincipalAccessRepository.ts
      audit/
        structuredAuditLogger.ts

    plugins/
      env.ts                      ← OIDC_*, DVT_READYZ_ENABLED, DVT_VERSION_ENABLED, DVT_DB_READY_ENABLED

    routes/
      health.ts                   ← /healthz (public), /readyz (DVT_READYZ_ENABLED)
      version.ts                  ← /version (DVT_VERSION_ENABLED)
      dbReady.ts                  ← /db/ready (DVT_DB_READY_ENABLED)

    app.ts                        ← Wiring: OIDC guard → auth stack → POST /runs/start
```

---

# 15. Dependency rules

## 15.1 Allowed dependency direction

- `entrypoints/http` → `application`, `domain`
- `application` → `domain`
- `infrastructure` → `application` ports and/or `domain` contracts
- `domain` → no dependency on `application`, `entrypoints/http`, or infrastructure frameworks

## 15.2 Explicit anti-cycle rule

`domain` must never import from `application`.

This is why `IAuthorizationPolicy` and all domain types live in `domain/auth`, not in `application/ports`.

## 15.3 HTTP types in ports

`application/ports/auth.ts` must not export HTTP response models or mapping functions.
`StartRunFacadeResult` is a semantic result, not an HTTP model.
All HTTP mapping lives in `entrypoints/http/authErrorMapper.ts`.

---

# 16. Architectural test strategy

Architectural constraints must be tested, not merely described.

## 16.1 Suggested tooling

Use one or more of:

- `dependency-cruiser`
- `ts-arch`
- ESLint import restrictions (`no-restricted-imports`, layered path rules)

## 16.2 Required rules

At minimum, enforce:

1. `domain/**` cannot import from `application/**`, `entrypoints/**`, or `infrastructure/**`.
2. `application/**` cannot import Fastify or JWT libraries directly.
3. `engine/core` packages cannot import IAM/JWT dependencies.
4. routes cannot implement duplicated authorization policy logic.
5. `application/ports/**` cannot export HTTP response types or mapping functions.

---

# 17. Work breakdown

| Task | Scope                       | Status                                                             |
| ---- | --------------------------- | ------------------------------------------------------------------ |
| T8-1 | Auth config contract        | ✅ Done — `OIDC_*` vars in `env.ts`                                |
| T8-2 | Authentication adapter      | ✅ Done — `OidcAuthenticator` + `JwksJwtVerifier`                  |
| T8-3 | Domain authorization policy | ✅ Done — `TenantHierarchyAuthorizationPolicy`                     |
| T8-4 | Authorization orchestration | ✅ Done — `AuthorizeCommandScopeService` + `StructuredAuditLogger` |
| T8-5 | Protected runtime endpoint  | ✅ Done — `POST /runs/start` wired in `app.ts`                     |
| T8-6 | Architectural tests         | ⏳ Pending — `dependency-cruiser` rules not yet enforced           |
| T8-7 | Engine use case wiring      | ⏳ Pending — `NotImplementedStartRunUseCase` placeholder in place  |

---

# 18. Validation plan

## 18.1 Functional validation

1. Missing token on protected endpoint → `401`
2. Invalid signature / issuer / audience → `401`
3. Malformed explicit tenant scope → `400`
4. Valid token with denied tenant/action → `403`
5. Valid token with allowed tenant/action → `202`
6. Public endpoints (`/healthz`) still respond without auth
7. `/readyz`, `/version`, `/db/ready` respond only when their flag is enabled

## 18.2 Architectural validation

1. No JWT library imported from engine/core packages
2. No Fastify imports inside application services
3. `IAuthorizationPolicy` defined in `domain/auth`
4. Use cases consume `AuthorizedCommandExecutionContext`
5. Security audit emitted at authorization decision point
6. No HTTP response types in `application/ports`

## 18.3 Regression validation

1. Existing public operational routes continue to work
2. Observability hooks continue to emit request lifecycle logs
3. Background reconciliation runtime remains isolated from HTTP auth concerns

---

# 19. Closure criteria for G8

`G8` is closed only when all of the following are true:

- [x] Auth configuration contract exists in `apps/api` (`OIDC_*` env vars with Zod schema)
- [x] Authentication adapter verifies real tokens at HTTP boundary (`JwksJwtVerifier` via `jose`)
- [x] Domain authorization policy is implemented and tested (`TenantHierarchyAuthorizationPolicy`)
- [x] Protected runtime endpoint exists and is auth-enforced end to end (`POST /runs/start`)
- [x] Authorized execution context is required by protected use cases (`AuthorizedCommandExecutionContext`)
- [x] Grant/deny security audit is emitted in structured form (`StructuredAuditLogger`)
- [x] Public/deployment-controlled/internal route exposure is implemented explicitly (flags in `env.ts`)
- [ ] Architectural tests enforce layer and dependency rules (`dependency-cruiser` pending)
- [x] Negative-path tests cover `400`, `401`, and `403`
- [x] No IAM/JWT dependency leaks into engine/core packages
- [ ] Engine-backed `IStartRunUseCase` replaces `NotImplementedStartRunUseCase`

---

# 20. Open items (post-G8)

| Item                                    | Notes                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| Architectural tests                     | Wire `dependency-cruiser` with rules from §16.2                                               |
| Engine use case                         | Replace `NotImplementedStartRunUseCase` with real engine integration                          |
| Token revocation / blacklist            | Not in scope for G8; evaluate if long-lived tokens are used                                   |
| Clock skew tolerance                    | `jose` handles `nbf` and `exp` with no skew by default; add `clockTolerance` if needed        |
| `principalId` / `subjectId` unification | Both are `claims.sub` in `OidcAuthenticator`; evaluate if internal principal IDs will diverge |

---

# 21. Final verdict

The correct DVT+ shape for `G8` is:

- **authentication as infrastructure**,
- **authorization as domain/application logic**,
- **use cases driven by authorized context**,
- **HTTP as adapter only**,
- **audit as first-class boundary output**,
- **protected by default**,
- **typed and testable failure model**,
- **semantic facade result — no HTTP types in application layer**,
- **strict dependency direction with no domain contamination**.

Anything weaker will look implemented while still leaving the architecture exposed to drift and security regression.
