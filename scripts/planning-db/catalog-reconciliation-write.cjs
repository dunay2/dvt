/** Owned concern: atomically reconcile catalog metadata with Git proof and audited CAS. */
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');
const { randomUuidV4, sha256Hex } = require('@dvt/crypto');
const { createGitRepositoryEnvironment } = require('../lib/git-repository-environment.cjs');
const { defaultPgUrl } = require('../planning-db-run.cjs');
const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../planning-db-schema.cjs');
const { readGovernedSourceSnapshots } = require('./governed-source-refresh-write-rail.cjs');
const {
  catalogRowHash,
  parseCatalogReconciliation,
  planCatalogReconciliation,
} = require('./catalog-reconciliation.cjs');
const {
  validateFeatureMechanizationEvidenceRetirementCommand,
  buildFeatureMechanizationEvidenceRetirementSql,
} = require('./feature-mechanization-evidence-retirement.cjs');

function verifyHistoricalSource(source, expectedPath, options = {}) {
  if (source.path !== expectedPath)
    throw new Error('CATALOG-SOURCE-PATH: Historical path must equal the stored source.');
  const git = (args) =>
    execFileSync('git', ['--literal-pathspecs', ...args], {
      cwd: options.repoRoot || path.resolve(__dirname, '..', '..'),
      env: createGitRepositoryEnvironment(),
      encoding: null,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    });
  const head = git(['rev-parse', '--verify', 'HEAD^{commit}']).toString().trim();
  try {
    if (
      git(['rev-parse', '--verify', `${source.commit}^{commit}`])
        .toString()
        .trim() !== source.commit
    )
      throw new Error('Not a commit');
    git(['merge-base', '--is-ancestor', source.commit, head]);
  } catch {
    throw new Error('CATALOG-SOURCE-ANCESTOR: Historical commit must be an ancestor of HEAD.');
  }
  if (
    options.requireAbsent !== false &&
    git(['ls-tree', '-z', head, '--', source.path]).length !== 0
  )
    throw new Error('CATALOG-SOURCE-CURRENT: Source still exists at HEAD.');
  const entry = git(['ls-tree', '-z', source.commit, '--', source.path]).toString();
  const match = /^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)\0$/u.exec(entry);
  if (!match || match[3] !== source.path)
    throw new Error('CATALOG-SOURCE-BLOB: Expected one regular historical file.');
  const contentSha256 = sha256Hex(git(['cat-file', 'blob', match[2]]));
  return {
    commit: source.commit,
    path: source.path,
    head,
    blob: match[2],
    contentSha256,
    sourcePath: `https://github.com/dunay2/dvt/blob/${source.commit}/${source.path.split('/').map(encodeURIComponent).join('/')}`,
  };
}

function verifyEvidenceRetirementHistory(request, options = {}) {
  const source = validateFeatureMechanizationEvidenceRetirementCommand(request);
  return verifyHistoricalSource(source, request.surface, { ...options, requireAbsent: false });
}

function verifyCurrentSourceContent(source, expectedPath, options = {}) {
  if (source.path !== expectedPath)
    throw new Error('CATALOG-SOURCE-PATH: Current content path must equal the stored source.');
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..');
  const snapshot = readGovernedSourceSnapshots({
    paths: [source.path],
    repoRoot,
    git: (args) =>
      execFileSync('git', ['--literal-pathspecs', ...args], {
        cwd: repoRoot,
        env: createGitRepositoryEnvironment(),
        encoding: null,
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 16 * 1024 * 1024,
      }),
  });
  if (snapshot.sourceCommitSha !== source.commit)
    throw new Error('CATALOG-SOURCE-HEAD: Current content commit must equal HEAD.');
  const current = snapshot.sources[0];
  return {
    commit: source.commit,
    head: source.commit,
    path: current.path,
    blob: current.blobSha,
    contentSha256: current.contentHash,
  };
}

async function applyCatalogReconciliation(input, options = {}) {
  const request = parseCatalogReconciliation(input).catalogReconciliation;
  const requestHash = catalogRowHash(request);
  const tables = {
    imported: `${schemaName}.command_query_rails`,
    local: `${schemaName}.feature_mechanization_local_rails`,
  };
  const auditTable = `${schemaName}.feature_mechanization_local_operations`;
  const keys = request.changes.map((_, index) => `${request.idempotencyKey}:catalog:${index}`);
  const ids = (origin) =>
    request.changes.filter((change) => change.origin === origin).map((change) => change.railId);
  const client =
    options.client ||
    new Client({
      connectionString:
        options.databaseUrl ||
        process.env.DVT_PLANNING_DB_URL ||
        process.env.DATABASE_URL ||
        defaultPgUrl,
    });
  const ownsClient = !options.client;
  let begun = false;
  if (ownsClient) await client.connect();
  const winners = async () => {
    const manifest =
      await client.query(`select feature_id, rail_type, normalized_rail_name, rail_source, rail_id
      from ${schemaName}.command_query_rail_manifest_query order by feature_id, rail_type, normalized_rail_name`);
    const canonical =
      await client.query(`select rail_type, normalized_rail_name, rail_source, rail_id
      from ${schemaName}.command_query_rail_query order by rail_type, normalized_rail_name`);
    return { manifest: manifest.rows, canonical: canonical.rows };
  };
  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');
    begun = true;
    // Fixed order excludes ordinary INSERT/UPDATE/DELETE writers before snapshots or retries.
    await client.query(
      `lock table ${tables.imported}, ${tables.local}, ${auditTable} in share row exclusive mode`
    );
    const existing = await client.query(
      `select idempotency_key, actor, payload from ${auditTable}
      where idempotency_key = any($1::text[]) or payload->>'catalogBatchKey' = $2`,
      [keys, request.idempotencyKey]
    );
    if (existing.rows.length) {
      if (
        existing.rows.length !== keys.length ||
        existing.rows.some(
          (entry) =>
            !keys.includes(entry.idempotency_key) ||
            entry.payload.requestHash !== requestHash ||
            entry.payload.designId !== request.designId ||
            entry.actor !== request.actor ||
            entry.payload.batchSize !== keys.length ||
            entry.payload.index !== keys.indexOf(entry.idempotency_key)
        )
      ) {
        throw new Error('CATALOG-IDEMPOTENCY: Conflicting or incomplete catalog receipt.');
      }
      const recordedRequest = {
        ...request,
        changes: [...existing.rows]
          .sort((a, b) => a.payload.index - b.payload.index)
          .map((entry) => entry.payload.change),
      };
      if (catalogRowHash(recordedRequest) !== requestHash)
        throw new Error('CATALOG-IDEMPOTENCY: Audit changes do not reproduce the request.');
      await client.query('commit');
      return {
        idempotent: true,
        changed: keys.length,
        catalogReconciliation: { changed: keys.length },
      };
    }
    const design = await client.query(
      'select status from architecture.design where design_id = $1 for share',
      [request.designId]
    );
    const scopes = await client.query(
      'select subject_kind, subject_id, scope_kind from architecture.design_scope where design_id = $1 for share',
      [request.designId]
    );
    const required = new Set([
      ...request.changes.map((change) => tables[change.origin]),
      auditTable,
    ]);
    if (
      !['review', 'approved', 'implementing', 'implemented'].includes(design.rows[0]?.status) ||
      [...required].some(
        (table) =>
          !scopes.rows.some(
            (scope) =>
              scope.subject_kind === 'relation' &&
              scope.subject_id === table &&
              scope.scope_kind === 'may_update'
          )
      )
    ) {
      throw new Error(
        'CATALOG-DESIGN-SCOPE: Reviewed design must admit every changed physical table.'
      );
    }
    const selected = await client.query(
      `select 'imported' as origin, to_jsonb(rail) as row,
      to_jsonb(rail)::text as snapshot_text,
      ${schemaName}.sha256_text(${schemaName}.stable_jsonb_text(to_jsonb(rail))) as snapshot_hash
      from ${tables.imported} rail where rail_id = any($1::text[])
      union all select 'local' as origin, to_jsonb(rail) as row, to_jsonb(rail)::text as snapshot_text,
      ${schemaName}.sha256_text(${schemaName}.stable_jsonb_text(to_jsonb(rail))) as snapshot_hash
      from ${tables.local} rail where rail_id = any($2::text[])`,
      [ids('imported'), ids('local')]
    );
    const sourceProofs = new Map();
    for (const change of request.changes) {
      const snapshot = selected.rows.find(
        (entry) => entry.origin === change.origin && entry.row.rail_id === change.railId
      );
      if (!snapshot) throw new Error(`CATALOG-MISSING: ${change.origin}:${change.railId}.`);
      if (snapshot.snapshot_hash !== change.expectedRowSha256)
        throw new Error(`CATALOG-STALE: ${change.railId}.`);
      const before = snapshot.row;
      if (change.source) {
        const key = `${change.source.commit}:${change.source.path}`;
        if (!sourceProofs.has(key))
          sourceProofs.set(
            key,
            verifyHistoricalSource(change.source, before.source_path, {
              ...options,
              requireAbsent: true,
            })
          );
      }
      if (change.evidenceRetirement) {
        const key = `evidence:${change.evidenceRetirement.historicalRef}`;
        if (!sourceProofs.has(key))
          sourceProofs.set(
            key,
            verifyEvidenceRetirementHistory(change.evidenceRetirement, options)
          );
      }
      if (change.sourceContent) {
        const key = `current:${change.sourceContent.commit}:${change.sourceContent.path}`;
        if (!sourceProofs.has(key))
          sourceProofs.set(
            key,
            verifyCurrentSourceContent(change.sourceContent, before.source_path, options)
          );
      }
    }
    const planned = planCatalogReconciliation(request, selected.rows, sourceProofs);
    const previousWinners = await winners();
    for (const [index, entry] of planned.entries()) {
      const { before, after, origin } = entry;
      const values = [after.rail_id];
      const bind = (value) => {
        values.push(value);
        return `$${values.length}`;
      };
      const assignments = [];
      const preserved = [];
      const changedColumns = [];
      const beforeSnapshot = `${bind(entry.beforeText)}::jsonb`;
      const retirement = request.changes[index].evidenceRetirement;
      if (retirement) {
        const columns = buildFeatureMechanizationEvidenceRetirementSql(retirement, {
          bind,
          beforeSnapshot,
        });
        for (const [column, expression] of Object.entries(columns)) {
          assignments.push(`${column} = ${expression}`);
          preserved.push(`${column} = (${expression})`);
          changedColumns.push(column);
        }
        entry.evidenceHistory = sourceProofs.get(`evidence:${retirement.historicalRef}`);
      }
      if (request.changes[index].source) {
        assignments.push(
          `source_path = ${bind(after.source_path)}`,
          `source_content_sha256 = ${bind(after.source_content_sha256)}`
        );
        preserved.push(...assignments);
        changedColumns.push('source_path', 'source_content_sha256');
      }
      if (request.changes[index].sourceContent) {
        const content = `source_content_sha256 = ${bind(after.source_content_sha256)}`;
        assignments.push(content);
        preserved.push(content);
        changedColumns.push('source_content_sha256');
      }
      const reference = request.changes[index].reference;
      const railRetirement = request.changes[index].railRetirement;
      if (reference || railRetirement) {
        const patch = `${bind(
          JSON.stringify(
            railRetirement
              ? { status: 'retired' }
              : { referenceOnly: true, authorityRef: reference.authorityRef }
          )
        )}::jsonb`;
        const status = railRetirement ? 'retired' : 'referenced';
        const railIndex = before.raw_manifest.commandQueryRails.findIndex(
          (rail) =>
            rail?.type === before.rail_type &&
            String(rail.name).trim().toLowerCase() === before.normalized_rail_name
        );
        const manifestPath = `${bind(['commandQueryRails', String(railIndex)])}::text[]`;
        assignments.push(
          `rail_status = '${status}'`,
          `raw_rail = raw_rail || ${patch}`,
          `raw_manifest = jsonb_set(raw_manifest, ${manifestPath}, (raw_manifest #> ${manifestPath}) || ${patch}, false)`
        );
        preserved.push(
          `rail_status = '${status}'`,
          `raw_rail = (${beforeSnapshot}->'raw_rail') || ${patch}`,
          `raw_manifest = jsonb_set(${beforeSnapshot}->'raw_manifest', ${manifestPath}, (${beforeSnapshot}->'raw_manifest' #> ${manifestPath}) || ${patch}, false)`
        );
        changedColumns.push('rail_status', 'raw_rail', 'raw_manifest');
      }
      if (origin === 'local') {
        const revision = `revision = ${bind(after.revision)}`;
        assignments.push(revision);
        preserved.push(revision);
        changedColumns.push('revision');
      }
      const excluded = `${bind(changedColumns)}::text[]`;
      preserved.push(`(to_jsonb(rail) - ${excluded}) = (${beforeSnapshot} - ${excluded})`);
      const updated = await client.query(
        `update ${tables[origin]} as rail set ${assignments.join(', ')}
        where rail_id = $1 returning to_jsonb(rail)::text as snapshot_text,
        (${preserved.join(' and ')}) as metadata_preserved`,
        values
      );
      if (updated.rowCount !== 1 || updated.rows[0].metadata_preserved !== true) {
        throw new Error(`CATALOG-METADATA: Unexpected stored changes for ${after.rail_id}.`);
      }
      entry.afterText = updated.rows[0].snapshot_text;
    }
    if (catalogRowHash(previousWinners) !== catalogRowHash(await winners())) {
      throw new Error(
        'CATALOG-WINNER: Reconciliation would change effective or canonical rail identity.'
      );
    }
    const affectedPaths = planned
      .filter(
        (entry, index) =>
          request.changes[index].railRetirement ||
          (entry.proof && entry.before.source_path !== entry.after.source_path)
      )
      .map((entry) => entry.before.source_path);
    const references = await client.query(
      `with affected_references as (
      select 'imported' as origin, rail_id, rail_type, normalized_rail_name, raw_rail
      from ${tables.imported} where raw_rail @> '{"referenceOnly":true}'::jsonb
        and (rail_id = any($1::text[]) or raw_rail->>'authorityRef' = any($3::text[]))
      union all select 'local' as origin, rail_id, rail_type, normalized_rail_name, raw_rail
      from ${tables.local} where raw_rail @> '{"referenceOnly":true}'::jsonb
        and (rail_id = any($2::text[]) or raw_rail->>'authorityRef' = any($3::text[]))
      ) select * from affected_references`,
      [ids('imported'), ids('local'), affectedPaths]
    );
    for (const reference of references.rows) {
      const authority = await client.query(
        `select rail_id from ${schemaName}.command_query_rail_query
        where source_path = $1 and rail_type = $2 and normalized_rail_name = $3
        and not (rail_source = $4 and rail_id = $5)
        and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired')
        and not is_gap and not (raw_rail @> '{"referenceOnly":true}'::jsonb)`,
        [
          reference.raw_rail.authorityRef,
          reference.rail_type,
          reference.normalized_rail_name,
          reference.origin,
          reference.rail_id,
        ]
      );
      if (authority.rows.length !== 1)
        throw new Error(`CATALOG-REFERENCE: Unresolved authority for ${reference.rail_id}.`);
    }
    for (const [index, entry] of planned.entries()) {
      const { origin, before, after, proof, beforeText, afterText } = entry;
      await client.query(
        `insert into ${auditTable}
        (operation_id, idempotency_key, operation_type, actor, rail_id, source_path, source_content_sha256,
         previous_revision, resulting_revision, payload)
        values ($1, $2, 'feature_mechanization_rail_record', $3, $4, $5, $6, $7, $8,
          $9::jsonb || jsonb_build_object('before', $10::jsonb, 'after', $11::jsonb))`,
        [
          randomUuidV4(),
          keys[index],
          request.actor,
          after.rail_id,
          after.source_path,
          after.source_content_sha256,
          origin === 'local' ? before.revision : null,
          origin === 'local' ? after.revision : 0,
          JSON.stringify({
            catalogBatchKey: request.idempotencyKey,
            requestHash,
            designId: request.designId,
            index,
            batchSize: planned.length,
            change: request.changes[index],
            origin,
            proof,
            evidenceHistory: entry.evidenceHistory,
          }),
          beforeText,
          afterText,
        ]
      );
    }
    if (sourceProofs.size) {
      const head = execFileSync('git', ['rev-parse', '--verify', 'HEAD^{commit}'], {
        cwd: options.repoRoot || path.resolve(__dirname, '..', '..'),
        env: createGitRepositoryEnvironment(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
      if ([...sourceProofs.values()].some((proof) => proof.head !== head))
        throw new Error('CATALOG-SOURCE-HEAD: Candidate changed during reconciliation.');
    }
    await client.query('commit');
    return {
      idempotent: false,
      changed: planned.length,
      catalogReconciliation: { changed: planned.length },
    };
  } catch (error) {
    if (begun) await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) await client.end();
  }
}

module.exports = {
  applyCatalogReconciliation,
  verifyHistoricalSource,
  verifyEvidenceRetirementHistory,
  verifyCurrentSourceContent,
};
