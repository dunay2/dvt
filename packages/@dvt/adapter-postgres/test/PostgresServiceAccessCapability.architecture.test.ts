import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../../..');
const sourceRoot = resolve(testDir, '../src');
const apiSourceRoot = join(repoRoot, 'apps/api/src');

describe('Postgres service access capability architecture', () => {
  it('keeps service access behind a closed maintenance catalog and entrypoint', () => {
    const capabilityPath = join(sourceRoot, 'PostgresServiceAccessCapability.ts');
    const maintenancePath = join(sourceRoot, 'PostgresMaintenanceAccess.ts');
    expect(existsSync(capabilityPath)).toBe(true);
    expect(existsSync(maintenancePath)).toBe(true);

    const capabilitySource = readFileSync(capabilityPath, 'utf8');
    const maintenanceSource = readFileSync(maintenancePath, 'utf8');
    const schemaManagerSource = readFileSync(join(sourceRoot, 'PostgresSchemaManager.ts'), 'utf8');

    expect(capabilitySource).toContain('const POSTGRES_SERVICE_ACCESS_CAPABILITY: unique symbol');
    expect(capabilitySource).not.toContain('export const POSTGRES_SERVICE_ACCESS_CAPABILITY');
    expect(capabilitySource).not.toContain('export function createPostgresServiceAccessCapability');
    expect(capabilitySource).toContain('export interface PostgresServiceAccessCapability');
    expect(capabilitySource).toContain('export const POSTGRES_SERVICE_ACCESS');
    expect(maintenanceSource).toContain('enterPostgresMaintenanceContext');
    expect(maintenanceSource).toContain('setServiceContextSql()');
    expect(schemaManagerSource).not.toContain('setServiceContext(');
  });

  it('keeps the service capability internal to the adapter package root', () => {
    const publicIndex = readFileSync(join(sourceRoot, 'index.ts'), 'utf8');

    expect(publicIndex).not.toContain('PostgresServiceAccessCapability');
    expect(publicIndex).not.toContain('createPostgresServiceAccessCapability');
    expect(publicIndex).not.toContain('PostgresMaintenanceAccess');
    expect(publicIndex).not.toContain('enterPostgresMaintenanceContext');
  });

  it('forbids production bypasses around the maintenance service entrypoint', () => {
    const offenders = listTypeScriptFiles(sourceRoot)
      .filter((filePath) => filePath !== join(sourceRoot, 'PostgresMaintenanceAccess.ts'))
      .filter((filePath) => filePath !== join(sourceRoot, 'PostgresServiceAccessCapability.ts'))
      .filter((filePath) => filePath !== join(sourceRoot, 'PostgresTenantIsolationPolicy.ts'))
      .filter((filePath) => filePath !== join(sourceRoot, 'PostgresSchemaManagerSql.ts'))
      .flatMap((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        const forbiddenPatterns = [
          /PostgresSchemaManager\.setServiceContext/g,
          /createPostgresServiceAccessCapability/g,
          /setServiceContextSql/g,
        ];
        return forbiddenPatterns.flatMap((pattern) =>
          pattern.test(source) ? [relative(sourceRoot, filePath)] : []
        );
      });

    expect(offenders).toEqual([]);
  });

  it('forbids API code from importing Postgres maintenance service authority', () => {
    const offenders = listTypeScriptFiles(apiSourceRoot).flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const forbiddenPatterns = [
        /PostgresServiceAccessCapability/g,
        /PostgresMaintenanceAccess/g,
        /enterPostgresMaintenanceContext/g,
        /setServiceContextSql/g,
        /PostgresSchemaManager\.setServiceContext/g,
      ];
      return forbiddenPatterns.flatMap((pattern) =>
        pattern.test(source) ? [relative(apiSourceRoot, filePath)] : []
      );
    });

    expect(offenders).toEqual([]);
  });
});

function listTypeScriptFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const entryPath = join(root, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      return listTypeScriptFiles(entryPath);
    }
    return entry.endsWith('.ts') ? [entryPath] : [];
  });
}
