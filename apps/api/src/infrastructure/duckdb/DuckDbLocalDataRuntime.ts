/**
 * Owned concern: bound native workspace instances and short-lived session ownership.
 * @baseline #3389: one API process owns each persistent scoped file; scope hashing is not authorization.
 * @decision Keep native callbacks infrastructure-only, lock instance budgets and drain sessions before close.
 * @consequence No SQL/native application port, LOCAL readiness claim, shared-temp deletion or host RSS guarantee.
 * @version 1.0.0
 */
import type { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';

import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import type { LocalDataConfiguration } from '../../plugins/localDataEnv.js';
import { resolveWorkspaceScopeStorageRoot } from '../workspaceFiles/workspaceScopeStoragePath.js';

import {
  LocalDataStorageBoundaryError,
  prepareDuckDbWorkspacePaths,
  readDuckDbWorkspaceIdentity,
  validateDuckDbWorkspaceIdentity,
  type DuckDbWorkspaceIdentity,
} from './duckDbLocalDataPaths.js';

type RuntimeFailure =
  | 'disabled'
  | 'closed'
  | 'workspace_capacity'
  | 'session_capacity'
  | 'open_failed'
  | 'session_failed'
  | 'close_failed';
type Configuration = Extract<LocalDataConfiguration, { kind: 'configured' }>;
type InstanceLease = Readonly<{
  instance: DuckDBInstance;
  storage: DuckDbWorkspaceIdentity;
}>;

export class LocalDataRuntimeError extends Error {
  public constructor(readonly reason: RuntimeFailure) {
    super(`Local data runtime rejected: ${reason}`);
    this.name = 'LocalDataRuntimeError';
  }
}

function instanceSettings(configuration: Configuration, temporary: string): Record<string, string> {
  return {
    memory_limit: `${configuration.memoryLimitBytes}B`,
    threads: String(configuration.threads),
    temp_directory: temporary,
    max_temp_directory_size: `${configuration.maxTempBytes}B`,
    enable_external_access: 'false',
    autoinstall_known_extensions: 'false',
    autoload_known_extensions: 'false',
    allow_unsigned_extensions: 'false',
    allow_community_extensions: 'false',
    allow_persistent_secrets: 'false',
  };
}

function closeConnection(connection: DuckDBConnection | undefined): void {
  try {
    connection?.closeSync();
  } catch {
    throw new LocalDataRuntimeError('close_failed');
  }
}

async function lockInstanceConfiguration(instance: DuckDBInstance): Promise<void> {
  const connection = await instance.connect();
  try {
    // enable_logging is a runtime setting, not a C API startup configuration option.
    // These are fixed server-owned statements before the registry publishes the instance.
    await connection.run('SET enable_logging = false');
    await connection.run('SET lock_configuration = true');
  } finally {
    closeConnection(connection);
  }
}

/** Internal gateway: callers must authorize scope before entering this infrastructure boundary. */
export class DuckDbLocalDataRuntime {
  private readonly instances = new Map<string, Promise<InstanceLease>>();
  private readonly sessions = new Set<Promise<unknown>>();
  private closing: Promise<void> | undefined;

  public constructor(private readonly configuration: LocalDataConfiguration) {}

  /** Native callback ownership stays in infrastructure, never on ProtectedRuntimeModule or a product port. */
  public withSession<T>(
    scope: WorkspaceStorageScope,
    action: (connection: DuckDBConnection) => Promise<T>
  ): Promise<T> {
    if (this.closing !== undefined) return Promise.reject(new LocalDataRuntimeError('closed'));
    if (this.configuration.kind === 'disabled')
      return Promise.reject(new LocalDataRuntimeError('disabled'));
    if (this.sessions.size >= this.configuration.maxConcurrentSessions) {
      return Promise.reject(new LocalDataRuntimeError('session_capacity'));
    }
    const session = this.runSession(scope, action, this.configuration);
    this.sessions.add(session);
    // Handle both branches without creating an unobserved rejecting cleanup promise.
    void session.then(
      () => this.sessions.delete(session),
      () => this.sessions.delete(session)
    );
    return session;
  }

  public close(): Promise<void> {
    // Set the admission barrier before any asynchronous drain can yield.
    this.closing ??= Promise.resolve().then(() => this.drainAndClose());
    return this.closing;
  }

  private instanceForScope(
    scope: WorkspaceStorageScope,
    configuration: Configuration
  ): Promise<InstanceLease> {
    let key: string;
    try {
      key = resolveWorkspaceScopeStorageRoot(configuration.root, scope);
    } catch {
      return Promise.reject(new LocalDataStorageBoundaryError('invalid_scope'));
    }
    const existing = this.instances.get(key);
    if (existing !== undefined) return existing;
    if (this.instances.size >= configuration.maxOpenWorkspaces) {
      return Promise.reject(new LocalDataRuntimeError('workspace_capacity'));
    }
    const pending = this.openInstance(scope, configuration);
    this.instances.set(key, pending);
    void pending.catch(() => {
      if (this.instances.get(key) === pending) this.instances.delete(key);
    });
    return pending;
  }

  private async openInstance(
    scope: WorkspaceStorageScope,
    configuration: Configuration
  ): Promise<InstanceLease> {
    const paths = await prepareDuckDbWorkspacePaths(configuration, scope);
    if (paths === null) throw new LocalDataRuntimeError('disabled');
    let instance: DuckDBInstance | undefined;
    try {
      // Disabled bootstrap never imports a native addon. No process-global native cache owns our lifetime.
      const { DuckDBInstance: NativeInstance } = await import('@duckdb/node-api');
      instance = await NativeInstance.create(
        paths.database,
        instanceSettings(configuration, paths.temporary)
      );
      await lockInstanceConfiguration(instance);
      const storage = await readDuckDbWorkspaceIdentity(configuration, scope);
      return { instance, storage };
    } catch (error) {
      try {
        instance?.closeSync();
      } catch {
        throw new LocalDataRuntimeError('close_failed');
      }
      if (error instanceof LocalDataStorageBoundaryError) throw error;
      throw new LocalDataRuntimeError('open_failed');
    }
  }

  private async runSession<T>(
    scope: WorkspaceStorageScope,
    action: (connection: DuckDBConnection) => Promise<T>,
    configuration: Configuration
  ): Promise<T> {
    const lease = await this.instanceForScope(scope, configuration);
    // Never recreate a disappeared workspace/spill directory while an instance still owns it.
    await validateDuckDbWorkspaceIdentity(configuration, scope, lease.storage);
    let connection: DuckDBConnection | undefined;
    try {
      connection = await lease.instance.connect();
      return await action(connection);
    } catch {
      // Native diagnostics can embed SQL, paths or row values. The public error is structural and sanitized.
      throw new LocalDataRuntimeError('session_failed');
    } finally {
      try {
        closeConnection(connection);
      } finally {
        // Check new WAL/mode changes even after callback/close failure; this does not roll back effects.
        await validateDuckDbWorkspaceIdentity(configuration, scope, lease.storage);
      }
    }
  }

  private async drainAndClose(): Promise<void> {
    await Promise.allSettled([...this.sessions]);
    const leases = await Promise.allSettled([...this.instances.values()]);
    const failures: unknown[] = [];
    for (const lease of leases) {
      if (lease.status !== 'fulfilled') continue;
      try {
        lease.value.instance.closeSync();
      } catch {
        failures.push(new LocalDataRuntimeError('close_failed'));
      }
    }
    this.instances.clear();
    if (failures.length > 0)
      throw new AggregateError(failures, 'Local data runtime shutdown failed');
  }
}
