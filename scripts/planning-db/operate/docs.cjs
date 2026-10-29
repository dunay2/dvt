/**
 * @file scripts/planning-db/operate/docs.cjs
 * @ownedConcern Documentary resolution validation, Git proof and atomic audited persistence.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const { defaultIdempotencyKey, operationPayload } = require('./operation-payload.cjs');

const {
  canonicalJson,
  normalizeExistingPayload,
  normalizeOptionalText,
  parseFlagOptions,
  requireOption,
  toIso,
  toJson,
} = require('./command-values.cjs');

const { planCanonicalDocumentRelocation } = require('../docs-canonical-source-resolution.cjs');

const { randomUuidV4, sha256HexUtf8 } = require('@dvt/crypto');

const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../../planning-db-schema.cjs');

const { readGitFileAtCommit, readGitValue } = require('./evidence-origin.cjs');

const {
  canonicalSourceContentHash,
  readGovernedSourceSnapshots,
} = require('../governed-source-refresh-write-rail.cjs');

const { lstatSync } = require('node:fs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const allowedDocsResolutionStatuses = new Set(['resolved', 'accepted', 'ignored', 'linked']);

function validateDocsResolutionStatus(value) {
  if (!allowedDocsResolutionStatuses.has(value)) {
    throw new Error(
      `Invalid docs resolution status "${value}". Expected: ${[
        ...allowedDocsResolutionStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function assertDocsResolutionIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const expectedSourceContentSha256 = normalizeOptionalText(command.sourceContentSha256);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.resolution_scope === command.resolutionScope &&
    existingOperation.issue_kind === command.issueKind &&
    normalizeOptionalText(existingOperation.document_path) ===
      normalizeOptionalText(command.documentPath) &&
    normalizeOptionalText(existingOperation.reference_text) ===
      normalizeOptionalText(command.referenceText) &&
    existingOperation.resolution_status === command.resolutionStatus &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (expectedSourceContentSha256 && existingSourceContentSha256 !== expectedSourceContentSha256) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already completed for source hash ${
        existingSourceContentSha256 ?? 'unknown'
      }, but current source hash is ${expectedSourceContentSha256}. Use a new idempotency key for a new docs resolution operation.`
    );
  }

  if (!sameOperation) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already belongs to a different docs resolution operation.`
    );
  }
}

function parseDocsResolutionCommand(action, args) {
  if (action !== 'resolve') {
    throw new Error(`Unknown docs-disposition operation "${action}". Expected resolve.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'docs_disposition_resolve',
    resolutionScope: 'docs_disposition',
    issueKind: requireOption(options, 'kind'),
    documentPath: requireOption(options, 'path'),
    referenceText: normalizeOptionalText(options.reference),
    actor: requireOption(options, 'actor'),
    resolutionStatus: validateDocsResolutionStatus(options.resolution || 'resolved'),
    reason: requireOption(options, 'reason'),
    idempotencyKey: options.idempotencyKey,
    idempotencyKeyDefaulted: !options.idempotencyKey,
  };

  if (
    command.issueKind === 'canonical_document_relocation' ||
    options.canonicalSource !== undefined
  ) {
    try {
      command.canonicalSource = JSON.parse(requireOption(options, 'canonicalSource'));
    } catch (error) {
      throw new Error('DOC-RELOCATION: Invalid canonical-source JSON.', { cause: error });
    }
    planCanonicalDocumentRelocation({ command, validateOnly: true });
  }

  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function resolutionSourceValue(row, key) {
  return row[key] === undefined ? null : row[key];
}

function buildResolutionKey(source) {
  const seed = [
    source.resolutionScope,
    source.issueKind,
    source.documentPath || '',
    source.referenceText || '',
  ].join('\0');

  return `${source.resolutionScope}:${sha256HexUtf8(seed)}`;
}

function normalizeDocsResolutionSource(command, sourceRow) {
  if (!sourceRow) {
    return null;
  }

  return {
    resolutionScope: command.resolutionScope,
    issueKind: resolutionSourceValue(sourceRow, 'action_kind') || command.issueKind,
    documentPath: resolutionSourceValue(sourceRow, 'document_path') || command.documentPath,
    referenceText: resolutionSourceValue(sourceRow, 'reference_text') || command.referenceText,
    sourceContentSha256:
      resolutionSourceValue(sourceRow, 'source_content_sha256') || command.sourceContentSha256,
    sourceReason: resolutionSourceValue(sourceRow, 'reason'),
  };
}

function planDocsResolutionOperation({ command, sourceRow, operationId, now }) {
  const canonicalSource =
    command.canonicalSource === undefined
      ? undefined
      : planCanonicalDocumentRelocation({ command, sourceRow });
  const source = normalizeDocsResolutionSource(command, sourceRow);
  if (!source) {
    throw new Error(
      `Docs resolution source ${command.resolutionScope}/${command.issueKind} was not imported into the planning DB.`
    );
  }

  const resolutionKey = buildResolutionKey(source);
  const resolvedAt = toIso(now);
  const resolution = {
    resolutionKey,
    resolutionScope: source.resolutionScope,
    issueKind: source.issueKind,
    documentPath: normalizeOptionalText(source.documentPath),
    referenceText: normalizeOptionalText(source.referenceText),
    resolutionStatus: command.resolutionStatus,
    resolvedBy: command.actor,
    resolvedAt,
    reason: command.reason,
    sourceContentSha256: source.sourceContentSha256,
  };
  resolution.rawResolution = {
    ...resolution,
    sourceReason: source.sourceReason,
    ...(canonicalSource === undefined ? {} : { canonicalSource }),
  };

  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    resolutionKey,
    resolutionScope: source.resolutionScope,
    issueKind: source.issueKind,
    documentPath: normalizeOptionalText(source.documentPath),
    referenceText: normalizeOptionalText(source.referenceText),
    resolutionStatus: command.resolutionStatus,
    sourceContentSha256: source.sourceContentSha256,
    payload: operationPayload(command),
    createdAt: resolvedAt,
  };

  return { resolution, audit };
}

function materializeDocsResolutionCommand(command, sourceRow) {
  const source = normalizeDocsResolutionSource(command, sourceRow);
  if (!source) {
    throw new Error(
      `Docs resolution source ${command.resolutionScope}/${command.issueKind} was not imported into the planning DB.`
    );
  }

  const materialized = {
    ...command,
    sourceContentSha256: source.sourceContentSha256,
  };

  if (!materialized.idempotencyKey || materialized.idempotencyKeyDefaulted) {
    materialized.idempotencyKey = defaultIdempotencyKey(materialized);
    materialized.idempotencyKeyDefaulted = true;
  }

  return materialized;
}

async function readExistingDocsResolutionOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.doc_resolution_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function readDocsDispositionAction(client, command) {
  const result = await client.query(
    `select
       action_id,
       action_kind,
       document_path,
       reference_text,
       reason,
       source_content_sha256
     from ${schemaName}.doc_disposition_actions
     where action_kind = $1
       and document_path = $2
       and coalesce(reference_text, '') = coalesce($3, '')`,
    [command.issueKind, command.documentPath, command.referenceText]
  );

  return result.rows[0] || null;
}

async function readCanonicalDocumentRelocationFacts(client, command) {
  planCanonicalDocumentRelocation({ command, validateOnly: true });
  await client.query(
    "select pg_advisory_xact_lock(hashtext('dvt:docs-relocation'), hashtext($1))",
    ['canonical-document-mappings']
  );
  await client.query(
    `select document_id from ${schemaName}.knowledge_documents
    where document_path = any($1::text[]) order by document_path for share`,
    [[command.documentPath, command.canonicalSource.targetPath]]
  );
  await client.query(`select path from ${schemaName}.governance_files where path=$1 for share`, [
    command.canonicalSource.targetPath,
  ]);
  const result = await client.query(
    `select source.document_id, source.document_path, source.document_type,
    source.source_content_sha256, target.document_id as target_document_id,
    target.document_path as target_document_path, target.document_type as target_document_type,
    target.status as target_status, governed.content_hash as target_content_sha256,
    case when resolution.resolution_key is null then null else
      ${schemaName}.sha256_text(${schemaName}.stable_jsonb_text(to_jsonb(resolution))) end as overlay_sha256,
    resolution.raw_resolution #>> '{canonicalSource,targetPath}' as overlay_target_path,
    exists(select 1 from ${schemaName}.doc_resolution_overlays other
      where other.issue_kind='canonical_document_relocation' and other.resolution_status='linked'
      and other.document_path=target.document_path and other.source_content_sha256=target.source_content_sha256)
      as target_relocated,
    exists(select 1 from ${schemaName}.doc_resolution_overlays incoming
      join ${schemaName}.knowledge_documents original on original.document_path=incoming.document_path
        and incoming.source_content_sha256=original.source_content_sha256
        and incoming.raw_resolution #>> '{canonicalSource,sourceDocumentId}'=original.document_id
        and incoming.raw_resolution #>> '{canonicalSource,expectedSourceContentSha256}'=original.source_content_sha256
      where incoming.resolution_scope='docs_disposition'
        and incoming.issue_kind='canonical_document_relocation'
        and incoming.resolution_status='linked' and incoming.reference_text is null
        and incoming.raw_resolution #>> '{canonicalSource,targetPath}'=source.document_path)
      as source_is_canonical_target
    from ${schemaName}.knowledge_documents source
    left join ${schemaName}.knowledge_documents target on target.document_path=$2
    left join ${schemaName}.governance_file_query governed on governed.path=target.document_path
    left join ${schemaName}.doc_resolution_overlays resolution on resolution.resolution_scope='docs_disposition'
      and resolution.issue_kind='canonical_document_relocation' and resolution.document_path=source.document_path
      and resolution.reference_text is null
    where source.document_path=$1`,
    [command.documentPath, command.canonicalSource.targetPath]
  );
  return result.rows[0] || null;
}

async function verifyCanonicalDocumentRelocationGit(command, options = {}) {
  const proof = command.canonicalSource;
  const root = options.repoRoot || require('node:path').resolve(__dirname, '../../..');
  const gitOptions = { ...options, repoRoot: root };
  if (readGitValue(['rev-parse', 'HEAD'], gitOptions) !== proof.targetCommit) {
    throw new Error('DOC-RELOCATION: Target commit must be current HEAD.');
  }
  if (
    canonicalSourceContentHash(
      readGitFileAtCommit(proof.sourceCommit, command.documentPath, gitOptions)
    ) !== proof.expectedSourceContentSha256
  ) {
    throw new Error('DOC-RELOCATION: Imported origin blob does not match.');
  }
  readGitValue(
    ['merge-base', '--is-ancestor', proof.sourceCommit, proof.retirementCommit],
    gitOptions
  );
  readGitValue(
    ['merge-base', '--is-ancestor', proof.retirementCommit, proof.targetCommit],
    gitOptions
  );
  readGitFileAtCommit(`${proof.retirementCommit}^`, command.documentPath, gitOptions);
  for (const commit of [proof.retirementCommit, proof.targetCommit]) {
    if (readGitValue(['ls-tree', '-z', commit, '--', command.documentPath], gitOptions)) {
      throw new Error('DOC-RELOCATION: Source must be retired and absent at HEAD.');
    }
  }
  try {
    lstatSync(require('node:path').resolve(root, command.documentPath));
    throw new Error('DOC-RELOCATION: Retired source exists in the working tree.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const snapshot = readGovernedSourceSnapshots({ paths: [proof.targetPath], repoRoot: root });
  if (
    snapshot.sourceCommitSha !== proof.targetCommit ||
    snapshot.sources[0].contentHash !== proof.expectedTargetContentSha256
  ) {
    throw new Error('DOC-RELOCATION: Target source proof does not match.');
  }
  const { tsImport } = await import('tsx/esm/api');
  const { extractAnchors } = await tsImport(
    '../../../tools/docs/lib/markdownAnchors.ts',
    require('node:url').pathToFileURL(__filename).href
  );
  const anchors = extractAnchors(
    readGitFileAtCommit(proof.targetCommit, proof.targetPath, gitOptions).toString('utf8')
  );
  if (proof.targetAnchors.some((anchor) => !anchors.has(anchor))) {
    throw new Error('DOC-RELOCATION: Missing target anchor.');
  }
  return snapshot;
}

async function writePlannedDocsResolutionOperation(client, planned) {
  const relocation = planned.resolution.rawResolution.canonicalSource;
  const result = await client.query(
    `insert into ${schemaName}.doc_resolution_overlays
      (resolution_key, resolution_scope, issue_kind, document_path, reference_text,
       resolution_status, resolved_by, resolved_at, reason, source_content_sha256, raw_resolution)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     on conflict (resolution_key) do update set
       resolution_status = excluded.resolution_status,
       resolved_by = excluded.resolved_by,
       resolved_at = excluded.resolved_at,
       reason = excluded.reason,
       source_content_sha256 = excluded.source_content_sha256,
       raw_resolution = excluded.raw_resolution${
         relocation === undefined
           ? ''
           : relocation.expectedResolutionSha256 === 'absent'
             ? ' where false'
             : ` where ${schemaName}.sha256_text(${schemaName}.stable_jsonb_text(to_jsonb(doc_resolution_overlays))) = $12`
       }`,
    [
      planned.resolution.resolutionKey,
      planned.resolution.resolutionScope,
      planned.resolution.issueKind,
      planned.resolution.documentPath,
      planned.resolution.referenceText,
      planned.resolution.resolutionStatus,
      planned.resolution.resolvedBy,
      planned.resolution.resolvedAt,
      planned.resolution.reason,
      planned.resolution.sourceContentSha256,
      toJson(planned.resolution.rawResolution),
      ...(relocation === undefined || relocation.expectedResolutionSha256 === 'absent'
        ? []
        : [relocation.expectedResolutionSha256]),
    ]
  );
  if (relocation !== undefined && result.rowCount !== 1)
    throw new Error('DOC-RELOCATION: Resolution CAS failed.');

  await client.query(
    `insert into ${schemaName}.doc_resolution_operations
      (operation_id, idempotency_key, operation_type, actor, resolution_key,
       resolution_scope, issue_kind, document_path, reference_text, resolution_status,
       source_content_sha256, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.resolutionKey,
      planned.audit.resolutionScope,
      planned.audit.issueKind,
      planned.audit.documentPath,
      planned.audit.referenceText,
      planned.audit.resolutionStatus,
      planned.audit.sourceContentSha256,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function applyDocsResolutionOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query(
      command.canonicalSource === undefined ? 'begin' : 'begin isolation level read committed'
    );

    const sourceRow =
      command.canonicalSource === undefined
        ? await readDocsDispositionAction(client, command)
        : await readCanonicalDocumentRelocationFacts(client, command);
    const materializedCommand = materializeDocsResolutionCommand(command, sourceRow);

    const existing = await readExistingDocsResolutionOperation(
      client,
      materializedCommand.idempotencyKey
    );
    if (existing) {
      assertDocsResolutionIdempotentReplayMatches(existing, materializedCommand);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    if (command.canonicalSource !== undefined)
      await verifyCanonicalDocumentRelocationGit(command, options);

    const planned = planDocsResolutionOperation({
      command: materializedCommand,
      sourceRow,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedDocsResolutionOperation(client, planned);
    if (command.canonicalSource !== undefined)
      await verifyCanonicalDocumentRelocationGit(command, options);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

module.exports = {
  applyDocsResolutionOperation,
  assertDocsResolutionIdempotentReplayMatches,
  materializeDocsResolutionCommand,
  parseDocsResolutionCommand,
  planDocsResolutionOperation,
};
