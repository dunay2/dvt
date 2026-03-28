import {
  POSTGRES_ADAPTER_ERROR_CONSTANTS as E,
  POSTGRES_ADAPTER_RUNTIME_CONSTANTS as C,
} from './PostgresAdapterConstants.js';

export function resolvePostgresConnectionString(
  configConnectionString: string | undefined
): string {
  const resolved =
    configConnectionString ?? process.env[C.postgresUrlEnvVar] ?? process.env[C.databaseUrlEnvVar];
  if (typeof resolved !== 'string' || resolved.trim().length === 0) {
    throw new Error(E.missingConnectionStringErrorMessage);
  }
  return resolved;
}
