import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { URL } from 'node:url';

import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';
import { load as loadYaml } from 'js-yaml';

import type { IDbtExecutionConnectionBindingVerifier } from '../../application/ports/dbtExecutionTarget.js';

type ReadTextFile = (path: string) => Promise<string>;

type PostgresEndpoint = Readonly<{
  host: string;
  port: number;
  user: string;
  database: string;
}>;

export class ConfiguredDbtExecutionConnectionBindingVerifier implements IDbtExecutionConnectionBindingVerifier {
  public constructor(
    private readonly dependencies: {
      readonly environment: Readonly<Record<string, string | undefined>>;
      readonly postgresCredentialResolver: IPostgresCredentialBindingResolver;
      readonly readTextFile?: ReadTextFile;
    }
  ) {}

  public async verify(input: {
    readonly runtimeCredentialRef: string;
    readonly targetProfile: string;
    readonly connectionCredentialRef: string;
  }): Promise<boolean> {
    const profilesDirectory = resolveEnvironmentCredential(
      input.runtimeCredentialRef,
      this.dependencies.environment
    );
    if (profilesDirectory === undefined) return false;

    const connectionString = await this.dependencies.postgresCredentialResolver.resolveCredential(
      input.connectionCredentialRef
    );
    const expectedEndpoint = parsePostgresUrl(connectionString);
    if (expectedEndpoint === undefined) return false;

    const document = await readProfilesDocument(
      profilesDirectory,
      this.dependencies.readTextFile ?? ((path) => readFile(path, 'utf8'))
    );
    if (document === undefined) return false;

    const targetOutputs = collectTargetOutputs(document, input.targetProfile);
    return (
      targetOutputs.length > 0 &&
      targetOutputs.every((output) => {
        const endpoint = parseDbtPostgresOutput(output);
        return endpoint !== undefined && sameEndpoint(endpoint, expectedEndpoint);
      })
    );
  }
}

function resolveEnvironmentCredential(
  credentialRef: string,
  environment: Readonly<Record<string, string | undefined>>
): string | undefined {
  const match = /^env:([A-Z_][A-Z0-9_]*)$/u.exec(credentialRef);
  if (match === null) return undefined;
  const environmentName = match[1];
  if (environmentName === undefined) return undefined;
  const value = environment[environmentName]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

async function readProfilesDocument(
  profilesDirectory: string,
  readTextFile: ReadTextFile
): Promise<unknown | undefined> {
  for (const fileName of ['profiles.yml', 'profiles.yaml']) {
    try {
      return loadYaml(await readTextFile(join(profilesDirectory, fileName)));
    } catch {
      // Try the other canonical dbt profiles filename before failing closed.
    }
  }
  return undefined;
}

function collectTargetOutputs(document: unknown, targetProfile: string): unknown[] {
  if (!isRecord(document)) return [];
  return Object.values(document).flatMap((profile) => {
    if (!isRecord(profile) || !isRecord(profile['outputs'])) return [];
    const output = profile['outputs'][targetProfile];
    return output === undefined ? [] : [output];
  });
}

function parseDbtPostgresOutput(value: unknown): PostgresEndpoint | undefined {
  if (!isRecord(value) || value['type'] !== 'postgres') return undefined;
  const host = normalizedString(value['host']);
  const user = normalizedString(value['user']);
  const database = normalizedString(value['dbname'] ?? value['database']);
  const port = normalizedPort(value['port']);
  if (host === undefined || user === undefined || database === undefined || port === undefined) {
    return undefined;
  }
  return { host: host.toLowerCase(), port, user, database };
}

function parsePostgresUrl(value: string | null): PostgresEndpoint | undefined {
  if (value === null) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return undefined;
    const database = decodeURIComponent(url.pathname.replace(/^\//u, '')).trim();
    const user = decodeURIComponent(url.username).trim();
    if (url.hostname.length === 0 || database.length === 0 || user.length === 0) return undefined;
    return {
      host: url.hostname.toLowerCase(),
      port: Number(url.port || '5432'),
      user,
      database,
    };
  } catch {
    return undefined;
  }
}

function sameEndpoint(left: PostgresEndpoint, right: PostgresEndpoint): boolean {
  return (
    left.host === right.host &&
    left.port === right.port &&
    left.user === right.user &&
    left.database === right.database
  );
}

function normalizedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}

function normalizedPort(value: unknown): number | undefined {
  const port = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
