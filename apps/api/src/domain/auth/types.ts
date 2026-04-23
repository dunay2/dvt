export type PrincipalType = 'user' | 'service';

export type IdentifierParseFailureCode =
  | 'INVALID_TENANT_ID'
  | 'INVALID_PROJECT_ID'
  | 'INVALID_ENVIRONMENT_ID';

export type IdentifierParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: IdentifierParseFailureCode };

function parseNonEmptyIdentifier<T>(
  raw: string | undefined | null,
  errorCode: IdentifierParseFailureCode,
  factory: (value: string) => T
): IdentifierParseResult<T> {
  if (typeof raw !== 'string') {
    return { ok: false, code: errorCode };
  }

  const normalized = raw.trim();
  if (normalized.length === 0) {
    return { ok: false, code: errorCode };
  }

  return { ok: true, value: factory(normalized) };
}

export class TenantId {
  private constructor(public readonly value: string) {}

  public static parse(raw: string | undefined | null): IdentifierParseResult<TenantId> {
    return parseNonEmptyIdentifier(raw, 'INVALID_TENANT_ID', (value) => new TenantId(value));
  }

  public static unsafe(raw: string): TenantId {
    const result = TenantId.parse(raw);
    if (!result.ok) {
      throw new Error(result.code);
    }

    return result.value;
  }
}

export class ProjectId {
  private constructor(public readonly value: string) {}

  public static parse(raw: string | undefined | null): IdentifierParseResult<ProjectId> {
    return parseNonEmptyIdentifier(raw, 'INVALID_PROJECT_ID', (value) => new ProjectId(value));
  }

  public static unsafe(raw: string): ProjectId {
    const result = ProjectId.parse(raw);
    if (!result.ok) {
      throw new Error(result.code);
    }

    return result.value;
  }
}

export class EnvironmentId {
  private constructor(public readonly value: string) {}

  public static parse(raw: string | undefined | null): IdentifierParseResult<EnvironmentId> {
    return parseNonEmptyIdentifier(
      raw,
      'INVALID_ENVIRONMENT_ID',
      (value) => new EnvironmentId(value)
    );
  }

  public static unsafe(raw: string): EnvironmentId {
    const result = EnvironmentId.parse(raw);
    if (!result.ok) {
      throw new Error(result.code);
    }

    return result.value;
  }
}

export type AuthorizationAction =
  | {
      readonly kind: 'command';
      readonly name:
        | 'run:start'
        | 'run:cancel'
        | 'run:retry'
        | 'run:signal'
        | 'workspace:graph-draft:save'
        | 'admin:rebuild-snapshot';
    }
  | {
      readonly kind: 'query';
      readonly name:
        | 'run:view'
        | 'run:list'
        | 'run:logs:view'
        | 'workspace:graph-draft:view';
    };

export interface RequestedScope {
  readonly tenantId: TenantId;
  readonly projectId?: ProjectId;
  readonly environmentId?: EnvironmentId;
  readonly action: AuthorizationAction;
}

export interface ExecutionScope {
  readonly tenantId: TenantId;
  readonly projectId?: ProjectId;
  readonly environmentId?: EnvironmentId;
}

export interface PrincipalRef {
  readonly principalId: string;
  readonly principalType: PrincipalType;
}

export interface AuthenticatedPrincipal extends PrincipalRef {
  readonly subjectId: string;
  readonly issuer: string;
  readonly audience: string;
  readonly tokenId?: string;
  readonly issuedAt?: Date;
  readonly expiresAt: Date;
  readonly rawScopes: ReadonlyArray<string>;
  readonly assertedTenantIds: ReadonlyArray<string>;
  readonly assertedProjectIds: ReadonlyArray<string>;
}

export type DeniedReason =
  | 'PRINCIPAL_SUSPENDED'
  | 'TENANT_NOT_GRANTED'
  | 'PROJECT_NOT_GRANTED'
  | 'ENVIRONMENT_NOT_GRANTED'
  | 'ACTION_NOT_GRANTED'
  | 'TOKEN_ASSERTION_CONFLICT';
