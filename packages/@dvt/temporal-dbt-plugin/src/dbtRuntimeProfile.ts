/**
 * @ownedConcern Resolve and materialize worker-local DBT runtime profiles.
 */
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type {
  DbtRuntimeProfileMaterializer,
  MaterializedDbtRuntimeProfile,
} from './dbtCliTypes.js';
import type { DbtPluginExecutionInput } from './dbtPluginTypes.js';

export interface DbtRuntimeProfileResolution {
  readonly profilesYaml: Uint8Array;
}

export interface DbtRuntimeProfileResolutionInput {
  readonly credentialRef: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
}

export interface IDbtRuntimeProfileResolver {
  resolve(input: DbtRuntimeProfileResolutionInput): Promise<DbtRuntimeProfileResolution>;
}

export function createDbtRuntimeProfileMaterializer(options: {
  readonly resolver: IDbtRuntimeProfileResolver;
  readonly workdirRoot: string;
}): DbtRuntimeProfileMaterializer {
  return (input) => materializeDbtRuntimeProfile(input, options);
}

async function materializeDbtRuntimeProfile(
  input: DbtPluginExecutionInput,
  options: {
    readonly resolver: IDbtRuntimeProfileResolver;
    readonly workdirRoot: string;
  }
): Promise<MaterializedDbtRuntimeProfile> {
  const resolution = await options.resolver.resolve({
    credentialRef: input.pluginContext.credentialRef,
    tenantId: input.runExecutionContext.tenantId,
    projectId: input.runExecutionContext.projectId,
    environmentId: input.runExecutionContext.environmentId,
  });

  await mkdir(options.workdirRoot, { recursive: true, mode: 0o700 });
  const profilesDir = await mkdtemp(join(options.workdirRoot, 'dbt-profile-'));

  try {
    await chmod(profilesDir, 0o700);
    await writeFile(join(profilesDir, 'profiles.yml'), resolution.profilesYaml, { mode: 0o600 });
    await chmod(join(profilesDir, 'profiles.yml'), 0o600);
    return {
      profilesDir,
      cleanup: () => rm(profilesDir, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(profilesDir, { recursive: true, force: true });
    throw error;
  } finally {
    resolution.profilesYaml.fill(0);
  }
}
