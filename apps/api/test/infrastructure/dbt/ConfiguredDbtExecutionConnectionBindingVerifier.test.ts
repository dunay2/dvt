import { describe, expect, it, vi } from 'vitest';

import { ConfiguredDbtExecutionConnectionBindingVerifier } from '../../../src/infrastructure/dbt/ConfiguredDbtExecutionConnectionBindingVerifier.js';

const INPUT = {
  runtimeCredentialRef: 'env:DBT_PROFILES_DIR',
  targetProfile: 'production',
  connectionCredentialRef: 'postgres:warehouse-production',
} as const;

describe('ConfiguredDbtExecutionConnectionBindingVerifier', () => {
  it('accepts a dbt target only when every matching profile resolves to the governed endpoint', async () => {
    const verifier = buildVerifier(`
analytics:
  outputs:
    production:
      type: postgres
      host: warehouse.internal
      port: 5432
      user: dbt_runner
      dbname: analytics
`);

    await expect(verifier.verify(INPUT)).resolves.toBe(true);
  });

  it('fails closed when the dbt profile points at another database', async () => {
    const verifier = buildVerifier(`
analytics:
  outputs:
    production:
      type: postgres
      host: warehouse.internal
      port: 5432
      user: dbt_runner
      dbname: finance
`);

    await expect(verifier.verify(INPUT)).resolves.toBe(false);
  });

  it('fails closed when any profile could select an unverifiable target with the same name', async () => {
    const verifier = buildVerifier(`
analytics:
  outputs:
    production:
      type: postgres
      host: warehouse.internal
      port: 5432
      user: dbt_runner
      dbname: analytics
unresolved:
  outputs:
    production:
      type: postgres
      host: "{{ env_var('DBT_HOST') }}"
      port: 5432
      user: dbt_runner
      dbname: analytics
`);

    await expect(verifier.verify(INPUT)).resolves.toBe(false);
  });

  it('fails closed when the runtime profile reference cannot be resolved', async () => {
    const resolveCredential = vi.fn();
    const verifier = new ConfiguredDbtExecutionConnectionBindingVerifier({
      environment: {},
      postgresCredentialResolver: { resolveCredential },
      readTextFile: vi.fn(),
    });

    await expect(verifier.verify(INPUT)).resolves.toBe(false);
    expect(resolveCredential).not.toHaveBeenCalled();
  });
});

function buildVerifier(profilesYaml: string): ConfiguredDbtExecutionConnectionBindingVerifier {
  return new ConfiguredDbtExecutionConnectionBindingVerifier({
    environment: { DBT_PROFILES_DIR: 'C:\\runtime\\dbt' },
    postgresCredentialResolver: {
      resolveCredential: vi.fn(
        async () => 'postgresql://dbt_runner:secret@warehouse.internal:5432/analytics'
      ),
    },
    readTextFile: vi.fn(async () => profilesYaml),
  });
}
