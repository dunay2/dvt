import { join } from 'node:path';

import type { DbtProjectBundleArtifactStore } from './assertDbtProjectBundleBinding.js';

export type RunExecutionContextArtifactStoreConfig = {
  readonly dbtBundleStoreBackend?: 'file' | 's3' | undefined;
  readonly dbtBundleS3Bucket?: string | undefined;
  readonly dbtBundleFileRoot?: string | undefined;
  readonly workspaceFilesRoot?: string | undefined;
  readonly workingDirectory?: string | undefined;
};

export function resolveRunExecutionContextArtifactStore(
  config: RunExecutionContextArtifactStoreConfig
): DbtProjectBundleArtifactStore {
  if (config.dbtBundleStoreBackend === 's3') {
    return {
      kind: 's3',
      bucket: requireNonBlank(config.dbtBundleS3Bucket, 'dbtBundleS3Bucket'),
    };
  }

  if (config.dbtBundleStoreBackend === 'file') {
    return {
      kind: 'file',
      rootPath: requireNonBlank(config.dbtBundleFileRoot, 'dbtBundleFileRoot'),
    };
  }

  const workspaceRoot =
    firstNonBlank(config.workspaceFilesRoot, config.dbtBundleFileRoot) ??
    config.workingDirectory ??
    process.cwd();
  return {
    kind: 'file',
    rootPath: join(workspaceRoot, '.dvt', 'run-context-artifacts'),
  };
}

function firstNonBlank(...values: readonly (string | undefined)[]): string | undefined {
  return values.find((value): value is string => value !== undefined && value.trim().length > 0);
}

function requireNonBlank(value: string | undefined, name: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for the configured run-context artifact store`);
  }
  return value;
}
