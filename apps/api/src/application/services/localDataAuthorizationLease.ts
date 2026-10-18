/**
 * Owned concern: enforce current authorization and assertion lifetime at LOCAL operation checkpoints.
 * @baseline #3392: actions and decisions remain owned by the protected API authorization boundary.
 * @decision Never cache permission or persist a lease; deny/close is terminal for this operation.
 * @consequence Capture/promotion owners must await checkpoints and handle cancellation themselves.
 */
import {
  EnvironmentId,
  ProjectId,
  TenantId,
  type AuthenticatedPrincipal,
} from '../../domain/auth/types.js';
import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
  type AuthorizationAction,
  type EnvironmentAccessScope,
  type RequestedScope,
} from '../ports/accessDecision.js';
import type { ILocalDataOperationAccess } from '../ports/localDataPlane.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';

export type LocalDataOperation = 'view' | 'capture' | 'delete';
export type LocalDataAuthorizationFailure =
  | 'INVALID_INPUT'
  | 'INVALID_CLOCK'
  | 'CLOCK_REGRESSED'
  | 'ASSERTION_EXPIRED'
  | 'ACCESS_DENIED'
  | 'APPROVAL_MISMATCH'
  | 'AUTHORIZATION_UNAVAILABLE'
  | 'CHECK_IN_PROGRESS'
  | 'LEASE_CLOSED'
  | 'CAPTURE_REQUIRED';

export class LocalDataAuthorizationError extends Error {
  public constructor(public readonly code: LocalDataAuthorizationFailure) {
    super(`Local data authorization rejected: ${code}`);
    this.name = 'LocalDataAuthorizationError';
  }
}

type LeaseInput = Readonly<{
  principal: AuthenticatedPrincipal;
  scope: EnvironmentAccessScope;
  operation: LocalDataOperation;
  requestId: string;
}>;
type LeaseDependencies = Readonly<{
  authorizer: Pick<AuthorizeCommandScopeService, 'authorizeMany'>;
  clock: () => Date;
}>;

const ACTIONS = Object.freeze({
  view: [AUTHORIZATION_ACTION.workspaceLocalDataView],
  capture: [
    AUTHORIZATION_ACTION.workspaceLocalDataCapture,
    AUTHORIZATION_ACTION.workspaceSourceImportView,
  ],
  delete: [AUTHORIZATION_ACTION.workspaceLocalDataDelete],
});

/** Server-owned in-memory guard, not an authorization token or a serializable grant. */
export class LocalDataAuthorizationLease implements ILocalDataOperationAccess {
  readonly #principal: AuthenticatedPrincipal;
  readonly #scope: EnvironmentAccessScope;
  readonly #requestId: string;
  readonly #operation: LocalDataOperation;
  readonly #actions: readonly AuthorizationAction[];
  readonly #authorizer: LeaseDependencies['authorizer'];
  readonly #clock: LeaseDependencies['clock'];
  readonly #controller = new globalThis.AbortController();
  #failure: LocalDataAuthorizationError | undefined;
  #checking = false;
  #lastObservedAt = Number.NEGATIVE_INFINITY;

  private constructor(input: LeaseInput, deps: LeaseDependencies) {
    if (!Object.hasOwn(ACTIONS, input.operation) || input.scope.resource !== 'environment') {
      throw new LocalDataAuthorizationError('INVALID_INPUT');
    }
    this.#principal = copyPrincipal(input.principal);
    this.#scope = copyScope(input.scope);
    this.#requestId = nonBlank(input.requestId);
    this.#operation = input.operation;
    this.#actions = Object.freeze(
      ACTIONS[input.operation].map((action) => Object.freeze({ ...action }))
    );
    this.#authorizer = deps.authorizer;
    this.#clock = deps.clock;
  }

  public static async open(
    input: LeaseInput,
    deps: LeaseDependencies
  ): Promise<LocalDataAuthorizationLease> {
    let lease: LocalDataAuthorizationLease;
    try {
      lease = new LocalDataAuthorizationLease(input, deps);
    } catch {
      throw new LocalDataAuthorizationError('INVALID_INPUT');
    }
    await lease.checkpoint();
    return lease;
  }

  public get signal(): globalThis.AbortSignal {
    return this.#controller.signal;
  }

  /** No TTL hit: every call asks the existing authorization/audit owner again. */
  public async checkpoint(): Promise<void> {
    if (this.#failure) throw this.#failure;
    if (this.#checking) throw new LocalDataAuthorizationError('CHECK_IN_PROGRESS');
    this.#checking = true;
    try {
      this.#assertLifetime();
      const scopes: readonly RequestedScope[] = this.#actions.map((action) =>
        Object.freeze({ ...copyScope(this.#scope), action })
      );
      const outcomes = await this.#authorizer.authorizeMany(
        copyPrincipal(this.#principal),
        scopes,
        this.#requestId
      );
      this.#assertLifetime();
      if (outcomes.length !== scopes.length)
        throw new LocalDataAuthorizationError('APPROVAL_MISMATCH');
      for (const [index, outcome] of outcomes.entries()) {
        if (!outcome.ok) throw new LocalDataAuthorizationError('ACCESS_DENIED');
        const context = outcome.context;
        const expected = this.#actions[index]!;
        const scope = context.scope;
        if (
          scope.resource !== 'environment' ||
          scope.tenantId.value !== this.#scope.tenantId.value ||
          scope.projectId.value !== this.#scope.projectId.value ||
          scope.environmentId.value !== this.#scope.environmentId.value ||
          context.action.name !== expected.name ||
          context.action.kind !== expected.kind ||
          context.requestId !== this.#requestId ||
          context.principal.principalId !== this.#principal.principalId ||
          context.principal.principalType !== this.#principal.principalType ||
          context.principal.subjectId !== this.#principal.subjectId ||
          context.principal.issuer !== this.#principal.issuer ||
          context.principal.audience !== this.#principal.audience
        )
          throw new LocalDataAuthorizationError('APPROVAL_MISMATCH');
      }
    } catch (error) {
      throw this.#invalidate(
        error instanceof LocalDataAuthorizationError ? error.code : 'AUTHORIZATION_UNAVAILABLE'
      );
    } finally {
      this.#checking = false;
    }
  }

  /** Must be awaited immediately before promotion; does not perform or certify a commit. */
  public async beforePromotion(): Promise<void> {
    if (this.#failure) throw this.#failure;
    if (this.#operation !== 'capture') throw this.#invalidate('CAPTURE_REQUIRED');
    await this.checkpoint();
  }

  public close(): void {
    this.#invalidate('LEASE_CLOSED');
  }

  #assertLifetime(): void {
    if (this.#failure) throw this.#failure;
    const now = this.#clock().getTime();
    if (!Number.isFinite(now)) throw new LocalDataAuthorizationError('INVALID_CLOCK');
    if (now < this.#lastObservedAt) throw new LocalDataAuthorizationError('CLOCK_REGRESSED');
    this.#lastObservedAt = now;
    if (now >= this.#principal.expiresAt.getTime())
      throw new LocalDataAuthorizationError('ASSERTION_EXPIRED');
  }

  #invalidate(code: LocalDataAuthorizationFailure): LocalDataAuthorizationError {
    if (!this.#failure) {
      this.#failure = Object.freeze(new LocalDataAuthorizationError(code));
      this.#controller.abort(this.#failure);
    }
    return this.#failure;
  }
}

function nonBlank(value: string): string {
  if (typeof value !== 'string' || !value.length || value !== value.trim()) {
    throw new LocalDataAuthorizationError('INVALID_INPUT');
  }
  return value;
}

function copyScope(scope: EnvironmentAccessScope): EnvironmentAccessScope {
  return Object.freeze(
    buildEnvironmentAccessScope(
      Object.freeze(TenantId.unsafe(nonBlank(scope.tenantId.value))),
      Object.freeze(ProjectId.unsafe(nonBlank(scope.projectId.value))),
      Object.freeze(EnvironmentId.unsafe(nonBlank(scope.environmentId.value)))
    )
  );
}

function copyPrincipal(principal: AuthenticatedPrincipal): AuthenticatedPrincipal {
  const expiresAt = principal.expiresAt.getTime();
  const issuedAt = principal.issuedAt?.getTime();
  if (
    !Number.isFinite(expiresAt) ||
    (issuedAt !== undefined && !Number.isFinite(issuedAt)) ||
    (principal.principalType !== 'user' && principal.principalType !== 'service')
  ) {
    throw new LocalDataAuthorizationError('INVALID_INPUT');
  }
  const strings = (values: readonly string[]): readonly string[] => {
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
      throw new LocalDataAuthorizationError('INVALID_INPUT');
    }
    return Object.freeze([...values]);
  };
  // Allowlist fields; never spread an incoming object that might contain bearer credentials.
  return Object.freeze({
    principalId: nonBlank(principal.principalId),
    principalType: principal.principalType,
    subjectId: nonBlank(principal.subjectId),
    issuer: nonBlank(principal.issuer),
    audience: nonBlank(principal.audience),
    expiresAt: new Date(expiresAt),
    ...(principal.tokenId === undefined ? {} : { tokenId: nonBlank(principal.tokenId) }),
    ...(issuedAt === undefined ? {} : { issuedAt: new Date(issuedAt) }),
    rawScopes: strings(principal.rawScopes),
    assertedTenantIds: strings(principal.assertedTenantIds),
    assertedProjectIds: strings(principal.assertedProjectIds),
  });
}
