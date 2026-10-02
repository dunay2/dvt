import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';
import { readLocalDataConfiguration } from '../../src/plugins/localDataEnv.js';

const root = path.join(tmpdir(), 'dvt-local-config');
const authoring = path.join(tmpdir(), 'dvt-authoring-config');
const valid: NodeJS.ProcessEnv = {
  DVT_LOCAL_DATA_ENABLED: 'true',
  DVT_LOCAL_DATA_ROOT: root,
  DVT_WORKSPACE_FILES_ROOT: authoring,
  DVT_DUCKDB_MEMORY_LIMIT_BYTES: '134217728',
  DVT_DUCKDB_THREADS: '1',
  DVT_DUCKDB_MAX_TEMP_BYTES: '268435456',
  DVT_LOCAL_DATA_MAX_OPEN_WORKSPACES: '2',
  DVT_LOCAL_DATA_MAX_CONCURRENT_SESSIONS: '2',
};
const budgetKeys = [
  'DVT_DUCKDB_MEMORY_LIMIT_BYTES',
  'DVT_DUCKDB_THREADS',
  'DVT_DUCKDB_MAX_TEMP_BYTES',
  'DVT_LOCAL_DATA_MAX_OPEN_WORKSPACES',
  'DVT_LOCAL_DATA_MAX_CONCURRENT_SESSIONS',
] as const;

describe('local data configuration', () => {
  it.each([undefined, 'false', ' FALSE '])('keeps %s disabled without evaluating paths', (flag) => {
    expect(
      readLocalDataConfiguration({ DVT_LOCAL_DATA_ENABLED: flag, DVT_LOCAL_DATA_ROOT: '\0' })
    ).toEqual({ kind: 'disabled' });
  });

  it.each(['', 'yes', '0', '1', 'junk'])('rejects an ambiguous flag %s', (flag) => {
    expect(() => readLocalDataConfiguration({ ...valid, DVT_LOCAL_DATA_ENABLED: flag })).toThrow(
      /DVT_LOCAL_DATA_ENABLED/
    );
  });

  it('is validated by the existing environment entry point without claiming runtime readiness', () => {
    expect(loadEnv({}).localData).toEqual({ kind: 'disabled' });
    expect(loadEnv(valid).localData).toEqual({
      kind: 'configured',
      root,
      workspaceFilesRoot: authoring,
      memoryLimitBytes: 134217728,
      threads: 1,
      maxTempBytes: 268435456,
      maxOpenWorkspaces: 2,
      maxConcurrentSessions: 2,
    });
    expect(() => loadEnv({ DVT_LOCAL_DATA_ENABLED: 'true' })).toThrow(/DVT_LOCAL_DATA_ROOT/);
  });

  it.each(budgetKeys)('requires a positive exact integer for %s', (key) => {
    for (const value of [undefined, '', '0', '-1', '1.5', '1e3', 'NaN', 'Infinity', '9007199254740992', '1GB']) {
      expect(() => readLocalDataConfiguration({ ...valid, [key]: value })).toThrow(new RegExp(key));
    }
  });

  it.each(['DVT_LOCAL_DATA_ROOT', 'DVT_WORKSPACE_FILES_ROOT'])(
    'requires an explicit non-root absolute directory for %s',
    (key) => {
      for (const value of [undefined, '', '.', 'relative/path', '\0', path.parse(root).root]) {
        expect(() => readLocalDataConfiguration({ ...valid, [key]: value })).toThrow(new RegExp(key));
      }
    }
  );

  it.each([root, path.join(root, 'nested'), path.dirname(root), path.join(root, 'child', '..')])(
    'rejects overlapping authoring storage %s',
    (workspaceFilesRoot) => {
      expect(() =>
        readLocalDataConfiguration({ ...valid, DVT_WORKSPACE_FILES_ROOT: workspaceFilesRoot })
      ).toThrow(/overlap/);
    }
  );

  it('distinguishes a shared name prefix from actual containment', () => {
    expect(
      readLocalDataConfiguration({ ...valid, DVT_WORKSPACE_FILES_ROOT: `${root}-other` }).kind
    ).toBe('configured');
  });

  it('normalizes paths, accepts explicit case-normalized true and does not mutate input', () => {
    const input = Object.freeze({
      ...valid,
      DVT_LOCAL_DATA_ENABLED: ' TRUE ',
      DVT_LOCAL_DATA_ROOT: path.join(root, 'child', '..'),
    });
    const before = { ...input };
    const result = readLocalDataConfiguration(input);
    expect(result).toMatchObject({ kind: 'configured', root });
    expect(Object.isFrozen(result)).toBe(true);
    expect(input).toEqual(before);
  });

  it.each(['DVT_DUCKDB_MEMORY_LIMIT_BYTES', 'DVT_DUCKDB_THREADS', 'DVT_DUCKDB_MAX_TEMP_BYTES'])(
    'rejects aggregate overflow for %s rather than losing budget precision',
    (key) => {
      expect(() =>
        readLocalDataConfiguration({ ...valid, [key]: String(Number.MAX_SAFE_INTEGER) })
      ).toThrow(/aggregate/);
    }
  );
});
