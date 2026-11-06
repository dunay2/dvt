/** Owned concern: isolated inputs and native-process observations for dbt analysis reuse tests. */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { vi, type Mock } from 'vitest';

import type { AnalyzeDbtProjectInput } from '../../../src/application/ports/dbtProjectAnalysis.js';
import type {
  DbtProcessRunner,
  ProcessRunInput,
  ProcessRunResult,
} from '../../../src/infrastructure/dbt/dbtAnalyzerProcess.js';
import {
  DbtCliProjectAnalyzer,
  type DbtCliProjectAnalyzerOptions,
} from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

export const REUSE_SCOPE = {
  tenantId: 'tenant-reuse',
  projectId: 'project-reuse',
  environmentId: 'test',
} as const;

export const REUSE_PROJECT_FILES = {
  'dbt_project.yml': 'name: analytics\nversion: 1.0.0\nprofile: analytics\nmodel-paths: [models]\n',
  'models/clients.sql': 'select 1 as client_id\n',
  'models/orders.sql': "select client_id from {{ ref('clients') }}\n",
  'models/schema.yml': 'version: 2\nmodels:\n  - name: orders\n    description: Orders\n',
} as const;

export const REUSE_PROFILE = [
  'analytics:',
  '  target: analysis',
  '  outputs:',
  '    analysis:',
  '      type: postgres',
  '      host: 127.0.0.1',
  '      port: 9',
  '      user: unused',
  '      password: fixture-only',
  '      dbname: unused',
  '      schema: public',
  '      threads: 1',
  '',
].join('\n');

export function deferredSignal(): Readonly<{ promise: Promise<void>; resolve: () => void }> {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

export type DbtAnalysisReuseFixture = Readonly<{
  input: AnalyzeDbtProjectInput;
  root: string;
  workspaceFilesRoot: string;
  profilesDirectory: string;
  processEnvironment: NodeJS.ProcessEnv;
  run: Mock<DbtProcessRunner['run']>;
  complete: DbtProcessRunner['run'];
  seedProject(target?: AnalyzeDbtProjectInput): Promise<AnalyzeDbtProjectInput>;
  writeSource(
    relativePath: string,
    content: string,
    target?: AnalyzeDbtProjectInput
  ): Promise<void>;
  writeProfile(content: string): Promise<void>;
  analyzer(options?: Partial<DbtCliProjectAnalyzerOptions>): DbtCliProjectAnalyzer;
  dispose(): Promise<void>;
}>;

export async function createDbtAnalysisReuseFixture(): Promise<DbtAnalysisReuseFixture> {
  const root = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-reuse-test-'));
  const workspaceFilesRoot = path.join(root, 'workspace');
  const profilesDirectory = path.join(root, 'profiles');
  const processEnvironment: NodeJS.ProcessEnv = { PATH: process.env.PATH };
  const input: AnalyzeDbtProjectInput = { scope: REUSE_SCOPE, projectRoot: 'analytics' };

  async function writeSource(relativePath: string, content: string, target = input): Promise<void> {
    const projectDirectory = path.join(
      resolveWorkspaceScopeStorageRoot(workspaceFilesRoot, target.scope),
      target.projectRoot
    );
    const absolutePath = path.join(projectDirectory, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
  }

  async function seedProject(target = input): Promise<AnalyzeDbtProjectInput> {
    await Promise.all(
      Object.entries(REUSE_PROJECT_FILES).map(([name, content]) =>
        writeSource(name, content, target)
      )
    );
    return target;
  }

  async function complete(input: ProcessRunInput): Promise<ProcessRunResult> {
    const targetPath = input.args[input.args.indexOf('--target-path') + 1];
    if (targetPath === undefined) throw new Error('Expected an isolated native target');
    await mkdir(targetPath, { recursive: true });
    const nodes = Object.fromEntries(
      ['clients', 'orders'].map((name) => [
        `model.analytics.${name}`,
        {
          unique_id: `model.analytics.${name}`,
          resource_type: 'model',
          name,
          package_name: 'analytics',
          original_file_path: `models/${name}.sql`,
          ...(input.args[0] === 'compile' && input.args.includes(name)
            ? {
                compiled_code:
                  name === 'orders'
                    ? 'select client_id from "public"."clients"'
                    : 'select 1 as client_id',
              }
            : {}),
          depends_on: { nodes: name === 'orders' ? ['model.analytics.clients'] : [] },
          config: { materialized: 'view' },
          columns: { client_id: { name: 'client_id', data_type: 'integer' } },
          tags: [],
        },
      ])
    );
    await writeFile(
      path.join(targetPath, 'manifest.json'),
      JSON.stringify({
        metadata: { dbt_version: '1.10.0', project_name: 'analytics', adapter_type: 'postgres' },
        nodes,
        sources: {},
        exposures: {},
        metrics: {},
      }),
      'utf8'
    );
    return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
  }

  const run = vi.fn<DbtProcessRunner['run']>(complete);
  await mkdir(profilesDirectory, { recursive: true });
  await writeFile(path.join(profilesDirectory, 'profiles.yml'), REUSE_PROFILE, 'utf8');
  await seedProject();

  return {
    input,
    root,
    workspaceFilesRoot,
    profilesDirectory,
    processEnvironment,
    run,
    complete,
    seedProject,
    writeSource,
    writeProfile: (content: string) =>
      writeFile(path.join(profilesDirectory, 'profiles.yml'), content, 'utf8'),
    analyzer: (options: Partial<DbtCliProjectAnalyzerOptions> = {}) =>
      new DbtCliProjectAnalyzer({
        workspaceFilesRoot,
        profilesDirectory,
        processRunner: { run },
        processEnvironment,
        ...options,
      }),
    async dispose() {
      const relative = path.relative(path.resolve(tmpdir()), path.resolve(root));
      if (
        relative.startsWith('..') ||
        path.isAbsolute(relative) ||
        !relative.startsWith('dvt-dbt-reuse-test-')
      ) {
        throw new Error('Refuse cleanup outside the owned test directory');
      }
      await rm(root, { recursive: true, force: true });
    },
  };
}
