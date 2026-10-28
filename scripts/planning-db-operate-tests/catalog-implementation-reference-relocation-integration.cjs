/** Owned concern: real Git and isolated PostgreSQL proof of lossless imported reference relocation. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { repository } = require('../lib/feature-mechanization-git-fixture.cjs');
const {
  applyCatalogReconciliation,
  verifyImplementationReferenceRelocationSources,
} = require('../planning-db/catalog-reconciliation-write.cjs');

function registerCatalogImplementationReferenceRelocationIntegration(dbUrl) {
  test('implementation reference relocation proves actual Git declarations, not aliases or stubs', async (t) => {
    const repo = repository(t);
    repo.git('config', 'core.autocrlf', 'false');
    const real =
      'function executeCatalog(value) { return value + 1; }\nconst operationHelp = { help: "catalog" };\n';
    repo.write('old.cjs', real);
    const sourceCommit = repo.commit(repo.base);
    repo.write('new.cjs', real);
    let targetCommit = repo.commit(sourceCommit);
    const relocation = () => ({
      sourceCommit,
      targetCommit,
      selectors: [
        {
          field: 'implementation_refs',
          index: 0,
          from: { path: 'old.cjs', symbol: 'executeCatalog' },
          to: { path: 'new.cjs', symbol: 'executeCatalog' },
        },
      ],
    });
    const options = { repoRoot: repo.root };
    assert.equal(
      verifyImplementationReferenceRelocationSources(relocation(), options).declarations[0].kind,
      'function'
    );
    const constant = relocation();
    constant.selectors[0].from.symbol = constant.selectors[0].to.symbol = 'operationHelp';
    assert.equal(
      verifyImplementationReferenceRelocationSources(constant, options).declarations[0].kind,
      'variable'
    );
    for (const [body, pattern] of [
      ['function executeCatalog() {}\n', /STUB/],
      ['function executeCatalog() { "use strict"; }\n', /STUB/],
      ['function executeCatalog() { return undefined; }\n', /STUB/],
      ['function executeCatalog() { throw new Error("Not implemented"); }\n', /STUB/],
      ['const executeCatalog = 42;\n', /compatible/i],
      ['const other = value => value; export { other as executeCatalog };\n', /DECLARATION/],
      [
        'module.exports = { executeCatalog: require("./old.cjs").executeCatalog };\n',
        /DECLARATION/,
      ],
      [
        'function executeCatalog(value) { return value; }\nfunction executeCatalog(value) { return value; }\n',
        /DECLARATION/,
      ],
    ]) {
      repo.write('new.cjs', body);
      targetCommit = repo.commit(targetCommit);
      assert.throws(
        () => verifyImplementationReferenceRelocationSources(relocation(), options),
        pattern
      );
    }
    repo.write('new.cjs', real);
    targetCommit = repo.commit(targetCommit);
    fs.appendFileSync(path.join(repo.root, 'new.cjs'), '// dirty\n');
    assert.throws(
      () => verifyImplementationReferenceRelocationSources(relocation(), options),
      /unmodified/
    );
    repo.write('new.cjs', real);
    repo.git('update-index', '--assume-unchanged', 'new.cjs');
    fs.appendFileSync(path.join(repo.root, 'new.cjs'), '// hidden dirty\n');
    assert.throws(
      () => verifyImplementationReferenceRelocationSources(relocation(), options),
      /working bytes/
    );
    repo.write('new.cjs', real);
    repo.git('update-index', '--no-assume-unchanged', 'new.cjs');
    const untracked = relocation();
    repo.write('untracked.cjs', real);
    untracked.selectors[0].to.path = 'untracked.cjs';
    assert.throws(
      () => verifyImplementationReferenceRelocationSources(untracked, options),
      /unmodified|tracked regular/
    );
    const wrongHead = relocation();
    wrongHead.targetCommit = sourceCommit;
    assert.throws(
      () => verifyImplementationReferenceRelocationSources(wrongHead, options),
      /HEAD|regular/
    );
    const unrelated = relocation();
    unrelated.sourceCommit = repo.git(
      'commit-tree',
      repo.git('write-tree'),
      '-m',
      'Unrelated fixture'
    );
    assert.throws(
      () => verifyImplementationReferenceRelocationSources(unrelated, options),
      /ANCESTOR/
    );
    const blob = repo.git('rev-parse', `${targetCommit}:new.cjs`);
    repo.git('update-index', '--cacheinfo', `120000,${blob},new.cjs`);
    targetCommit = repo.git(
      'commit-tree',
      repo.git('write-tree'),
      '-p',
      targetCommit,
      '-m',
      'Symlink fixture'
    );
    repo.git('update-ref', 'HEAD', targetCommit);
    assert.throws(
      () => verifyImplementationReferenceRelocationSources(relocation(), options),
      /regular|unmodified/
    );
  });

  test('implementation reference relocation preserves heterogeneous JSONB with locked CAS, rollback, concurrency and replay', async (t) => {
    const repo = repository(t);
    repo.git('config', 'core.autocrlf', 'false');
    const source =
      'function executeCatalog(value) { return value + 1; }\nconst operationHelp = { help: "catalog" };\n';
    repo.write('old.cjs', source);
    const sourceCommit = repo.commit(repo.base);
    repo.write('new.cjs', source);
    const targetCommit = repo.commit(sourceCommit);
    const client = new Client({ connectionString: dbUrl() });
    const competing = new Client({ connectionString: dbUrl() });
    await client.connect();
    await competing.connect();
    try {
      await client.query(`insert into architecture.design
        (design_id,work_item_id,title,owner,status,rationale,rail_ref)
        values ('implementation-relocation','GH-3749','Lossless imported references','Catalog','review',
          'Real Git, server-side leaves and atomic audit','RecordFeatureMechanizationRail')`);
      await client.query(`insert into architecture.design_scope (design_id,subject_kind,subject_id,scope_kind)
        select 'implementation-relocation','relation','planning_query_store.' || name,'may_update'
        from unnest(array['command_query_rails','feature_mechanization_local_operations']) name`);
      await client.query(`insert into planning_query_store.command_query_rails
        (rail_id,feature_id,mechanization_status,rail_name,normalized_rail_name,rail_type,ddd_owner,rail_status,
         source_path,source_content_sha256,raw_rail,raw_manifest,implementation_refs,symbol_refs)
        select 'implementation-relocation-' || n,'IMPLEMENTATION-RELOCATION-' || n,'implemented',
          'RelocationProof' || n,'relocationproof' || n,'command','Catalog','implemented','docs/catalog.md',repeat('a',64),
          '{"name":"RelocationProof","type":"command","opaque":9007199254740993}'::jsonb,
          '{"featureId":"keep","symbols":[
            {"name":"executeCatalog","path":"old.cjs","dddOwner":"ForeignSymbolOwner","cqRails":["DifferentRail"],
             "unitTests":["foreign.test.cjs"],"extension":{"integer":9007199254740993,"decimal":0.123456789012345678901}},
            {"name":"operationHelp","path":"old.cjs","dddOwner":"HelpOwner","cqRails":["Help"]}],
            "redGreenCycles":[{"id":"keep","patchSurfaces":["old.cjs"]}],
            "tags":{"precision":9007199254740993},"commandQueryRails":[{"name":"RelocationProof","type":"command"}]}'::jsonb,
          '["old.cjs#executeCatalog",{"path":"old.cjs","name":"executeCatalog","dddOwner":"OtherOwner","keep":9007199254740993},
            "old.cjs#operationHelp"]'::jsonb,
          '[{"path":"old.cjs","name":"executeCatalog","cqRails":["One","Two"],"extra":0.123456789012345678901},
            "old.cjs#operationHelp"]'::jsonb
        from generate_series(0,1) n`);
      const snapshots = async () =>
        (
          await client.query(`select rail_id,
        to_jsonb(r)::text as text,
        planning_query_store.sha256_text(planning_query_store.stable_jsonb_text(to_jsonb(r))) as hash
        from planning_query_store.command_query_rails r where rail_id like 'implementation-relocation-%' order by rail_id`)
        ).rows;
      const before = await snapshots();
      const selectors = [];
      for (const [field, symbols] of [
        ['implementation_refs', ['executeCatalog', 'executeCatalog', 'operationHelp']],
        ['symbol_refs', ['executeCatalog', 'operationHelp']],
        ['raw_manifest.symbols', ['executeCatalog', 'operationHelp']],
      ])
        for (const [index, symbol] of symbols.entries())
          selectors.push({
            field,
            index,
            from: { path: 'old.cjs', symbol },
            to: { path: 'new.cjs', symbol },
          });
      const request = {
        designId: 'implementation-relocation',
        actor: 'test',
        idempotencyKey: 'implementation-relocation',
        changes: before.map((row) => ({
          origin: 'imported',
          railId: row.rail_id,
          expectedRowSha256: row.hash,
          implementationReferences: { sourceCommit, targetCommit, selectors },
        })),
      };
      const options = { client, repoRoot: repo.root };
      const reject = async (input, pattern, overrides = {}) => {
        await assert.rejects(
          applyCatalogReconciliation(input, { ...options, ...overrides }),
          pattern
        );
        assert.deepEqual(await snapshots(), before);
        assert.equal(
          (
            await client.query(`select count(*)::int n from planning_query_store.feature_mechanization_local_operations
          where payload->>'designId'='implementation-relocation'`)
          ).rows[0].n,
          0
        );
      };
      const stale = structuredClone(request);
      stale.changes[1].expectedRowSha256 = '0'.repeat(64);
      await reject(stale, /CATALOG-STALE/);
      const omitted = structuredClone(request);
      omitted.changes[0].implementationReferences.selectors.pop();
      await reject(omitted, /mirror/i);
      await reject(request, /audit failure/, {
        client: {
          query(sql, values) {
            if (
              sql
                .trimStart()
                .startsWith(
                  'insert into planning_query_store.feature_mechanization_local_operations'
                ) &&
              values[1].endsWith(':1')
            )
              throw new Error('audit failure on second row');
            return client.query(sql, values);
          },
        },
      });
      let modified = false;
      await reject(request, /unmodified/, {
        client: {
          query(sql, values) {
            if (
              !modified &&
              sql
                .trimStart()
                .startsWith(
                  'insert into planning_query_store.feature_mechanization_local_operations'
                )
            ) {
              modified = true;
              fs.appendFileSync(
                path.join(repo.root, 'new.cjs'),
                '// dirty during native transaction\n'
              );
            }
            return client.query(sql, values);
          },
        },
      });
      repo.write('new.cjs', source);
      let release;
      let locked;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      const lockObserved = new Promise((resolve) => {
        locked = resolve;
      });
      const first = applyCatalogReconciliation(request, {
        ...options,
        client: {
          async query(sql, values) {
            const result = await client.query(sql, values);
            if (sql.trimStart().startsWith('lock table')) {
              locked();
              await held;
            }
            return result;
          },
        },
      });
      await lockObserved;
      const contender = applyCatalogReconciliation(
        { ...request, idempotencyKey: 'implementation-relocation-contender' },
        { client: competing, repoRoot: repo.root }
      );
      const contenderOutcome = assert.rejects(contender, /CATALOG-STALE/);
      try {
        let blocked = false;
        for (let attempt = 0; attempt < 50 && !blocked; attempt++) {
          blocked = (
            await client.query(
              `select exists(select 1 from pg_stat_activity
            where pid=$1 and wait_event_type='Lock') as blocked`,
              [competing.processID]
            )
          ).rows[0].blocked;
          if (!blocked) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.equal(blocked, true, 'competing native writer waits on the actual fixed table lock');
      } finally {
        release();
      }
      assert.equal((await first).changed, 2);
      await contenderOutcome;
      const after = await snapshots();
      const audits = (
        await client.query(
          `select
        payload->'before'=$1::jsonb as exact_before,payload->'after'=$2::jsonb as exact_after,
        ((payload->'before')-array['implementation_refs','symbol_refs','raw_manifest'])=
          ((payload->'after')-array['implementation_refs','symbol_refs','raw_manifest']) as other_columns,
        ((payload#>'{before,raw_manifest}')-'symbols')=((payload#>'{after,raw_manifest}')-'symbols') as manifest_metadata,
        payload#>>'{after,raw_manifest,symbols,0,extension,integer}' as precise_integer,
        payload#>>'{after,raw_manifest,symbols,0,extension,decimal}' as precise_decimal,
        payload#>>'{after,implementation_refs,1,keep}' as reference_integer,
        payload#>>'{after,symbol_refs,0,extra}' as reference_decimal,
        payload#>>'{after,implementation_refs,0}' as string_reference,
        payload#>>'{after,raw_manifest,symbols,0,dddOwner}' as preserved_owner,
        payload#>'{after,raw_manifest,symbols,0,cqRails}' as preserved_cq,
        payload#>>'{proof,sourceCommit}' as source_commit,payload#>>'{proof,targetCommit}' as target_commit,
        jsonb_array_length(payload#>'{proof,declarations}') as actual_declarations,
        jsonb_path_query_array(payload#>'{proof,declarations}','$[*].kind') as declaration_kinds,
        expected_revision,previous_revision,resulting_revision
        from planning_query_store.feature_mechanization_local_operations
        where idempotency_key='implementation-relocation:catalog:0'`,
          [before[0].text, after[0].text]
        )
      ).rows[0];
      assert.deepEqual(audits, {
        exact_before: true,
        exact_after: true,
        other_columns: true,
        manifest_metadata: true,
        precise_integer: '9007199254740993',
        precise_decimal: '0.123456789012345678901',
        reference_integer: '9007199254740993',
        reference_decimal: '0.123456789012345678901',
        string_reference: 'new.cjs#executeCatalog',
        preserved_owner: 'ForeignSymbolOwner',
        preserved_cq: ['DifferentRail'],
        source_commit: sourceCommit,
        target_commit: targetCommit,
        actual_declarations: 2,
        declaration_kinds: ['function', 'variable'],
        expected_revision: null,
        previous_revision: null,
        resulting_revision: 0,
      });
      for (const [index, row] of after.entries()) {
        assert.deepEqual(
          (
            await client.query(
              `select (payload->'before')=$1::jsonb as b,(payload->'after')=$2::jsonb as a,
          (payload->'after') = (payload->'before') || jsonb_build_object(
            'implementation_refs',replace(replace((payload#>'{before,implementation_refs}')::text,
              'old.cjs#','new.cjs#'),'"path": "old.cjs"','"path": "new.cjs"')::jsonb,
            'symbol_refs',replace(replace((payload#>'{before,symbol_refs}')::text,
              'old.cjs#','new.cjs#'),'"path": "old.cjs"','"path": "new.cjs"')::jsonb,
            'raw_manifest',(payload#>'{before,raw_manifest}') || jsonb_build_object('symbols',
              replace((payload#>'{before,raw_manifest,symbols}')::text,'"path": "old.cjs"','"path": "new.cjs"')::jsonb)
          ) as full_expected
          from planning_query_store.feature_mechanization_local_operations where idempotency_key=$3`,
              [before[index].text, row.text, `implementation-relocation:catalog:${index}`]
            )
          ).rows,
          [{ b: true, a: true, full_expected: true }]
        );
      }
      repo.write('new.cjs', 'function executeCatalog() {}\n');
      repo.commit(targetCommit);
      assert.equal((await applyCatalogReconciliation(request, options)).idempotent, true);
      await assert.rejects(
        applyCatalogReconciliation({ ...request, actor: 'other' }, options),
        /IDEMPOTENCY/
      );
      const changedReplay = structuredClone(request);
      for (const selector of changedReplay.changes[0].implementationReferences.selectors)
        if (selector.from.symbol === 'executeCatalog') selector.to.path = 'elsewhere.cjs';
      await assert.rejects(applyCatalogReconciliation(changedReplay, options), /IDEMPOTENCY/);
      assert.deepEqual(await snapshots(), after);
      assert.equal(
        (
          await client.query(`select count(*)::int n from planning_query_store.feature_mechanization_local_operations
        where payload->>'designId'='implementation-relocation'`)
        ).rows[0].n,
        2
      );
    } finally {
      await competing.end();
      await client.end();
    }
  });
}

module.exports = registerCatalogImplementationReferenceRelocationIntegration;
