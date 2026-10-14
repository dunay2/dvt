/** Owned concern: real PostgreSQL current-document reconciliation preservation. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');
const { createGitRepositoryEnvironment } = require('../lib/git-repository-environment.cjs');
const { applyCatalogReconciliation } = require('../planning-db/catalog-reconciliation-write.cjs');

module.exports = function registerCurrentDocumentIntegration(dbUrl) {
  test('current document reconciliation preserves native evidence, rolls back and replays atomically', async () => {
    const client = new Client({ connectionString: dbUrl() });
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-current-document-'));
    const git = (...args) =>
      execFileSync('git', args, {
        cwd: repoRoot,
        env: createGitRepositoryEnvironment(),
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    await client.connect();
    try {
      git('init');
      git('config', 'user.name', 'Document fixture');
      git('config', 'user.email', 'fixture@example.invalid');
      git('config', 'core.autocrlf', 'false');
      fs.mkdirSync(path.join(repoRoot, 'docs'));
      fs.writeFileSync(path.join(repoRoot, 'docs/new.md'), '# Current guide\n');
      fs.writeFileSync(
        path.join(repoRoot, 'docs/current.md'),
        [
          '```feature-mechanization',
          'featureId: CURRENT-DOCUMENT',
          'componentGuides: [docs/new.md]',
          'governingSources: [docs/new.md]',
          '```',
          '',
        ].join('\n')
      );
      git('add', '.');
      const commit = git('commit-tree', git('write-tree'), '-m', 'Current document fixture');
      git('update-ref', 'HEAD', commit);
      await client.query(`insert into architecture.design
        (design_id, work_item_id, title, owner, status, rationale, rail_ref)
        values ('current-document', 'GH-3643', 'Current documentary references', 'Catalog', 'review',
          'Lossless metadata reconciliation', 'RecordFeatureMechanizationRail')`);
      await client.query(`insert into architecture.design_scope (design_id, subject_kind, subject_id, scope_kind)
        select 'current-document', 'relation', 'planning_query_store.' || name, 'may_update'
        from unnest(array['command_query_rails','feature_mechanization_local_operations']) name`);
      await client.query(`insert into planning_query_store.command_query_rails
        (rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name, rail_type,
         ddd_owner, source_path, source_content_sha256, raw_rail, raw_manifest, governing_sources)
        values ('current-document', 'CURRENT-DOCUMENT', 'implemented', 'CurrentDocument', 'currentdocument',
          'command', 'Catalog', 'docs/current.md', repeat('a',64), '{"name":"CurrentDocument","type":"command"}',
          '{"featureId":"CURRENT-DOCUMENT","componentGuides":["docs/old.md"],"governingSources":["docs/old.md"],
            "symbols":[{"name":"keep","precision":9007199254740993}],"redGreenCycles":[{"id":"keep"}],
            "other":0.123456789012345678901}', '["docs/old.md"]')`);
      const snapshot = async () =>
        (
          await client.query(`select to_jsonb(rail)::text as text,
        planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(to_jsonb(rail))) as hash
        from planning_query_store.command_query_rails rail where rail_id = 'current-document'`)
        ).rows[0];
      const before = await snapshot();
      const request = {
        designId: 'current-document',
        actor: 'test',
        idempotencyKey: 'current-document',
        changes: [
          {
            origin: 'imported',
            railId: 'current-document',
            expectedRowSha256: before.hash,
            currentDocument: {
              commit,
              path: 'docs/current.md',
              references: ['componentGuides', 'governingSources'].map((field) => ({
                field,
                index: 0,
                from: 'docs/old.md',
                to: 'docs/new.md',
              })),
            },
          },
        ],
      };
      const options = { client, repoRoot };
      const reject = async (input, pattern, overrides = {}) => {
        await assert.rejects(
          applyCatalogReconciliation(input, { ...options, ...overrides }),
          pattern
        );
        assert.deepEqual(await snapshot(), before);
        assert.equal(
          (
            await client.query(`select count(*)::int n from planning_query_store.feature_mechanization_local_operations
          where payload->>'designId'='current-document'`)
          ).rows[0].n,
          0
        );
      };
      const invalid = structuredClone(request);
      invalid.changes[0].currentDocument.references[0].from = 'docs/wrong.md';
      await reject(invalid, /CATALOG-DOCUMENT/);
      await reject(request, /audit failure/, {
        client: {
          query(sql, values) {
            if (
              sql
                .trimStart()
                .startsWith(
                  'insert into planning_query_store.feature_mechanization_local_operations'
                )
            )
              throw new Error('audit failure');
            return client.query(sql, values);
          },
        },
      });
      fs.appendFileSync(path.join(repoRoot, 'docs/new.md'), 'dirty');
      await reject(request, /unmodified/);
      fs.writeFileSync(path.join(repoRoot, 'docs/new.md'), '# Current guide\n');
      assert.equal((await applyCatalogReconciliation(request, options)).changed, 1);
      const after = await snapshot();
      const proof = (
        await client.query(
          `select
        (payload->'before') = $1::jsonb as exact_before,
        (payload->'after') = $2::jsonb as exact_after,
        ((payload->'before') - array['source_content_sha256','raw_manifest','governing_sources']) =
          ((payload->'after') - array['source_content_sha256','raw_manifest','governing_sources']) as unrelated,
        ((payload #> '{before,raw_manifest}') - array['componentGuides','governingSources']) =
          ((payload #> '{after,raw_manifest}') - array['componentGuides','governingSources']) as evidence,
        payload #>> '{after,raw_manifest,symbols,0,precision}' as precise_integer,
        payload #>> '{after,raw_manifest,other}' as precise_decimal
        from planning_query_store.feature_mechanization_local_operations where idempotency_key='current-document:catalog:0'`,
          [before.text, after.text]
        )
      ).rows[0];
      assert.deepEqual(proof, {
        exact_before: true,
        exact_after: true,
        unrelated: true,
        evidence: true,
        precise_integer: '9007199254740993',
        precise_decimal: '0.123456789012345678901',
      });
      const row = JSON.parse(after.text);
      assert.deepEqual(row.raw_manifest.componentGuides, ['docs/new.md']);
      assert.deepEqual(row.governing_sources, row.raw_manifest.governingSources);
      assert.equal((await applyCatalogReconciliation(request, options)).idempotent, true);
      await assert.rejects(
        applyCatalogReconciliation({ ...request, actor: 'other' }, options),
        /IDEMPOTENCY/
      );
      assert.deepEqual(await snapshot(), after);
    } finally {
      await client.end();
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });
};
