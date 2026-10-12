/** Validate local-data configuration only; configured is not native-runtime readiness. */
import path from 'node:path';

export type LocalDataConfiguration =
  | Readonly<{ kind: 'disabled' }>
  | Readonly<{
      kind: 'configured';
      root: string;
      workspaceFilesRoot: string;
      memoryLimitBytes: number;
      threads: number;
      maxTempBytes: number;
      maxOpenWorkspaces: number;
      maxConcurrentSessions: number;
    }>;

type Environment = Readonly<Record<string, string | undefined>>;

function positiveInteger(input: Environment, name: string): number {
  const raw = input[name]?.trim();
  const value = Number(raw);
  if (raw == null || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(value)) {
    throw new Error(`Invalid environment: ${name} must be an explicit positive safe integer`);
  }
  return value;
}

function absoluteDirectory(input: Environment, name: string): string {
  const value = input[name]?.trim();
  if (value == null || value.length === 0 || value.includes('\0') || !path.isAbsolute(value)) {
    throw new Error(`Invalid environment: ${name} must be an explicit absolute directory`);
  }
  const resolved = path.resolve(value);
  if (resolved === path.parse(resolved).root) {
    throw new Error(`Invalid environment: ${name} must not be a filesystem root`);
  }
  return resolved;
}

function containsDirectory(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}

export function readLocalDataConfiguration(input: Environment): LocalDataConfiguration {
  const enabled = input.DVT_LOCAL_DATA_ENABLED?.trim().toLowerCase();
  if (enabled === undefined || enabled === 'false') return Object.freeze({ kind: 'disabled' });
  if (enabled !== 'true') {
    throw new Error('Invalid environment: DVT_LOCAL_DATA_ENABLED must be true or false');
  }

  // This check is lexical. The storage adapter must separately reject symlink aliases
  // and revalidate real filesystem containment before opening a database.
  const root = absoluteDirectory(input, 'DVT_LOCAL_DATA_ROOT');
  const workspaceFilesRoot = absoluteDirectory(input, 'DVT_WORKSPACE_FILES_ROOT');
  if (containsDirectory(root, workspaceFilesRoot) || containsDirectory(workspaceFilesRoot, root)) {
    throw new Error(
      'Invalid environment: local-data and workspace-authoring roots must not overlap'
    );
  }

  const configuration = {
    kind: 'configured' as const,
    root,
    workspaceFilesRoot,
    memoryLimitBytes: positiveInteger(input, 'DVT_DUCKDB_MEMORY_LIMIT_BYTES'),
    threads: positiveInteger(input, 'DVT_DUCKDB_THREADS'),
    maxTempBytes: positiveInteger(input, 'DVT_DUCKDB_MAX_TEMP_BYTES'),
    maxOpenWorkspaces: positiveInteger(input, 'DVT_LOCAL_DATA_MAX_OPEN_WORKSPACES'),
    maxConcurrentSessions: positiveInteger(input, 'DVT_LOCAL_DATA_MAX_CONCURRENT_SESSIONS'),
  };
  // Instance settings are not per-session budgets. Preserve exact aggregate arithmetic;
  // actual resource admission and the host RSS/disk ceiling belong to the runtime.
  for (const value of [
    configuration.memoryLimitBytes,
    configuration.threads,
    configuration.maxTempBytes,
  ]) {
    if (!Number.isSafeInteger(value * configuration.maxOpenWorkspaces)) {
      throw new Error(
        'Invalid environment: aggregate local-data budgets exceed safe integer precision'
      );
    }
  }
  return Object.freeze(configuration);
}
