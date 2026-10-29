/**
 * @file scripts/planning-db/operate/architecture-evidence.cjs
 * @ownedConcern Required evidence record/retire admission, projection and native persistence.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  normalizeOptionalText,
  parseBooleanOption,
  parseFlagOptions,
  requireOption,
  toIso,
  validateComponentId,
  validateSha256,
} = require('./command-values.cjs');

const {
  allowedArchitectureScopeSubjectKinds,
  assertArchitectureDesignMayProve,
  assertArchitectureDesignMayRecord,
  assertArchitectureDesignScope,
  readArchitectureDesign,
  readArchitectureDesignScopes,
  readExistingArchitectureDesignOperation,
  validateArchitectureDesignId,
} = require('./architecture-design-authority.cjs');

const {
  normalizeArchitectureComponent,
  readArchitectureComponent,
} = require('./architecture-component-profile.cjs');

const { defaultIdempotencyKey } = require('./operation-payload.cjs');

const {
  architectureScopedAudit,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  writeArchitectureScopedAudit,
} = require('./architecture-audit.cjs');

const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../../planning-db-schema.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

const { assertArchitectureEvidenceOriginAuthenticity } = require('./evidence-origin.cjs');

const allowedArchitectureTestKinds = new Set([
  'unit',
  'contract',
  'integration',
  'architecture',
  'e2e',
  'property',
]);

const allowedArchitectureTestCoverageLevels = new Set([
  'smoke',
  'behavior',
  'negative',
  'boundary',
  'flow',
]);

const allowedArchitectureObservabilitySignalKinds = new Set([
  'metric',
  'log',
  'trace',
  'alert',
  'dashboard',
]);

const allowedArchitectureObservabilityStatuses = new Set([
  'proposed',
  'implemented',
  'missing',
  'not_applicable',
]);

const allowedArchitectureEvidenceKinds = new Set([
  'test',
  'query',
  'doc',
  'risk',
  'screenshot',
  'ci',
]);

const allowedArchitectureEvidenceOrigins = new Set(['local_execution', 'ci_execution']);

const allowedArchitectureEvidenceResultStates = new Set(['pass', 'fail']);

function validateArchitectureTestKind(value) {
  if (!allowedArchitectureTestKinds.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureTestEvidence stores test kinds accepted by architecture.component_test: ${[
        ...allowedArchitectureTestKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureTestCoverageLevel(value) {
  if (!allowedArchitectureTestCoverageLevels.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureTestEvidence stores coverage levels accepted by architecture.component_test: ${[
        ...allowedArchitectureTestCoverageLevels,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureObservabilitySignalKind(value) {
  if (!allowedArchitectureObservabilitySignalKinds.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureObservabilityEvidence stores signal kinds accepted by architecture.component_observability: ${[
        ...allowedArchitectureObservabilitySignalKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureObservabilityStatus(value) {
  if (!allowedArchitectureObservabilityStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureObservabilityEvidence stores statuses accepted by architecture.component_observability: ${[
        ...allowedArchitectureObservabilityStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureTestRecordCommand(command) {
  const requiredTextFields = [
    ['test', command.testId],
    ['component', command.componentId],
    ['test-path', command.testPath],
    ['validation-command', command.validationCommand],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-TEST-EVIDENCE-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  return command;
}

function validateArchitectureObservabilityRecordCommand(command) {
  const requiredTextFields = [
    ['observability', command.observabilityId],
    ['component', command.componentId],
    ['signal-name', command.signalName],
    ['signal-kind', command.signalKind],
    ['status', command.status],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(
        `ARCH-OBSERVABILITY-EVIDENCE-SEMANTICS-MISSING: missing required --${field}.`
      );
    }
  }

  return command;
}

function validateArchitectureEvidenceRecordCommand(command) {
  const requiredTextFields = [
    ['evidence', command.evidenceId],
    ['subject-kind', command.subjectKind],
    ['subject', command.subjectId],
    ['evidence-kind', command.evidenceKind],
    ['origin', command.evidenceOrigin],
    ['result', command.resultState],
    ['source-ref', command.sourceRef],
    ['source-path', command.sourcePath],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-EVIDENCE-EXECUTION-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  return command;
}

function validateArchitectureTestId(value) {
  const normalized = String(value || '').trim();
  if (!/^TEST-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --test "${value}". Expected an uppercase TEST-* architecture test evidence id.`
    );
  }

  return normalized;
}

function validateArchitectureObservabilityId(value) {
  const normalized = String(value || '').trim();
  if (!/^OBS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --observability "${value}". Expected an uppercase OBS-* architecture observability evidence id.`
    );
  }

  return normalized;
}

function validateArchitectureEvidenceId(value) {
  const normalized = String(value || '').trim();
  if (!/^(?:EV|EVIDENCE)-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --evidence "${value}". Expected an uppercase EV-* or EVIDENCE-* architecture evidence id.`
    );
  }

  return normalized;
}

function validateArchitectureEvidenceSubjectKind(value) {
  if (!allowedArchitectureScopeSubjectKinds.has(value)) {
    throw new Error(
      `Invalid --subject-kind "${value}". Expected: ${[
        ...allowedArchitectureScopeSubjectKinds,
      ].join(', ')}.`
    );
  }
  return value;
}

function validateArchitectureEvidenceKind(value) {
  if (!allowedArchitectureEvidenceKinds.has(value)) {
    throw new Error(
      `Invalid --evidence-kind "${value}". Expected: ${[...allowedArchitectureEvidenceKinds].join(
        ', '
      )}.`
    );
  }
  return value;
}

function validateArchitectureEvidenceOrigin(value) {
  if (!allowedArchitectureEvidenceOrigins.has(value)) {
    throw new Error(
      `Invalid --origin "${value}". Expected local_execution or ci_execution; assertions cannot prove must-prove scope.`
    );
  }
  return value;
}

function validateArchitectureEvidenceResultState(value) {
  if (!allowedArchitectureEvidenceResultStates.has(value)) {
    throw new Error(`Invalid --result "${value}". Expected pass or fail.`);
  }
  return value;
}

function parseArchitectureEvidenceCommand(action, args) {
  const options = parseFlagOptions(args);

  if (action === 'retire-test') {
    const command = {
      kind: 'architecture_test_retire',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      testId: validateArchitectureTestId(requireOption(options, 'test')),
      componentId: validateComponentId(requireOption(options, 'component'), 'component'),
      reason: requireOption(options, 'reason'),
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

  if (action === 'retire-execution') {
    const command = {
      kind: 'architecture_evidence_retire',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      evidenceId: validateArchitectureEvidenceId(requireOption(options, 'evidence')),
      reason: requireOption(options, 'reason'),
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

  if (action === 'record-execution') {
    const command = {
      kind: 'architecture_evidence_record',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      evidenceId: validateArchitectureEvidenceId(requireOption(options, 'evidence')),
      subjectKind: validateArchitectureEvidenceSubjectKind(requireOption(options, 'subjectKind')),
      subjectId: requireOption(options, 'subject'),
      evidenceKind: validateArchitectureEvidenceKind(requireOption(options, 'evidenceKind')),
      evidenceOrigin: validateArchitectureEvidenceOrigin(requireOption(options, 'origin')),
      resultState: validateArchitectureEvidenceResultState(requireOption(options, 'result')),
      sourceRef: requireOption(options, 'sourceRef'),
      sourcePath: requireOption(options, 'sourcePath'),
      sourceContentSha256: validateSha256(
        requireOption(options, 'sourceContentSha256'),
        'source-content-sha256'
      ),
      actor: requireOption(options, 'actor'),
      idempotencyKey: options.idempotencyKey,
    };

    validateArchitectureEvidenceRecordCommand(command);
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'record-observability') {
    const command = {
      kind: 'architecture_observability_record',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      observabilityId: validateArchitectureObservabilityId(requireOption(options, 'observability')),
      componentId: validateComponentId(requireOption(options, 'component'), 'component'),
      signalName: requireOption(options, 'signalName'),
      signalKind: validateArchitectureObservabilitySignalKind(requireOption(options, 'signalKind')),
      required: parseBooleanOption(options.required, 'required') ?? true,
      status: validateArchitectureObservabilityStatus(requireOption(options, 'status')),
      sourceRef: requireOption(options, 'sourceRef'),
      sourceContentSha256: validateSha256(
        requireOption(options, 'sourceContentSha256'),
        'source-content-sha256'
      ),
      actor: requireOption(options, 'actor'),
      idempotencyKey: options.idempotencyKey,
    };

    validateArchitectureObservabilityRecordCommand(command);
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action !== 'record-test') {
    throw new Error(
      `Unknown architecture-evidence operation "${action}". Expected record-test, retire-test, record-observability, record-execution, or retire-execution.`
    );
  }

  const command = {
    kind: 'architecture_test_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    testId: validateArchitectureTestId(requireOption(options, 'test')),
    componentId: validateComponentId(requireOption(options, 'component'), 'component'),
    testPath: requireOption(options, 'testPath'),
    testKind: validateArchitectureTestKind(requireOption(options, 'testKind')),
    coverageLevel: validateArchitectureTestCoverageLevel(requireOption(options, 'coverageLevel')),
    required: parseBooleanOption(options.required, 'required') ?? true,
    validationCommand: requireOption(options, 'validationCommand'),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureTestRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function planArchitectureTestRecordOperation({
  command,
  design,
  designScopes,
  component,
  existingTest,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const requiredScope = existingTest ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'test',
    command.testId,
    [requiredScope],
    'ARCH-TEST-EVIDENCE-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_reference'],
    'ARCH-TEST-EVIDENCE-COMPONENT-SCOPE-MISSING'
  );

  if (!normalizeArchitectureComponent(component)) {
    throw new Error(`ARCH-TEST-EVIDENCE-COMPONENT-MISSING: component ${command.componentId}`);
  }

  validateArchitectureTestRecordCommand(command);

  const createdAt = toIso(now);
  const testEvidence = {
    testId: command.testId,
    componentId: command.componentId,
    testPath: command.testPath,
    testKind: command.testKind,
    coverageLevel: command.coverageLevel,
    required: command.required,
    validationCommand: command.validationCommand,
    createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { testEvidence, audit };
}

function planArchitectureTestRetireOperation({
  command,
  design,
  designScopes,
  existingTest,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  assertArchitectureDesignScope(
    designScopes,
    'test',
    command.testId,
    ['may_delete'],
    'ARCH-TEST-EVIDENCE-RETIRE-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_reference'],
    'ARCH-TEST-EVIDENCE-RETIRE-COMPONENT-SCOPE-MISSING'
  );
  if (!existingTest) {
    throw new Error(`ARCH-TEST-EVIDENCE-RETIRE-NOT-FOUND: ${command.testId}`);
  }
  const existingComponentId = existingTest.component_id ?? existingTest.componentId;
  if (existingComponentId !== command.componentId) {
    throw new Error(
      `ARCH-TEST-EVIDENCE-RETIRE-COMPONENT-MISMATCH: ${command.testId} belongs to ${existingComponentId}.`
    );
  }

  return {
    retirement: { testId: command.testId },
    audit: architectureScopedAudit({ command, operationId, now }),
  };
}

function planArchitectureObservabilityRecordOperation({
  command,
  design,
  designScopes,
  component,
  existingObservability,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const requiredScope = existingObservability ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'evidence',
    command.observabilityId,
    [requiredScope],
    'ARCH-OBSERVABILITY-EVIDENCE-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_reference', 'may_update', 'may_create'],
    'ARCH-OBSERVABILITY-EVIDENCE-COMPONENT-SCOPE-MISSING'
  );

  if (!normalizeArchitectureComponent(component)) {
    throw new Error(
      `ARCH-OBSERVABILITY-EVIDENCE-COMPONENT-MISSING: component ${command.componentId}`
    );
  }

  validateArchitectureObservabilityRecordCommand(command);

  const createdAt = toIso(now);
  const observability = {
    observabilityId: command.observabilityId,
    componentId: command.componentId,
    signalName: command.signalName,
    signalKind: command.signalKind,
    required: command.required,
    status: command.status,
    createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { observability, audit };
}

function planArchitectureEvidenceRecordOperation({
  command,
  design,
  designScopes,
  sourceFile,
  subjectImplementation,
  operationId,
  now,
}) {
  assertArchitectureDesignMayProve(design, command);
  assertArchitectureDesignScope(
    designScopes,
    command.subjectKind,
    command.subjectId,
    ['must_prove'],
    'ARCH-EVIDENCE-MUST-PROVE-SCOPE-MISSING'
  );
  validateArchitectureEvidenceRecordCommand(command);
  if (!sourceFile || (sourceFile.path ?? sourceFile.sourcePath) !== command.sourcePath) {
    throw new Error(`ARCH-EVIDENCE-SOURCE-MISSING: ${command.sourcePath}`);
  }
  const currentSourceHash = sourceFile.content_hash ?? sourceFile.contentHash;
  if (currentSourceHash !== command.sourceContentSha256) {
    throw new Error(
      `ARCH-EVIDENCE-SOURCE-HASH-MISMATCH: ${command.sourcePath} is ${currentSourceHash ?? 'missing'}, not ${command.sourceContentSha256}.`
    );
  }
  const requiresImplementationProof =
    command.subjectKind === 'command' || command.subjectKind === 'query';
  if (
    requiresImplementationProof &&
    (!subjectImplementation ||
      !subjectImplementation.current_implementation_content_sha256 ||
      Number(subjectImplementation.missing_implementation_ref_count) !== 0)
  ) {
    throw new Error(
      `ARCH-EVIDENCE-SUBJECT-IMPLEMENTATION-MISSING: ${command.subjectKind} ${command.subjectId}`
    );
  }

  const evidence = {
    evidenceId: command.evidenceId,
    designId: command.designId,
    subjectKind: command.subjectKind,
    subjectId: command.subjectId,
    evidenceKind: command.evidenceKind,
    evidenceOrigin: command.evidenceOrigin,
    sourceRef: command.sourceRef,
    sourcePath: command.sourcePath,
    resultState: command.resultState,
    recordedAt: toIso(now),
    sourceContentSha256: command.sourceContentSha256,
    implementationContentSha256: requiresImplementationProof
      ? subjectImplementation.current_implementation_content_sha256
      : null,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { evidence, audit };
}

function planArchitectureEvidenceRetireOperation({
  command,
  design,
  designScopes,
  existingEvidence,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  assertArchitectureDesignScope(
    designScopes,
    'evidence',
    command.evidenceId,
    ['may_delete'],
    'ARCH-EVIDENCE-RETIRE-DESIGN-SCOPE-MISSING'
  );
  if (!existingEvidence) {
    throw new Error(`ARCH-EVIDENCE-RETIRE-NOT-FOUND: ${command.evidenceId}`);
  }
  if (existingEvidence.design_id !== command.designId) {
    throw new Error(
      `ARCH-EVIDENCE-RETIRE-DESIGN-MISMATCH: evidence ${command.evidenceId} does not belong to design ${command.designId}.`
    );
  }

  return {
    retirement: { evidenceId: command.evidenceId },
    audit: architectureScopedAudit({ command, operationId, now }),
  };
}

async function readArchitectureTest(client, testId) {
  const result = await client.query(
    `select *
     from architecture.component_test
     where test_id = $1`,
    [testId]
  );

  return result.rows[0] || null;
}

async function readArchitectureEvidence(client, evidenceId) {
  const result = await client.query(
    `select *
     from architecture.evidence
     where evidence_id = $1`,
    [evidenceId]
  );

  return result.rows[0] || null;
}

async function readArchitectureEvidenceSourceFile(client, sourcePath) {
  const result = await client.query(
    `select path, content_hash
     from ${schemaName}.governance_file_query
     where path = $1`,
    [sourcePath]
  );
  return result.rows[0] || null;
}

async function readArchitectureEvidenceSubjectImplementation(client, subjectKind, subjectId) {
  if (subjectKind !== 'command' && subjectKind !== 'query') return null;
  const result = await client.query(
    `select *
     from architecture.evidence_subject_implementation_query
     where subject_kind = $1
       and subject_id = $2`,
    [subjectKind, subjectId]
  );
  return result.rows[0] || null;
}

async function readArchitectureObservability(client, observabilityId) {
  const result = await client.query(
    `select *
     from architecture.component_observability
     where observability_id = $1`,
    [observabilityId]
  );

  return result.rows[0] || null;
}

async function writePlannedArchitectureTestRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.component_test
      (test_id, component_id, test_path, test_kind, coverage_level,
       required, validation_command, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (test_id) do update set
       component_id = excluded.component_id,
       test_path = excluded.test_path,
       test_kind = excluded.test_kind,
       coverage_level = excluded.coverage_level,
       required = excluded.required,
       validation_command = excluded.validation_command`,
    [
      planned.testEvidence.testId,
      planned.testEvidence.componentId,
      planned.testEvidence.testPath,
      planned.testEvidence.testKind,
      planned.testEvidence.coverageLevel,
      planned.testEvidence.required,
      planned.testEvidence.validationCommand,
      planned.testEvidence.createdAt,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitectureTestRetireOperation(client, planned) {
  const result = await client.query(
    `delete from architecture.component_test
     where test_id = $1`,
    [planned.retirement.testId]
  );
  if (result.rowCount !== 1) {
    throw new Error(
      `ARCH-TEST-EVIDENCE-RETIRE-CONFLICT: ${planned.retirement.testId} was not deleted.`
    );
  }
  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitectureObservabilityRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.component_observability
      (observability_id, component_id, signal_name, signal_kind, required, status, created_at)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (observability_id) do update set
       component_id = excluded.component_id,
       signal_name = excluded.signal_name,
       signal_kind = excluded.signal_kind,
       required = excluded.required,
       status = excluded.status`,
    [
      planned.observability.observabilityId,
      planned.observability.componentId,
      planned.observability.signalName,
      planned.observability.signalKind,
      planned.observability.required,
      planned.observability.status,
      planned.observability.createdAt,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitectureEvidenceRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.evidence
      (evidence_id, design_id, subject_kind, subject_id, evidence_kind, evidence_origin,
       source_ref, source_path, result_state, recorded_at, source_content_sha256,
       implementation_content_sha256)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      planned.evidence.evidenceId,
      planned.evidence.designId,
      planned.evidence.subjectKind,
      planned.evidence.subjectId,
      planned.evidence.evidenceKind,
      planned.evidence.evidenceOrigin,
      planned.evidence.sourceRef,
      planned.evidence.sourcePath,
      planned.evidence.resultState,
      planned.evidence.recordedAt,
      planned.evidence.sourceContentSha256,
      planned.evidence.implementationContentSha256,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitectureEvidenceRetireOperation(client, planned) {
  const result = await client.query(
    `delete from architecture.evidence
     where evidence_id = $1`,
    [planned.retirement.evidenceId]
  );
  if (result.rowCount !== 1) {
    throw new Error(
      `ARCH-EVIDENCE-RETIRE-CONFLICT: ${planned.retirement.evidenceId} was not deleted.`
    );
  }
  await writeArchitectureScopedAudit(client, planned.audit);
}

async function applyArchitectureTestRecordOperation(command, options = {}) {
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
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const component = await readArchitectureComponent(client, command.componentId);
    const existingTest = await readArchitectureTest(client, command.testId);
    const planned = planArchitectureTestRecordOperation({
      command,
      design,
      designScopes,
      component,
      existingTest,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureTestRecordOperation(client, planned);
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

async function applyArchitectureTestRetireOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;
  if (ownsClient) await client.connect();

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');
    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }
    const [design, designScopes, existingTest] = await Promise.all([
      readArchitectureDesign(client, command.designId),
      readArchitectureDesignScopes(client, command.designId),
      readArchitectureTest(client, command.testId),
    ]);
    const planned = planArchitectureTestRetireOperation({
      command,
      design,
      designScopes,
      existingTest,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });
    await writePlannedArchitectureTestRetireOperation(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) await client.end();
  }
}

async function applyArchitectureObservabilityRecordOperation(command, options = {}) {
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
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const component = await readArchitectureComponent(client, command.componentId);
    const existingObservability = await readArchitectureObservability(
      client,
      command.observabilityId
    );
    const planned = planArchitectureObservabilityRecordOperation({
      command,
      design,
      designScopes,
      component,
      existingObservability,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureObservabilityRecordOperation(client, planned);
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

async function applyArchitectureEvidenceRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    const subjectImplementation = await readArchitectureEvidenceSubjectImplementation(
      client,
      command.subjectKind,
      command.subjectId
    );
    await assertArchitectureEvidenceOriginAuthenticity(command, {
      currentGitSha: options.currentGitSha,
      environment: options.environment || process.env,
      fetch: options.fetch,
      githubToken: options.githubToken,
      repoRoot: options.repoRoot,
      repositorySlug: options.repositorySlug,
      subjectImplementation,
    });
    await client.query('begin');

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const sourceFile = await readArchitectureEvidenceSourceFile(client, command.sourcePath);
    const planned = planArchitectureEvidenceRecordOperation({
      command,
      design,
      designScopes,
      sourceFile,
      subjectImplementation,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureEvidenceRecordOperation(client, planned);
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

async function applyArchitectureEvidenceRetireOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;
  if (ownsClient) await client.connect();

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');
    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }
    const [design, designScopes, existingEvidence] = await Promise.all([
      readArchitectureDesign(client, command.designId),
      readArchitectureDesignScopes(client, command.designId),
      readArchitectureEvidence(client, command.evidenceId),
    ]);
    const planned = planArchitectureEvidenceRetireOperation({
      command,
      design,
      designScopes,
      existingEvidence,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });
    await writePlannedArchitectureEvidenceRetireOperation(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) await client.end();
  }
}

module.exports = {
  applyArchitectureEvidenceRecordOperation,
  applyArchitectureEvidenceRetireOperation,
  applyArchitectureObservabilityRecordOperation,
  applyArchitectureTestRecordOperation,
  applyArchitectureTestRetireOperation,
  parseArchitectureEvidenceCommand,
  planArchitectureEvidenceRecordOperation,
  planArchitectureEvidenceRetireOperation,
  planArchitectureObservabilityRecordOperation,
  planArchitectureTestRecordOperation,
  planArchitectureTestRetireOperation,
  writePlannedArchitectureEvidenceRecordOperation,
  writePlannedArchitectureEvidenceRetireOperation,
  writePlannedArchitectureObservabilityRecordOperation,
  writePlannedArchitectureTestRecordOperation,
  writePlannedArchitectureTestRetireOperation,
};
