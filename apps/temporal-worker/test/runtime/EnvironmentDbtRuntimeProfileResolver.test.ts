import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { EnvironmentDbtRuntimeProfileResolver } from '../../src/runtime/EnvironmentDbtRuntimeProfileResolver.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

describe('EnvironmentDbtRuntimeProfileResolver', () => {
  it('resolves profiles.yml only from an opaque env reference', async () => {
    const sourceDirectory = await createProfilesDirectory('warehouse:\n  target: production\n');
    const resolver = new EnvironmentDbtRuntimeProfileResolver({
      DBT_PROFILES_DIR: sourceDirectory,
    });

    const result = await resolver.resolve({
      credentialRef: 'env:DBT_PROFILES_DIR',
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'prod',
    });

    expect(Buffer.from(result.profilesYaml).toString('utf8')).toContain('target: production');
  });

  it.each(['vault:dbt/production', 'env:MISSING_PROFILE', 'env:../../PROFILE'])(
    'fails without exposing details for unavailable reference %s',
    async (credentialRef) => {
      const resolver = new EnvironmentDbtRuntimeProfileResolver({});

      await expect(
        resolver.resolve({
          credentialRef,
          tenantId: 'tenant-1',
          projectId: 'project-1',
          environmentId: 'prod',
        })
      ).rejects.toThrow(/^DBT_RUNTIME_CREDENTIAL_UNAVAILABLE$/);
    }
  );
});

async function createProfilesDirectory(contents: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dvt-dbt-profile-source-'));
  temporaryRoots.push(root);
  const profilesDirectory = join(root, 'profiles');
  await mkdir(profilesDirectory);
  await writeFile(join(profilesDirectory, 'profiles.yml'), contents, 'utf8');
  return profilesDirectory;
}
