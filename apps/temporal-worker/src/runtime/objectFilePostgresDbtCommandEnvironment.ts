/** Owned concern: adapt a DBT bridge marker and authorized run scope to worker-local process input. */
import { resolvePostgresObjectFileScopeSchema } from '@dvt/adapter-postgres';
import {
  OBJECT_FILE_POSTGRES_DBT_STAGING_SCHEMA_ENV,
  resolveObjectFilePostgresDbtBridge,
} from '@dvt/contracts';
import type { DbtPluginExecutionInput } from '@dvt/temporal-dbt-plugin';

export function resolveObjectFilePostgresDbtCommandEnvironment(
  input: DbtPluginExecutionInput
): Readonly<Record<string, string>> {
  const bridge = resolveObjectFilePostgresDbtBridge(input.step.stepTypeConfig);
  if (bridge.status === 'absent') return {};
  if (bridge.status === 'invalid') {
    throw new Error('DBT_OBJECT_FILE_POSTGRES_BRIDGE_INVALID');
  }

  return {
    [OBJECT_FILE_POSTGRES_DBT_STAGING_SCHEMA_ENV]: resolvePostgresObjectFileScopeSchema('staging', {
      tenantId: input.runExecutionContext.tenantId,
      projectId: input.runExecutionContext.projectId,
      environmentId: input.runExecutionContext.environmentId,
    }),
  };
}
