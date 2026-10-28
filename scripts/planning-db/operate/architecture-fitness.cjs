/**
 * @file scripts/planning-db/operate/architecture-fitness.cjs
 * @ownedConcern Real repository fitness scan admission, observation and persistence.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  parseFlagOptions,
  requireOption,
  toIso,
  toJson,
  validateSha256,
} = require('./command-values.cjs');

const {
  assertArchitectureDesignMayScan,
  readArchitectureDesign,
  readExistingArchitectureDesignOperation,
  validateArchitectureDesignId,
} = require('./architecture-design-authority.cjs');

const { defaultIdempotencyKey } = require('./operation-payload.cjs');

const {
  architectureScopedAudit,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  writeArchitectureScopedAudit,
} = require('./architecture-audit.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const { assertPlanningDbCurrentSchemaReady } = require('../../planning-db-schema.cjs');

const { runArchitectureFitnessScan } = require('../architecture-fitness/scan.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

function validateArchitectureFitnessScanId(value) {
  const normalized = String(value || '').trim();
  if (!/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/.test(normalized)) {
    throw new Error(`Invalid --scan "${value}". Expected a stable architecture fitness scan id.`);
  }

  return normalized;
}

function parseArchitectureFitnessCommand(action, args) {
  if (action !== 'scan') {
    throw new Error(`Unknown architecture-fitness operation "${action}". Expected scan.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'architecture_fitness_scan',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    scanId: validateArchitectureFitnessScanId(requireOption(options, 'scan')),
    root: requireOption(options, 'root'),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function planArchitectureFitnessScanOperation({ command, design, scanResult, operationId, now }) {
  assertArchitectureDesignMayScan(design, command);
  if (!scanResult?.scan || scanResult.scan.scanId !== command.scanId) {
    throw new Error(`ARCH-FITNESS-SCAN-MISMATCH: scanner did not return ${command.scanId}.`);
  }
  if (scanResult.scan.designId !== command.designId) {
    throw new Error(
      `ARCH-FITNESS-SCAN-MISMATCH: scanner returned design ${scanResult.scan.designId}.`
    );
  }

  const recordedAt = toIso(now);
  const observations = (scanResult.observations || []).map((observation) => ({
    ...observation,
    metadata: observation.metadata || {},
    observedAt: recordedAt,
  }));
  const evaluations = (scanResult.evaluations || []).map((evaluation) => ({
    ...evaluation,
    evidence: evaluation.evidence || {},
    evaluatedAt: recordedAt,
  }));
  const scan = {
    scanId: command.scanId,
    designId: command.designId,
    scannerVersion: scanResult.scan.scannerVersion,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    scanState: scanResult.scan.scanState || 'evaluated',
    scannedAt: recordedAt,
    metadata: {
      root: command.root,
      observationCount: observations.length,
      evaluationCount: evaluations.length,
    },
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { scan, observations, evaluations, audit };
}

async function readArchitectureComponents(client) {
  const result = await client.query(
    `select component_id, repo_path
     from architecture.component
     where status <> 'deprecated'
     order by component_id`
  );

  return result.rows;
}

async function readArchitectureRelations(client) {
  const result = await client.query(
    `select relation_id, source_component_id, target_component_id, relation_type, status
     from architecture.component_relation
     order by relation_id`
  );

  return result.rows;
}

async function writePlannedArchitectureFitnessScanOperation(client, planned) {
  await client.query(
    `insert into architecture.component_dependency_scan
      (scan_id, design_id, scanner_version, source_ref, source_content_sha256,
       scan_state, scanned_at, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     on conflict (scan_id) do update set
       design_id = excluded.design_id,
       scanner_version = excluded.scanner_version,
       source_ref = excluded.source_ref,
       source_content_sha256 = excluded.source_content_sha256,
       scan_state = excluded.scan_state,
       scanned_at = excluded.scanned_at,
       metadata = excluded.metadata`,
    [
      planned.scan.scanId,
      planned.scan.designId,
      planned.scan.scannerVersion,
      planned.scan.sourceRef,
      planned.scan.sourceContentSha256,
      planned.scan.scanState,
      planned.scan.scannedAt,
      toJson(planned.scan.metadata),
    ]
  );

  await client.query(`delete from architecture.component_fitness_evaluation where scan_id = $1`, [
    planned.scan.scanId,
  ]);
  await client.query(
    `delete from architecture.component_dependency_observation where scan_id = $1`,
    [planned.scan.scanId]
  );

  for (const observation of planned.observations) {
    await client.query(
      `insert into architecture.component_dependency_observation
        (observation_id, scan_id, source_path, target_path, import_literal, workspace_name,
         package_name, source_content_sha256, is_test, source_component_id, target_component_id,
         source_mapping_state, target_mapping_state, mapping_confidence, mapping_reason,
         relation_type, observed_at, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, $17, $18::jsonb)`,
      [
        observation.observationId,
        observation.scanId,
        observation.sourcePath,
        observation.targetPath,
        observation.importLiteral,
        observation.workspaceName,
        observation.packageName,
        observation.sourceContentSha256,
        observation.isTest,
        observation.sourceComponentId,
        observation.targetComponentId,
        observation.sourceMappingState,
        observation.targetMappingState,
        observation.mappingConfidence,
        observation.mappingReason,
        observation.relationType,
        observation.observedAt,
        toJson(observation.metadata),
      ]
    );
  }

  for (const evaluation of planned.evaluations) {
    await client.query(
      `insert into architecture.component_fitness_evaluation
        (evaluation_id, scan_id, fitness_rule_id, subject_kind, subject_id, result_state,
         severity, reason, evidence, evaluated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
      [
        evaluation.evaluationId,
        evaluation.scanId,
        evaluation.fitnessRuleId,
        evaluation.subjectKind,
        evaluation.subjectId,
        evaluation.resultState,
        evaluation.severity,
        evaluation.reason,
        toJson(evaluation.evidence),
        evaluation.evaluatedAt,
      ]
    );
  }

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function applyArchitectureFitnessScanOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const components = await readArchitectureComponents(client);
    const relations = await readArchitectureRelations(client);
    const scanResult = runArchitectureFitnessScan({
      rootDir: command.root,
      repoRoot: process.cwd(),
      scanId: command.scanId,
      designId: command.designId,
      components,
      relations,
    });
    const planned = planArchitectureFitnessScanOperation({
      command,
      design,
      scanResult,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureFitnessScanOperation(client, planned);
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
  applyArchitectureFitnessScanOperation,
  parseArchitectureFitnessCommand,
  planArchitectureFitnessScanOperation,
  writePlannedArchitectureFitnessScanOperation,
};
