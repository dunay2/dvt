import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { CanvasAuthoringAuthorityPolicy } from '../../src/application/services/canvasAuthoringAuthorityPolicy.js';
import { PostgresCanvasAuthoringAuthorityStore } from '../../src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';
import { resolveWorkspaceScopeStorageRoot } from '../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';
import { PostgresWorkspaceGraphDraftStore } from '../../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import { buildDbtProjectRootRelocationRuntime } from '../../src/modules/dbtProjectRootRelocation/buildDbtProjectRootRelocationRuntime.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const suite = databaseUrl ? describe : describe.skip;
suite('real PostgreSQL/filesystem root relocation', () => {
  it('preserves imported bytes, native source files, scope and authority through the production composition', async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const schema = `it_root_relocation_${randomUUID().replaceAll('-', '')}`;
    const root = await mkdtemp(path.join(tmpdir(), 'dvt-root-integration-'));
    const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
    const canvasId = 'files';
    const directory = resolveWorkspaceScopeStorageRoot(root, scope);
    try {
      const draftStore = new PostgresWorkspaceGraphDraftStore({ pool, schema });
      const authorities = new PostgresCanvasAuthoringAuthorityStore({ pool, schema });
      await draftStore.migrate();
      await authorities.migrate();
      await mkdir(path.join(directory, 'imported/models'), { recursive: true });
      await mkdir(path.join(directory, 'models/sources'), { recursive: true });
      const sql = "select * from {{ ref('customers') }} -- untouched\r\n";
      await writeFile(
        path.join(directory, 'imported/dbt_project.yml'),
        "name: analytics\nversion: '1.0'\nconfig-version: 2\nmodel-paths: ['models']\n"
      );
      await writeFile(path.join(directory, 'imported/models/orders.sql'), sql);
      await writeFile(path.join(directory, 'models/sources/raw.yml'), 'version: 2\nsources: []\n');
      await authorities.bind({
        key: { ...scope, canvasId },
        binding: {
          schemaVersion: 'canvas-authoring-authority-binding.v1',
          canvasId,
          authority: { kind: 'dbt-project-files', projectRoot: 'imported' },
        },
        idempotencyKey: 'import',
        requestHash: 'request',
        revision: 'before',
        nowIso: '2026-11-02T11:00:00.000Z',
      });
      const runtime = buildDbtProjectRootRelocationRuntime({
        workspaceFilesRoot: root,
        authorities,
        authorityPolicy: new CanvasAuthoringAuthorityPolicy(authorities, draftStore),
      });
      const preview = await runtime.previewQuery.execute({ scope, canvasId });
      expect(preview.kind).toBe('ready');
      if (preview.kind !== 'ready') throw new Error(JSON.stringify(preview));
      expect(await runtime.relocateCommand.execute({ scope, plan: preview.plan })).toMatchObject({
        kind: 'relocated',
      });
      expect(await readFile(path.join(directory, 'models/orders.sql'), 'utf8')).toBe(sql);
      expect(await readFile(path.join(directory, 'models/sources/raw.yml'), 'utf8')).toContain(
        'sources: []'
      );
      expect(await authorities.read({ ...scope, canvasId })).toMatchObject({
        binding: { canvasId, authority: { kind: 'dbt-project-files', projectRoot: '.' } },
      });
      expect(await authorities.read({ ...scope, tenantId: 'other', canvasId })).toBeNull();
      expect(await runtime.relocateCommand.execute({ scope, plan: preview.plan })).toMatchObject({
        kind: 'relocated',
        deduplicated: true,
      });
    } finally {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
      await rm(root, { recursive: true, force: true });
    }
  });
});
