import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

import {
  CANVAS_AUTHORING_FIELD_LIMITS_V1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';
import { base64Bytes, sha256Hex } from '@dvt/crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PostgresCanvasAuthoringAuthorityStore } from '../../src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';
import { PostgresWorkspaceGraphDraftStore } from '../../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import {
  TEST_WORKSPACE_SCOPE,
  buildCanonicalSemanticDocument,
  buildCanonicalSemanticWorkspaceGraphDraft,
  buildWorkspaceGraphDraftSaveRequest,
} from '../fixtures/workspaceGraphDraftFixture.js';

import {
  buildSemanticGetUseCase,
  buildSemanticSaveUseCase,
  readTransformAuthority,
  withSemanticDocument,
  writableSemanticDecision,
} from './workspaceGraphDraftSemanticPersistence.support.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeWithPostgres = databaseUrl ? describe : describe.skip;
const schema = `it_semantic_draft_${randomUUID().replaceAll('-', '')}`;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const store = pool
  ? new PostgresWorkspaceGraphDraftStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;
const authorityStore = pool
  ? new PostgresCanvasAuthoringAuthorityStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;

describeWithPostgres('workspace graph canonical semantic persistence', () => {
  beforeAll(async () => {
    await store!.migrate();
    await authorityStore!.migrate();
  });
  beforeEach(async () => {
    await pool!.query(
      `TRUNCATE TABLE "${schema}".workspace_graph_draft_idempotency, "${schema}".workspace_graph_drafts CASCADE`
    );
  });
  afterAll(async () => {
    await pool!.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool!.end();
  });

  it('persists and reloads the exact Plan, digest and stable DVT identities through both rails', async () => {
    const draft = buildCanonicalSemanticWorkspaceGraphDraft();
    const save = buildSemanticSaveUseCase(store!);
    const get = buildSemanticGetUseCase(store!);
    const first = await save.execute({
      request: buildWorkspaceGraphDraftSaveRequest({ draft }),
      decision: writableSemanticDecision(),
    });

    expect(first.response.kind).toBe('saved');
    const loaded = await get.execute(writableSemanticDecision());
    expect(loaded.response.kind).toBe('ok');
    if (loaded.response.kind !== 'ok') throw new Error('Expected a persisted draft.');
    const authority = readTransformAuthority(loaded.response.record.draft);
    expect(authority.semanticDocument).toEqual(buildCanonicalSemanticDocument());
    expect(
      authority.semanticDocument.sidecar.relations.map(({ relationId }) => relationId)
    ).toEqual(['relation:source-node', 'relation:transform-node:project']);
    expect(authority.semanticDocument.sidecar.fields.map(({ fieldId }) => fieldId)).toEqual([
      'field:transform-node:name',
      'field:transform-node:email',
      'field:transform-node:country',
    ]);

    const stale = await save.execute({
      request: buildWorkspaceGraphDraftSaveRequest({ draft, idempotencyKey: 'stale-save' }),
      decision: writableSemanticDecision(),
    });
    expect(stale.response.kind).toBe('conflict');
    expect((await get.execute(writableSemanticDecision())).response).toEqual(loaded.response);
  });

  it('fails closed when stored semantic bytes are corrupted with a matching forged digest', async () => {
    const save = buildSemanticSaveUseCase(store!);
    await save.execute({
      request: buildWorkspaceGraphDraftSaveRequest({
        draft: buildCanonicalSemanticWorkspaceGraphDraft(),
      }),
      decision: writableSemanticDecision(),
    });
    const document = buildCanonicalSemanticDocument();
    const bytes = base64Bytes(document.semanticPlan.bytesBase64);
    bytes[0] = 0xff;
    const sha256 = sha256Hex(bytes);
    const corruptDocument: DvtSubstraitSemanticDocumentV1 = {
      ...document,
      semanticPlan: {
        ...document.semanticPlan,
        bytesBase64: Buffer.from(bytes).toString('base64'),
        sha256,
      },
      sidecar: { ...document.sidecar, semanticPlanSha256: sha256 },
    };
    const corruptDraft = withSemanticDocument(
      buildCanonicalSemanticWorkspaceGraphDraft(),
      corruptDocument
    );
    await pool!.query(
      `UPDATE "${schema}".workspace_graph_drafts SET draft_json = $1::jsonb
       WHERE tenant_id = $2 AND project_id = $3 AND environment_id = $4`,
      [
        JSON.stringify(corruptDraft),
        TEST_WORKSPACE_SCOPE.tenantId,
        TEST_WORKSPACE_SCOPE.projectId,
        TEST_WORKSPACE_SCOPE.environmentId,
      ]
    );

    const loaded = await buildSemanticGetUseCase(store!).execute(writableSemanticDecision());
    expect(loaded.httpStatus).toBe(422);
    expect(loaded.response).toMatchObject({
      kind: 'format_error',
      formatError: { reason: 'corrupt_payload' },
    });
  });

  it('rejects oversized names at the database boundary without rewriting stored drafts', async () => {
    const save = buildSemanticSaveUseCase(store!);
    await save.execute({
      request: buildWorkspaceGraphDraftSaveRequest({
        draft: buildCanonicalSemanticWorkspaceGraphDraft(),
      }),
      decision: writableSemanticDecision(),
    });

    const oversizedName = 'x'.repeat(CANVAS_AUTHORING_FIELD_LIMITS_V1.humanNameCodePoints + 1);
    await expect(
      pool!.query(
        `UPDATE "${schema}".workspace_graph_drafts
         SET draft_json = jsonb_set(draft_json, '{nodes,0,name}', to_jsonb($1::text))`,
        [oversizedName]
      )
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'workspace_graph_drafts_field_budget_check',
    });

    await pool!.query(
      `ALTER TABLE "${schema}".workspace_graph_drafts
       DROP CONSTRAINT workspace_graph_drafts_field_budget_check`
    );
    await pool!.query(
      `UPDATE "${schema}".workspace_graph_drafts
       SET draft_json = jsonb_set(draft_json, '{nodes,0,name}', to_jsonb($1::text))`,
      [oversizedName]
    );

    await store!.migrate();

    const loaded = await buildSemanticGetUseCase(store!).execute(writableSemanticDecision());
    expect(loaded.httpStatus).toBe(422);
    expect(loaded.response).toMatchObject({
      kind: 'format_error',
      formatError: { reason: 'corrupt_payload' },
    });
    await expect(
      pool!.query(`UPDATE "${schema}".workspace_graph_drafts SET revision = 'forged-revision'`)
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'workspace_graph_drafts_field_budget_check',
    });
  });
  it('enforces canonical post-trim storage and DVT ownership semantics at the database boundary', async () => {
    const baseDraft = buildCanonicalSemanticWorkspaceGraphDraft();
    const accepts = async (draft: unknown): Promise<boolean> => {
      const result = await pool!.query<{ accepted: boolean }>(
        `SELECT "${schema}".workspace_graph_draft_fields_within_budget($1::jsonb) AS accepted`,
        [JSON.stringify(draft)]
      );
      return result.rows[0]?.accepted ?? false;
    };

    const unicodeWhitespaceName = {
      ...baseDraft,
      canvas: { ...baseDraft.canvas, title: `\u00a0${baseDraft.canvas.title}` },
    };
    expect(await accepts(unicodeWhitespaceName)).toBe(false);

    const duplicateTrimmedTags = {
      ...baseDraft,
      nodes: baseDraft.nodes.map((node, index) =>
        index === 0 ? { ...node, tags: ['finance', '\tfinance\t'] } : node
      ),
    };
    expect(await accepts(duplicateTrimmedTags)).toBe(false);

    const exteriorIdentifierWhitespace = {
      ...baseDraft,
      nodes: baseDraft.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              pluginId: 'dvt',
              kind: 'dvt:source',
              metadata: { config: { schema: 'raw\t', table: 'orders', alias: 'orders' } },
            }
          : node
      ),
    };
    expect(await accepts(exteriorIdentifierWhitespace)).toBe(false);

    const warehouseSourceWithInvalidIdentifier = {
      ...baseDraft,
      nodes: baseDraft.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              pluginId: 'dvt.warehouse-source',
              kind: 'dvt:source',
              metadata: { config: { schema: 'raw\t', table: 'orders', alias: 'orders' } },
            }
          : node
      ),
    };
    expect(await accepts(warehouseSourceWithInvalidIdentifier)).toBe(false);

    const dvtSinkWithInvalidEnum = {
      ...baseDraft,
      nodes: baseDraft.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              pluginId: 'dvt',
              kind: 'dvt:sink',
              metadata: { config: { schema: 'raw', table: 'orders', materialization: 'foreign' } },
            }
          : node
      ),
    };
    expect(await accepts(dvtSinkWithInvalidEnum)).toBe(false);

    const save = buildSemanticSaveUseCase(store!);
    await save.execute({
      request: buildWorkspaceGraphDraftSaveRequest({ draft: baseDraft }),
      decision: writableSemanticDecision(),
    });
    await expect(
      pool!.query(`UPDATE "${schema}".workspace_graph_drafts SET draft_json = $1::jsonb`, [
        JSON.stringify(dvtSinkWithInvalidEnum),
      ])
    ).rejects.toMatchObject({
      code: '23514',
      constraint: 'workspace_graph_drafts_field_budget_check',
    });

    const foreignSinkKind = {
      ...baseDraft,
      nodes: baseDraft.nodes.map((node, index) =>
        index === 0
          ? {
              ...node,
              pluginId: 'dvt.warehouse-source',
              kind: 'dvt:sink',
              metadata: {
                config: { materialization: 'foreign', writeMode: 'foreign' },
              },
            }
          : node
      ),
    };
    expect(await accepts(foreignSinkKind)).toBe(true);
  });
});
