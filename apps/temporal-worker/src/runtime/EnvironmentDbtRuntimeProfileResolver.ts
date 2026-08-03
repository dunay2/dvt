/**
 * @ownedConcern Resolve env-backed DBT profile references inside the Temporal worker boundary.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  DbtRuntimeProfileResolution,
  DbtRuntimeProfileResolutionInput,
  IDbtRuntimeProfileResolver,
} from '@dvt/temporal-dbt-plugin';

const ENV_REFERENCE_PREFIX = 'env:';
const ENV_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
const RESOLUTION_ERROR = 'DBT_RUNTIME_CREDENTIAL_UNAVAILABLE';

export class EnvironmentDbtRuntimeProfileResolver implements IDbtRuntimeProfileResolver {
  public constructor(
    private readonly environment: Readonly<Record<string, string | undefined>> = process.env
  ) {}

  public async resolve(
    input: DbtRuntimeProfileResolutionInput
  ): Promise<DbtRuntimeProfileResolution> {
    const environmentName = parseEnvironmentName(input.credentialRef);
    const sourceDirectory = this.environment[environmentName]?.trim();
    if (sourceDirectory === undefined || sourceDirectory.length === 0) {
      throw new Error(RESOLUTION_ERROR);
    }

    try {
      const profilesYaml = await readFile(join(sourceDirectory, 'profiles.yml'));
      if (profilesYaml.byteLength === 0) {
        throw new Error(RESOLUTION_ERROR);
      }
      return { profilesYaml };
    } catch {
      throw new Error(RESOLUTION_ERROR);
    }
  }
}

function parseEnvironmentName(credentialRef: string): string {
  if (!credentialRef.startsWith(ENV_REFERENCE_PREFIX)) {
    throw new Error(RESOLUTION_ERROR);
  }
  const environmentName = credentialRef.slice(ENV_REFERENCE_PREFIX.length);
  if (!ENV_NAME_PATTERN.test(environmentName)) {
    throw new Error(RESOLUTION_ERROR);
  }
  return environmentName;
}
