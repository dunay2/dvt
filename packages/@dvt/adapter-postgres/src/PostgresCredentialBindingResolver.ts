/**
 * @ownedConcern Resolve governed PostgreSQL credential aliases without dynamic environment lookup.
 */
import { URL } from 'node:url';

export interface IPostgresCredentialBindingResolver {
  resolveCredential(credentialRef: string): Promise<string | null>;
}

export type PostgresCredentialBindings = Readonly<Record<string, string>>;

export class InvalidPostgresCredentialBindingsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidPostgresCredentialBindingsError';
  }
}

export class PostgresCredentialBindingResolver implements IPostgresCredentialBindingResolver {
  private readonly bindings: PostgresCredentialBindings;

  public constructor(input: string | PostgresCredentialBindings | undefined) {
    this.bindings = parsePostgresCredentialBindings(input);
  }

  public async resolveCredential(credentialRef: string): Promise<string | null> {
    if (!isPostgresCredentialRef(credentialRef)) {
      return null;
    }
    return this.bindings[credentialRef] ?? null;
  }
}

export function parsePostgresCredentialBindings(
  input: string | PostgresCredentialBindings | undefined
): PostgresCredentialBindings {
  if (input === undefined) {
    return Object.freeze({});
  }

  let candidate: unknown = input;
  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input) as unknown;
    } catch (_error) {
      throw new InvalidPostgresCredentialBindingsError(
        'DVT_POSTGRES_CREDENTIAL_BINDINGS must be a JSON object.'
      );
    }
  }

  if (!isPlainRecord(candidate)) {
    throw new InvalidPostgresCredentialBindingsError(
      'DVT_POSTGRES_CREDENTIAL_BINDINGS must be a JSON object.'
    );
  }

  const bindings: Record<string, string> = {};
  for (const [credentialRef, connectionString] of Object.entries(candidate)) {
    if (!isPostgresCredentialRef(credentialRef)) {
      throw new InvalidPostgresCredentialBindingsError(
        'PostgreSQL credential binding keys must use postgres:<alias>.'
      );
    }
    if (typeof connectionString !== 'string' || !isPostgresConnectionString(connectionString)) {
      throw new InvalidPostgresCredentialBindingsError(
        `PostgreSQL credential binding ${credentialRef} must contain a postgres:// or postgresql:// URL.`
      );
    }
    bindings[credentialRef] = connectionString;
  }
  return Object.freeze(bindings);
}

function isPostgresCredentialRef(value: string): boolean {
  return /^postgres:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function isPostgresConnectionString(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') &&
      parsed.hostname.length > 0
    );
  } catch (_error) {
    return false;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
