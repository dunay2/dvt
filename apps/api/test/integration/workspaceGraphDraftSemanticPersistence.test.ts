import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { type DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';
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
});
