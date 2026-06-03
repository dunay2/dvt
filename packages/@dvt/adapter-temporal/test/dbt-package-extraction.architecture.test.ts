/**
 * Owned concern: verify concrete DBT plugin ownership lives in its package,
 * not in the generic Temporal adapter public API.
 *
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0014: Run-Driven Adapter Model
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../..');
const ADAPTER_ROOT = join(REPO_ROOT, 'packages/@dvt/adapter-temporal');
const DBT_PLUGIN_ROOT = join(REPO_ROOT, 'packages/@dvt/temporal-dbt-plugin');
const DBT_PLUGIN_COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/adapters/temporal/temporal-dbt-plugin-package.md'
);

describe('Temporal DBT plugin package extraction architecture', () => {
  it('keeps concrete DBT exports out of the Temporal adapter root API', () => {
    const adapterIndex = readFileSync(join(ADAPTER_ROOT, 'src/index.ts'), 'utf8');

    for (const forbiddenToken of [
      'DbtStepActivity',
      'createDbtStepActivityRegistry',
      'DbtCliPluginRunner',
      'DBT_PLUGIN_ID',
      'TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS',
      './plugins/dbt/',
    ]) {
      expect(adapterIndex).not.toContain(forbiddenToken);
    }

    expect(adapterIndex).toContain('TemporalStepPluginProfile');
    expect(adapterIndex).toContain('TemporalStepPluginRunner');
  });

  it('moves the DBT implementation directory out of the Temporal adapter package', () => {
    expect(existsSync(join(ADAPTER_ROOT, 'src/plugins/dbt'))).toBe(false);
    expect(existsSync(join(DBT_PLUGIN_ROOT, 'src/DbtStepActivity.ts'))).toBe(true);
    expect(existsSync(join(DBT_PLUGIN_ROOT, 'src/DbtCliPluginRunner.ts'))).toBe(true);
    expect(existsSync(join(DBT_PLUGIN_ROOT, 'src/dbtPluginManifest.ts'))).toBe(true);
  });

  it('declares the DBT package public API and dependencies', () => {
    const packageJson = JSON.parse(readFileSync(join(DBT_PLUGIN_ROOT, 'package.json'), 'utf8')) as {
      name?: string;
      dependencies?: Record<string, string>;
      exports?: Record<string, unknown>;
    };
    const publicApi = readFileSync(join(DBT_PLUGIN_ROOT, 'src/index.ts'), 'utf8');

    expect(packageJson.name).toBe('@dvt/temporal-dbt-plugin');
    expect(packageJson.dependencies).toMatchObject({
      '@dvt/adapter-temporal': 'workspace:*',
      '@dvt/artifacts': 'workspace:*',
      '@dvt/contracts': 'workspace:*',
      '@dvt/engine': 'workspace:*',
    });
    expect(packageJson.exports).toHaveProperty('.');

    for (const requiredExport of [
      'DbtStepActivity',
      'createDbtStepActivityRegistry',
      'DbtCliPluginRunner',
      'DBT_PLUGIN_ID',
      'TEMPORAL_DBT_PLUGIN_EXECUTABLE_STEP_KINDS',
    ]) {
      expect(publicApi).toContain(requiredExport);
    }
  });

  it('updates API and worker composition roots to consume the DBT package', () => {
    const workerProfile = readFileSync(
      join(REPO_ROOT, 'apps/temporal-worker/src/runtime/temporalWorkerDbtProfile.ts'),
      'utf8'
    );
    const apiAdmissionPolicy = readFileSync(
      join(
        REPO_ROOT,
        'apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts'
      ),
      'utf8'
    );

    expect(workerProfile).toContain("from '@dvt/temporal-dbt-plugin'");
    expect(workerProfile).toContain('type TemporalStepPluginProfile');
    expect(workerProfile).not.toContain(
      "DbtCliPluginRunner,\n  DBT_PLUGIN_ID,\n  assertDbtCliAvailable,\n  createDbtStepActivityRegistry,\n  type TemporalStepPluginProfile,\n} from '@dvt/adapter-temporal'"
    );
    expect(apiAdmissionPolicy).toContain("from '@dvt/temporal-dbt-plugin'");
    expect(apiAdmissionPolicy).not.toContain("from '@dvt/adapter-temporal'");
  });

  it('documents the package component semantics and diagrams', () => {
    const guide = readFileSync(DBT_PLUGIN_COMPONENT_GUIDE, 'utf8');

    for (const heading of [
      '## Owned Concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Map',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }

    expect(guide).toContain('@dvt/temporal-dbt-plugin');
    expect(guide).toContain('@dvt/adapter-temporal` MUST NOT export concrete DBT plugin symbols');
    expect(guide).toContain('```mermaid');
  });
});
