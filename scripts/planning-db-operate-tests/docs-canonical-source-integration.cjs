/** Real PostgreSQL/Git proof for the existing document and schema command modes. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');
const { sha256HexUtf8 } = require('@dvt/crypto');
const { createGitRepositoryEnvironment } = require('../lib/git-repository-environment.cjs');
const { parseArgs, applyDocsResolutionOperation } = require('../planning-db-operate.cjs');
const { replaceCurrentPlanningDbViews, currentSchemaPath } = require('../planning-db-schema.cjs');
const {
  readDocumentationLifecycleRows,
  readFeatureMechanizationComponentRows,
} = require('../planning-db-query.cjs');

function registerDocsCanonicalSourceIntegration(dbUrl) {
  test('canonical document relocation proves two-view CAS, real Git origins, atomic preservation and replay', async () => {
    assert.match(new URL(dbUrl()).pathname, /^\/dvt_planning_test_/u);
    const client = new Client({ connectionString: dbUrl() });
    const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-doc-relocation-'));
    const git = (...args) =>
      execFileSync('git', args, {
        cwd: repoRoot,
        env: createGitRepositoryEnvironment(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
    const views = [
      'planning_query_store.command_query_rail_manifest_query',
      'planning_query_store.documentation_lifecycle_query',
    ];
    const viewHashes = async () =>
      (
        await client.query(
          `select c.oid::regclass::text as name,
      planning_query_store.sha256_text(pg_get_viewdef(c.oid,true)) as hash
      from pg_class c where c.oid=any($1::regclass[]) order by name`,
          [views]
        )
      ).rows;
    const snapshot = async () =>
      (
        await client.query(`select
      (select jsonb_agg(to_jsonb(d) order by d.document_id) from planning_query_store.knowledge_documents d)::text as docs,
      (select jsonb_agg(to_jsonb(r) order by r.rail_id) from planning_query_store.command_query_rails r)::text as rails,
      (select jsonb_agg(to_jsonb(d) order by d.design_id) from architecture.design d)::text as designs,
      (select jsonb_agg(to_jsonb(g) order by g.path) from planning_query_store.governance_files g)::text as files,
      (select jsonb_agg(to_jsonb(a) order by a.action_id) from planning_query_store.doc_disposition_actions a)::text as actions
    `)
      ).rows[0];
    await client.connect();
    try {
      // Build real old signatures without depending on Git history in a shallow CI checkout.
      for (const [index, name] of views.entries()) {
        const columns = (
          await client.query(
            `select attname from pg_attribute where attrelid=$1::regclass
          and attnum>0 and not attisdropped order by attnum`,
            [name]
          )
        ).rows.slice(0, index === 0 ? 27 : 26);
        const backup = `docs_relocation_fixture_${index}`;
        await client.query(`alter view ${name} rename to ${backup}`);
        await client.query(`create view ${name} as select ${columns.map(({ attname }) => '"' + attname.replaceAll('"', '""') + '"').join(',')}
          from planning_query_store.${backup}`);
      }
      await client.query(
        'create view planning_query_store.docs_relocation_dependent as select rail_id from planning_query_store.command_query_rail_manifest_query'
      );
      const beforeDefinitions = await viewHashes();
      const expected = {
        expectedSchemaSha256: sha256HexUtf8(fs.readFileSync(currentSchemaPath, 'utf8')),
        expectedManifestViewSha256: beforeDefinitions.find(({ name }) => name === views[0]).hash,
        expectedLifecycleViewSha256: beforeDefinitions.find(({ name }) => name === views[1]).hash,
      };
      const rowsBeforeDDL = await snapshot();
      await assert.rejects(
        replaceCurrentPlanningDbViews({
          client,
          ...expected,
          expectedManifestViewSha256: '0'.repeat(64),
        }),
        /stale definition CAS/
      );
      assert.deepEqual(await viewHashes(), beforeDefinitions);
      await client.query(`alter view ${views[1]} rename to docs_relocation_missing_view`);
      try {
        await assert.rejects(
          replaceCurrentPlanningDbViews({ client, ...expected }),
          /Missing view/
        );
      } finally {
        await client.query(
          `alter view planning_query_store.docs_relocation_missing_view rename to documentation_lifecycle_query`
        );
      }
      assert.deepEqual(await viewHashes(), beforeDefinitions);
      await client.query(`alter view ${views[0]} rename column rail_id to incompatible_rail_id`);
      try {
        const changed = await viewHashes();
        await assert.rejects(
          replaceCurrentPlanningDbViews({
            client,
            ...expected,
            expectedManifestViewSha256: changed.find(({ name }) => name === views[0]).hash,
          }),
          /cannot change name of view column/
        );
        assert.deepEqual(await viewHashes(), changed);
      } finally {
        await client.query(`alter view ${views[0]} rename column incompatible_rail_id to rail_id`);
      }
      assert.deepEqual(await viewHashes(), beforeDefinitions);
      await assert.rejects(
        replaceCurrentPlanningDbViews({
          ...expected,
          client: {
            async query(sql, values) {
              if (
                String(sql).startsWith(
                  'CREATE OR REPLACE VIEW planning_query_store.documentation_lifecycle_query'
                )
              )
                throw new Error('second view failure');
              return client.query(sql, values);
            },
          },
        }),
        /second view failure/
      );
      assert.deepEqual(await viewHashes(), beforeDefinitions);
      const deployments = await Promise.allSettled([
        replaceCurrentPlanningDbViews({ databaseUrl: dbUrl(), ...expected }),
        replaceCurrentPlanningDbViews({ databaseUrl: dbUrl(), ...expected }),
      ]);
      assert.equal(deployments.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.match(
        deployments.find(({ status }) => status === 'rejected').reason.message,
        /stale definition CAS/
      );
      assert.deepEqual(await snapshot(), rowsBeforeDDL);
      assert.equal(
        (await client.query('select count(*) from planning_query_store.docs_relocation_dependent'))
          .rowCount,
        1
      );
      assert.equal(
        (
          await client.query(
            'select * from planning_query_store.command_query_rail_manifest_query limit 0'
          )
        ).fields.length,
        28
      );
      assert.equal(
        (
          await client.query(
            'select * from planning_query_store.documentation_lifecycle_query limit 0'
          )
        ).fields.length,
        27
      );

      git('init');
      git('config', 'user.name', 'Document fixture');
      git('config', 'user.email', 'fixture@example.invalid');
      git('config', 'core.autocrlf', 'false');
      fs.mkdirSync(path.join(repoRoot, 'docs'));
      fs.writeFileSync(path.join(repoRoot, 'docs/old.md'), '# Imported original\n');
      git('add', '.');
      const sourceCommit = git('commit-tree', git('write-tree'), '-m', 'Imported original');
      git('update-ref', 'HEAD', sourceCommit);
      fs.writeFileSync(path.join(repoRoot, 'docs/old.md'), '# Later source, before retirement\n');
      git('add', '.');
      const laterCommit = git(
        'commit-tree',
        git('write-tree'),
        '-p',
        sourceCommit,
        '-m',
        'Later source'
      );
      git('update-ref', 'HEAD', laterCommit);
      fs.unlinkSync(path.join(repoRoot, 'docs/old.md'));
      fs.writeFileSync(path.join(repoRoot, 'docs/current.md'), '# Current contract\n');
      git('add', '.');
      const retirementCommit = git(
        'commit-tree',
        git('write-tree'),
        '-p',
        laterCommit,
        '-m',
        'Consolidated current contract'
      );
      git('update-ref', 'HEAD', retirementCommit);
      const sourceHash = sha256HexUtf8('# Imported original\n'),
        targetHash = sha256HexUtf8('# Current contract\n');
      await client.query(
        `insert into planning_query_store.knowledge_documents
        (document_id,document_path,document_type,title,status,source_content_sha256) values
        ('relocation-old','docs/old.md','architecture_component','Old','Active',$1),
        ('relocation-current','docs/current.md','architecture_component','Current','Review',$2)`,
        [sourceHash, targetHash]
      );
      await client.query(
        `insert into planning_query_store.governance_sources
        (source_path,source_type,content_sha256,source_bytes) values ('fixture','governance_file_shard',$1,0)`,
        [targetHash]
      );
      await client.query(
        `insert into planning_query_store.governance_file_shards
        (shard_id,source_path,file_count,content_hash,source_content_sha256,raw_shard)
        values ('relocation','fixture',1,$1,$1,'{}')`,
        [targetHash]
      );
      await client.query(
        `insert into planning_query_store.governance_files
        (path,file_id,shard_id,source_path,path_hash,content_hash,governance_hash,state_fingerprint,
         owning_unit,root_unit,domain_unit,component_unit,owner_level,unit_status,governance_state,
         canonical_role,evidence_state,is_drift,is_legacy,ddd_owner,cq_rails,source_content_sha256,raw_file)
        values ('docs/current.md','relocation-current','relocation','fixture',$1,$1,$1,$1,
          'fixture','fixture','fixture','fixture','component','review','current','canonical','none',false,false,'Docs','ResolveDocsDispositionQueue',$1,'{}')`,
        [targetHash]
      );
      await client.query(
        `insert into planning_query_store.command_query_rails
        (rail_id,feature_id,mechanization_status,rail_name,normalized_rail_name,rail_type,ddd_owner,
          source_path,source_content_sha256,raw_rail,raw_manifest) values
        ('relocation-fixture','RELOCATION-FIXTURE','implemented','Fixture','fixture','query','Docs','fixture',$1,'{}',
        '{"featureId":"RELOCATION-FIXTURE","componentGuides":["docs/old.md","docs/current.md","docs/old.md"],"symbols":[{"precision":9007199254740993}],"custom":0.123456789012345678901}')`,
        [sourceHash]
      );
      const immutable = await snapshot();
      const proof = {
        sourceCommit,
        retirementCommit,
        expectedSourceContentSha256: sourceHash,
        targetCommit: retirementCommit,
        targetPath: 'docs/current.md',
        targetAnchors: ['current-contract'],
        expectedTargetContentSha256: targetHash,
        expectedResolutionSha256: 'absent',
      };
      const command = parseArgs([
        'docs-disposition',
        'resolve',
        '--kind',
        'canonical_document_relocation',
        '--path',
        'docs/old.md',
        '--actor',
        'test',
        '--resolution',
        'linked',
        '--reason',
        'Current consolidated contract.',
        '--canonical-source',
        JSON.stringify(proof),
      ]);
      await assert.rejects(
        applyDocsResolutionOperation(
          { ...command, documentPath: 'docs/unregistered.md' },
          { databaseUrl: dbUrl(), repoRoot }
        ),
        /not imported/
      );
      for (const change of [
        { sourceCommit: laterCommit },
        { expectedSourceContentSha256: 'a'.repeat(64) },
        { targetAnchors: ['missing'] },
        { expectedTargetContentSha256: 'a'.repeat(64) },
        { targetCommit: laterCommit },
        { retirementCommit: laterCommit },
        { targetPath: 'docs/missing.md' },
        { targetPath: 'docs/old.md' },
        { expectedResolutionSha256: 'a'.repeat(64) },
        { extra: true },
      ]) {
        await assert.rejects(
          applyDocsResolutionOperation(
            {
              ...command,
              idempotencyKey: JSON.stringify(change),
              canonicalSource: { ...proof, ...change },
            },
            { databaseUrl: dbUrl(), repoRoot }
          )
        );
        assert.equal(
          (
            await client.query(
              "select count(*)::int n from planning_query_store.doc_resolution_operations where document_path='docs/old.md'"
            )
          ).rows[0].n,
          0
        );
        assert.deepEqual(await snapshot(), immutable);
      }
      fs.appendFileSync(path.join(repoRoot, 'docs/current.md'), 'Uncommitted\n');
      await assert.rejects(
        applyDocsResolutionOperation(command, { databaseUrl: dbUrl(), repoRoot }),
        /unmodified relative to HEAD/
      );
      fs.writeFileSync(path.join(repoRoot, 'docs/current.md'), '# Current contract\n');
      fs.writeFileSync(path.join(repoRoot, 'docs/old.md'), 'Untracked reintroduced source\n');
      await assert.rejects(
        applyDocsResolutionOperation(command, { databaseUrl: dbUrl(), repoRoot }),
        /exists in the working tree/
      );
      fs.unlinkSync(path.join(repoRoot, 'docs/old.md'));
      await client.query(
        "update planning_query_store.knowledge_documents set status='Retired' where document_id='relocation-current'"
      );
      const retiredSnapshot = await snapshot();
      await assert.rejects(
        applyDocsResolutionOperation(command, { databaseUrl: dbUrl(), repoRoot }),
        /retired or contradictory/
      );
      assert.deepEqual(await snapshot(), retiredSnapshot);
      await client.query(
        "update planning_query_store.knowledge_documents set status='Review' where document_id='relocation-current'"
      );
      const failureClient = {
        async query(sql, values) {
          if (String(sql).includes('insert into planning_query_store.doc_resolution_operations'))
            throw new Error('audit unavailable');
          return client.query(sql, values);
        },
      };
      await assert.rejects(
        applyDocsResolutionOperation(command, { client: failureClient, repoRoot }),
        /audit unavailable/
      );
      assert.equal(
        (
          await client.query(
            "select count(*)::int n from planning_query_store.doc_resolution_overlays where document_path='docs/old.md'"
          )
        ).rows[0].n,
        0
      );
      const deliveryCommands = [
        command,
        {
          ...command,
          idempotencyKey: 'another-concurrent-delivery',
          idempotencyKeyDefaulted: false,
        },
      ];
      const deliveries = await Promise.allSettled(
        deliveryCommands.map((delivery) =>
          applyDocsResolutionOperation(delivery, { databaseUrl: dbUrl(), repoRoot })
        )
      );
      assert.equal(deliveries.filter(({ status }) => status === 'fulfilled').length, 1);
      const winner = deliveries.find(({ status }) => status === 'fulfilled').value;
      assert.equal(winner.idempotent, false);
      const replayCommand =
        deliveryCommands[deliveries.findIndex(({ status }) => status === 'fulfilled')];
      assert.equal(
        (await applyDocsResolutionOperation(replayCommand, { databaseUrl: dbUrl(), repoRoot }))
          .idempotent,
        true
      );
      await assert.rejects(
        applyDocsResolutionOperation(
          {
            ...replayCommand,
            idempotencyKey: winner.audit.idempotencyKey,
            idempotencyKeyDefaulted: false,
            canonicalSource: { ...proof, targetAnchors: ['another'] },
          },
          { databaseUrl: dbUrl(), repoRoot }
        ),
        /IDEMPOTENCY|different|mismatch/i
      );
      assert.equal(
        (
          await client.query(
            "select count(*)::int n from planning_query_store.doc_resolution_operations where document_path='docs/old.md'"
          )
        ).rows[0].n,
        1
      );
      const lifecycle = await readDocumentationLifecycleRows(client, { path: 'docs/old.md' });
      assert.equal(lifecycle[0].status, 'Active');
      assert.equal(lifecycle[0].lifecycle_state, 'superseded');
      assert.equal(lifecycle[0].canonical_target_path, 'docs/current.md');
      const current = (
        await client.query(
          "select raw_manifest, effective_component_guides from planning_query_store.command_query_rail_manifest_query where rail_id='relocation-fixture'"
        )
      ).rows[0];
      assert.deepEqual(current.raw_manifest.componentGuides, [
        'docs/old.md',
        'docs/current.md',
        'docs/old.md',
      ]);
      assert.deepEqual(current.effective_component_guides, [
        'docs/current.md',
        'docs/current.md',
        'docs/current.md',
      ]);
      assert.ok(
        (
          await readFeatureMechanizationComponentRows(client, { featureId: 'RELOCATION-FIXTURE' })
        ).every(({ component_ref }) => component_ref === 'docs/current.md')
      );
      assert.deepEqual(await snapshot(), immutable);
      const overlay = (
        await client.query(`select planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(to_jsonb(r))) as hash
        from planning_query_store.doc_resolution_overlays r where document_path='docs/old.md'`)
      ).rows[0];
      const refreshed = await applyDocsResolutionOperation(
        {
          ...command,
          idempotencyKey: 'document-proof-revision',
          idempotencyKeyDefaulted: false,
          canonicalSource: { ...proof, expectedResolutionSha256: overlay.hash },
        },
        { databaseUrl: dbUrl(), repoRoot }
      );
      assert.equal(refreshed.resolution.resolutionKey, winner.resolution.resolutionKey);
      assert.equal(
        (
          await client.query(
            "select count(*)::int n from planning_query_store.doc_resolution_overlays where document_path='docs/old.md'"
          )
        ).rows[0].n,
        1
      );
      assert.equal(
        (await applyDocsResolutionOperation(replayCommand, { databaseUrl: dbUrl(), repoRoot }))
          .idempotent,
        true
      );
      assert.deepEqual(await snapshot(), immutable);
      await client.query(
        "update planning_query_store.governance_files set content_hash=repeat('f',64) where path='docs/current.md'"
      );
      assert.equal(
        (await readDocumentationLifecycleRows(client, { path: 'docs/old.md' }))[0].lifecycle_state,
        'superseded'
      );
    } finally {
      await client.end();
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });
}

module.exports = registerDocsCanonicalSourceIntegration;
