/**
 * @file scripts/planning-db-operate.cjs
 * @ownedConcern Execute DB-first local planning and governance command rails with idempotent audit.
 * @baseline ADR-0055: Planning DB canonical operational source
 * @decision Keep operational writes behind explicit command rails instead of direct generated-file edits.
 * @consequence Task lifecycle, docs resolutions, and governance component definitions share
 *   validation, idempotency, and audit semantics before projections consume them.
 * @version 1.1.0
 */
const crypto = require('node:crypto');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { runMigrations, schemaName } = require('./planning-db-migrate.cjs');

const allowedStatuses = new Set(['queued', 'in_progress', 'blocked', 'review', 'done']);
const allowedDocsResolutionStatuses = new Set(['resolved', 'accepted', 'ignored', 'linked']);
const allowedArchitectureDesignStatuses = new Set([
  'proposed',
  'review',
  'approved',
  'implementing',
  'implemented',
  'drift',
  'superseded',
]);
const allowedArchitectureDesignCreateStatuses = new Set(['proposed', 'review']);
const allowedArchitectureFowlerSignals = new Set([
  'anemic_domain',
  'boundary_drift',
  'feature_envy',
  'hidden_authority',
  'primitive_obsession',
  'published_language',
  'responsibility_overload',
  'evolutionary_architecture',
  'none',
]);
const allowedArchitectureScopeSubjectKinds = new Set([
  'component',
  'relation',
  'contract',
  'flow',
  'check',
  'path',
  'query',
  'decision',
  'evidence',
  'risk',
  'test',
]);
const allowedArchitectureScopeKinds = new Set([
  'may_create',
  'may_update',
  'may_delete',
  'may_reference',
  'must_prove',
]);
const allowedArchitectureComponentKinds = new Set([
  'package',
  'module',
  'port',
  'adapter',
  'service',
  'ui-view',
  'workflow',
  'dbt-model',
  'api',
]);
const allowedArchitectureComponentLayers = new Set([
  'domain',
  'application',
  'adapter',
  'ui',
  'infra',
  'contracts',
]);
const allowedArchitectureComponentCriticalities = new Set(['low', 'medium', 'high', 'critical']);
const allowedArchitectureRecordStatuses = new Set(['proposed', 'review']);
const allowedArchitectureRelationTypes = new Set([
  'contains',
  'depends_on',
  'calls',
  'publishes',
  'consumes',
  'reads',
  'writes',
  'implements_port',
  'exposes_api',
  'transforms',
  'guards',
]);
const allowedArchitectureRelationDirections = new Set(['outbound', 'inbound', 'bidirectional']);
const allowedArchitectureRelationSyncModes = new Set(['sync', 'async', 'batch', 'build_time']);
const allowedComponentStatuses = new Set([
  'canonical',
  'review',
  'drift',
  'legacy',
  'coverage-required',
  'superseded',
]);
const allowedComponentParentLevels = new Set([
  'system',
  'domain',
  'workspace',
  'module',
  'component',
]);
const componentListOptionKeys = new Set([
  'owns',
  'excludes',
  'responsibility',
  'non-goal',
  'reason-to-change',
  'public-api',
  'invariant',
  'transition',
  'consumer',
  'governance',
  'fowler-signal',
  'scope',
]);

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function toJson(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value);
}

function requireOption(options, key) {
  const value = options[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Missing required --${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`
    );
  }

  return value;
}

function validateTaskStatus(value) {
  if (!allowedStatuses.has(value)) {
    throw new Error(
      `Invalid planning task status "${value}". Expected: ${[...allowedStatuses].join(', ')}.`
    );
  }

  return value;
}

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

function validateArchitectureDesignStatus(value) {
  if (!allowedArchitectureDesignStatuses.has(value)) {
    throw new Error(
      `Invalid architecture design status "${value}". Expected: ${[
        ...allowedArchitectureDesignStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureDesignCreateStatus(value) {
  const status = validateArchitectureDesignStatus(value);
  if (!allowedArchitectureDesignCreateStatuses.has(status)) {
    throw new Error('CreateArchitectureDesign starts in proposed or review status.');
  }

  return status;
}

function validateArchitectureFowlerSignal(value) {
  if (!allowedArchitectureFowlerSignals.has(value)) {
    throw new Error(
      `Invalid architecture Fowler signal "${value}". Expected: ${[
        ...allowedArchitectureFowlerSignals,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureRailRef(value) {
  const normalized = normalizeOptionalText(value);
  if (!normalized || /^(none|n\/a|not-applicable)$/i.test(normalized)) {
    throw new Error(
      'CreateArchitectureDesign requires an explicit governing command or query rail reference.'
    );
  }

  return normalized;
}

function validateSha256(value, optionName) {
  const normalized = String(value || '').trim();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new Error(`Invalid --${optionName} "${value}". Expected 64 lowercase hex characters.`);
  }

  return normalized;
}

function validateComponentStatus(value) {
  if (!allowedComponentStatuses.has(value)) {
    throw new Error(
      `Invalid governance component status "${value}". Expected: ${[
        ...allowedComponentStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateComponentId(value, optionName = 'component') {
  const normalized = String(value || '').trim();
  if (!/^SYS-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --${optionName} "${value}". Expected an uppercase SYS-* governance unit id.`
    );
  }

  return normalized;
}

function validateArchitectureDesignId(value) {
  const normalized = String(value || '').trim();
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(`Invalid --design "${value}". Expected an uppercase architecture design id.`);
  }

  return normalized;
}

function validateArchitectureComponentId(value, optionName = 'component') {
  return validateComponentId(value, optionName);
}

function validateArchitectureRelationId(value) {
  const normalized = String(value || '').trim();
  if (!/^REL-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --relation "${value}". Expected an uppercase REL-* architecture relation id.`
    );
  }

  return normalized;
}

function validateArchitectureComponentKind(value) {
  if (!allowedArchitectureComponentKinds.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid component kind "${value}". Expected: ${[
        ...allowedArchitectureComponentKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureComponentLayer(value) {
  if (!allowedArchitectureComponentLayers.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid component layer "${value}". Expected: ${[
        ...allowedArchitectureComponentLayers,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureComponentCriticality(value) {
  if (!allowedArchitectureComponentCriticalities.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid component criticality "${value}". Expected: ${[
        ...allowedArchitectureComponentCriticalities,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureRecordStatus(value) {
  if (!allowedArchitectureRecordStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureComponent and RecordArchitectureRelation start in proposed or review status.`
    );
  }

  return value;
}

function validateArchitectureRelationType(value) {
  if (!allowedArchitectureRelationTypes.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid relation type "${value}". Expected: ${[
        ...allowedArchitectureRelationTypes,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureRelationDirection(value) {
  if (!allowedArchitectureRelationDirections.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid relation direction "${value}". Expected: ${[
        ...allowedArchitectureRelationDirections,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureRelationSyncMode(value) {
  if (!allowedArchitectureRelationSyncModes.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid relation sync mode "${value}". Expected: ${[
        ...allowedArchitectureRelationSyncModes,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateComponentCqRails(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error('Missing required --cq-rails');
  }

  const hasNonePrefix = /^none\b/i.test(normalized);
  const hasNoneRationale = /^none\s*[-:]\s*\S+/i.test(normalized);
  if (/^none$/i.test(normalized) || (hasNonePrefix && !hasNoneRationale)) {
    throw new Error('cq-rails "none" requires a rationale, for example "none - passive docs".');
  }

  return normalized;
}

function parseIntegerOption(value, optionName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid --${optionName} "${value}". Expected a non-negative integer.`);
  }

  return parsed;
}

function parseBooleanOption(value, optionName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  throw new Error(`Invalid --${optionName} "${value}". Expected true or false.`);
}

function parseNonNegativeNumberOption(value, optionName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid --${optionName} "${value}". Expected a non-negative number.`);
  }

  return parsed;
}

function parseProgress(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`Invalid --progress "${value}". Expected a number between 0 and 100.`);
  }

  return parsed;
}

function parseFlagOptions(args) {
  const options = { evidence: [] };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument "${arg}". Expected --name value flags.`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}.`);
    }
    index += 1;

    const camelKey = key.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (key === 'evidence' || componentListOptionKeys.has(key)) {
      options[camelKey] = options[camelKey] || [];
      options[camelKey].push(value);
      continue;
    }

    options[camelKey] = value;
  }

  return options;
}

function operationPayload(command) {
  if (command.kind === 'docs_disposition_resolve' || command.kind === 'task_gap_resolve') {
    return {
      resolutionScope: command.resolutionScope,
      issueKind: command.issueKind,
      documentPath: normalizeOptionalText(command.documentPath),
      referenceText: normalizeOptionalText(command.referenceText),
      laneId: normalizeOptionalText(command.laneId),
      taskId: normalizeOptionalText(command.taskId),
      resolutionStatus: command.resolutionStatus,
      reason: command.reason,
      targetLaneId: normalizeOptionalText(command.targetLaneId),
      targetTaskId: normalizeOptionalText(command.targetTaskId),
    };
  }

  if (command.kind === 'task_claim') {
    return {
      ttlMinutes: command.ttlMinutes ?? null,
    };
  }

  if (command.kind === 'task_release') {
    return {};
  }

  if (command.kind === 'task_update') {
    return {
      status: command.status ?? null,
      progressPct: command.progressPct ?? null,
      statusReason: normalizeOptionalText(command.statusReason),
      evidenceRefs: command.evidenceRefs || [],
    };
  }

  if (command.kind === 'task_create') {
    return {
      parentTaskId: normalizeOptionalText(command.parentTaskId),
      priority: normalizeOptionalText(command.priority),
      status: command.status,
      objective: command.objective,
      dependency: normalizeOptionalText(command.dependency),
      target: normalizeOptionalText(command.target),
      complexity: normalizeOptionalText(command.complexity),
      effortPoints: command.effortPoints ?? null,
      progressPct: command.progressPct ?? null,
      evidenceRefs: command.evidenceRefs || [],
      statusReason: normalizeOptionalText(command.statusReason),
      lastVerified: normalizeOptionalText(command.lastVerified),
    };
  }

  if (command.kind === 'task_delete') {
    return {
      statusReason: normalizeOptionalText(command.statusReason),
    };
  }

  if (command.kind === 'architecture_design_create') {
    return {
      designId: command.designId,
      workItemId: command.workItemId,
      title: command.title,
      owner: command.owner,
      status: command.status,
      rationale: command.rationale,
      fowlerSignal: command.fowlerSignal,
      railRef: command.railRef,
      supersedesId: normalizeOptionalText(command.supersedesId),
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
      scopes: command.scopes || [],
    };
  }

  if (command.kind === 'architecture_component_record') {
    return {
      designId: command.designId,
      componentId: command.componentId,
      name: command.name,
      kind: command.componentKind,
      layer: command.layer,
      owner: command.owner,
      repoPath: command.repoPath,
      publicContract: command.publicContract,
      runtime: command.runtime,
      criticality: command.criticality,
      status: command.status,
      parentComponentId: normalizeOptionalText(command.parentComponentId),
      responsibilities: command.responsibilities || [],
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_relation_record') {
    return {
      designId: command.designId,
      relationId: command.relationId,
      sourceComponentId: command.sourceComponentId,
      targetComponentId: command.targetComponentId,
      relationType: command.relationType,
      direction: command.direction,
      syncAsync: command.syncAsync,
      contractId: normalizeOptionalText(command.contractId),
      failureMode: command.failureMode,
      authorizationScope: command.authorizationScope,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
      status: command.status,
    };
  }

  if (command.kind === 'component_create') {
    return {
      componentId: command.componentId,
      name: command.name,
      parentComponentId: command.parentComponentId,
      level: command.level,
      status: command.status,
      childrenRequired: command.childrenRequired,
      ownedConcern: command.ownedConcern,
      owns: command.owns || [],
      excludes: command.excludes || [],
      responsibilities: command.responsibilities || [],
      nonGoals: command.nonGoals || [],
      reasonsToChange: command.reasonsToChange || [],
      dddOwner: command.dddOwner,
      cqRails: command.cqRails,
      publicApi: command.publicApi || [],
      invariants: command.invariants || [],
      transitions: command.transitions || [],
      consumers: command.consumers || [],
      governance: command.governance || [],
      fowlerSignals: command.fowlerSignals || [],
    };
  }

  return {};
}

function docsResolutionIdempotencyPayload(command) {
  return {
    ...operationPayload(command),
    sourceContentSha256: normalizeOptionalText(command.sourceContentSha256),
  };
}

function defaultIdempotencyKey(command) {
  if (command.kind === 'docs_disposition_resolve' || command.kind === 'task_gap_resolve') {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.resolutionScope,
      command.issueKind,
      command.documentPath || 'no-document',
      command.referenceText || 'no-reference',
      command.laneId || 'no-lane',
      command.taskId || 'no-task',
      crypto
        .createHash('sha256')
        .update(canonicalJson(docsResolutionIdempotencyPayload(command)))
        .digest('hex')
        .slice(0, 16),
    ].join(':');
  }

  if (command.kind === 'component_create') {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.componentId || 'all',
      command.expectedRevision ?? 'latest',
      crypto
        .createHash('sha256')
        .update(canonicalJson(operationPayload(command)))
        .digest('hex')
        .slice(0, 16),
    ].join(':');
  }

  if (command.kind === 'architecture_design_create') {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.designId || 'all',
      crypto
        .createHash('sha256')
        .update(canonicalJson(operationPayload(command)))
        .digest('hex')
        .slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'architecture_component_record' ||
    command.kind === 'architecture_relation_record'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.designId || 'no-design',
      command.componentId || command.relationId || 'no-subject',
      crypto
        .createHash('sha256')
        .update(canonicalJson(operationPayload(command)))
        .digest('hex')
        .slice(0, 16),
    ].join(':');
  }

  return [
    command.kind,
    command.actor || 'anonymous',
    command.laneId || 'all',
    command.taskId || 'all',
    command.expectedRevision ?? 'latest',
    crypto
      .createHash('sha256')
      .update(JSON.stringify(operationPayload(command)))
      .digest('hex')
      .slice(0, 16),
  ].join(':');
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
    normalizeOptionalText(existingOperation.lane_id) === normalizeOptionalText(command.laneId) &&
    normalizeOptionalText(existingOperation.task_id) === normalizeOptionalText(command.taskId) &&
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

function normalizeExistingPayload(payload) {
  if (payload === undefined || payload === null) {
    return {};
  }

  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }

  return payload;
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function normalizeRevision(value) {
  return value === undefined || value === null ? null : Number(value);
}

function assertIdempotentReplayMatches(existingOperation, command, currentState = null) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.lane_id === command.laneId &&
    existingOperation.task_id === command.taskId &&
    normalizeRevision(existingOperation.expected_revision) ===
      normalizeRevision(command.expectedRevision) &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (!sameOperation) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already belongs to a different planning operation.`
    );
  }

  if (currentState) {
    const resultingRevision = normalizeRevision(
      existingOperation.resulting_revision ?? existingOperation.resultingRevision
    );
    const currentRevision = normalizeRevision(currentState.revision);
    if (
      resultingRevision !== null &&
      currentRevision !== null &&
      resultingRevision !== currentRevision
    ) {
      throw new Error(
        `Idempotency key "${command.idempotencyKey}" already completed at revision ${resultingRevision}, but ${command.laneId}/${command.taskId} is now at revision ${currentRevision}. Use a new idempotency key for a new planning operation.`
      );
    }
  }
}

function assertComponentIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.component_id === command.componentId &&
    normalizeRevision(existingOperation.expected_revision) ===
      normalizeRevision(command.expectedRevision) &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (!sameOperation) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already belongs to a different governance component operation.`
    );
  }
}

function assertArchitectureDesignIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.design_id === command.designId &&
    existingOperation.source_ref === command.sourceRef &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (existingSourceContentSha256 !== command.sourceContentSha256) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already completed for source hash ${
        existingSourceContentSha256 ?? 'unknown'
      }, but current source hash is ${command.sourceContentSha256}. Use a new idempotency key for a new architecture design operation.`
    );
  }

  if (!sameOperation) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" already belongs to a different architecture design operation.`
    );
  }
}

function assertArchitectureScopedOperationIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.design_id === command.designId &&
    existingOperation.source_ref === command.sourceRef &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (existingSourceContentSha256 !== command.sourceContentSha256 || !sameOperation) {
    throw new Error(
      `ARCH-OPERATION-IDEMPOTENCY-MISMATCH: idempotency key "${command.idempotencyKey}" already belongs to a different architecture scoped operation.`
    );
  }
}

function parseTaskCommand(action, args) {
  const options = parseFlagOptions(args);
  const laneId = requireOption(options, 'lane');
  const taskId = requireOption(options, 'task');

  if (action === 'show') {
    return {
      kind: 'task_show',
      laneId,
      taskId,
    };
  }

  const actor = requireOption(options, 'actor');
  const expectedRevision = parseIntegerOption(options.expectedRevision, 'expected-revision');
  const ttlMinutes = parseIntegerOption(options.ttlMinutes, 'ttl-minutes') ?? 120;

  if (action === 'claim') {
    const command = {
      kind: 'task_claim',
      laneId,
      taskId,
      actor,
      ttlMinutes,
      expectedRevision,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'release') {
    const command = {
      kind: 'task_release',
      laneId,
      taskId,
      actor,
      expectedRevision,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'update') {
    const status = options.status === undefined ? undefined : validateTaskStatus(options.status);
    const progressPct = parseProgress(options.progress);
    const command = {
      kind: 'task_update',
      laneId,
      taskId,
      actor,
      status,
      progressPct,
      statusReason: options.reason,
      evidenceRefs: options.evidence,
      expectedRevision,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'create') {
    const status = options.status === undefined ? 'queued' : validateTaskStatus(options.status);
    const progressPct = parseProgress(options.progress);
    const effortPoints = parseNonNegativeNumberOption(options.effortPoints, 'effort-points');
    const command = {
      kind: 'task_create',
      laneId,
      taskId,
      actor,
      parentTaskId: options.parentTask,
      priority: options.priority,
      status,
      objective: requireOption(options, 'objective'),
      dependency: options.dependency,
      target: options.target,
      complexity: options.complexity,
      effortPoints,
      progressPct,
      statusReason: options.reason,
      evidenceRefs: options.evidence,
      lastVerified: options.lastVerified,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'delete') {
    const command = {
      kind: 'task_delete',
      laneId,
      taskId,
      actor,
      statusReason: options.reason,
      expectedRevision,
      idempotencyKey: options.idempotencyKey,
    };
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  throw new Error(
    `Unknown planning task operation "${action}". Expected claim, release, update, create, delete, or show.`
  );
}

function parseDocsResolutionCommand(resource, action, args) {
  if (action !== 'resolve') {
    throw new Error(`Unknown ${resource} operation "${action}". Expected resolve.`);
  }

  const options = parseFlagOptions(args);
  const actor = requireOption(options, 'actor');
  const issueKind = requireOption(options, 'kind');
  const reason = requireOption(options, 'reason');
  const resolutionStatus = validateDocsResolutionStatus(options.resolution || 'resolved');
  const resolutionScope = resource === 'docs-disposition' ? 'docs_disposition' : 'task_gap';
  const kind = resource === 'docs-disposition' ? 'docs_disposition_resolve' : 'task_gap_resolve';
  const command = {
    kind,
    resolutionScope,
    issueKind,
    documentPath: normalizeOptionalText(options.path),
    referenceText: normalizeOptionalText(options.reference),
    laneId: normalizeOptionalText(options.lane),
    taskId: normalizeOptionalText(options.task),
    actor,
    resolutionStatus,
    reason,
    targetLaneId: normalizeOptionalText(options.targetLane),
    targetTaskId: normalizeOptionalText(options.targetTask),
    idempotencyKey: options.idempotencyKey,
    idempotencyKeyDefaulted: !options.idempotencyKey,
  };

  if (resource === 'docs-disposition') {
    command.documentPath = requireOption(options, 'path');
  }

  if (resource === 'task-gap' && !command.documentPath && !(command.laneId && command.taskId)) {
    throw new Error('Task gap resolution requires --path or both --lane and --task.');
  }

  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function normalizeListOption(value) {
  if (value === undefined || value === null) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function parseArchitectureDesignScope(value) {
  const parts = String(value || '').split(':');
  if (parts.length < 3 || parts.length > 4) {
    throw new Error(
      `Invalid --scope "${value}". Expected subject_kind:subject_id:scope_kind[:required|optional].`
    );
  }

  const [subjectKind, subjectId, scopeKind, requiredFlag = 'required'] = parts.map((part) =>
    part.trim()
  );

  if (!allowedArchitectureScopeSubjectKinds.has(subjectKind)) {
    throw new Error(
      `Invalid architecture design scope subject kind "${subjectKind}". Expected: ${[
        ...allowedArchitectureScopeSubjectKinds,
      ].join(', ')}.`
    );
  }

  if (!subjectId) {
    throw new Error(`Invalid --scope "${value}". Scope subject id is required.`);
  }

  if (!allowedArchitectureScopeKinds.has(scopeKind)) {
    throw new Error(
      `Invalid architecture design scope kind "${scopeKind}". Expected: ${[
        ...allowedArchitectureScopeKinds,
      ].join(', ')}.`
    );
  }

  const normalizedRequiredFlag = requiredFlag.toLowerCase();
  if (!['required', 'optional', 'true', 'false'].includes(normalizedRequiredFlag)) {
    throw new Error(
      `Invalid --scope "${value}". Scope required flag must be required, optional, true, or false.`
    );
  }

  return {
    subjectKind,
    subjectId,
    scopeKind,
    required: normalizedRequiredFlag === 'required' || normalizedRequiredFlag === 'true',
  };
}

function parseArchitectureDesignScopes(value) {
  return normalizeListOption(value).map(parseArchitectureDesignScope);
}

function validateArchitectureDesignCreateCommand(command) {
  if (command.scopes.length === 0) {
    throw new Error('CreateArchitectureDesign requires at least one --scope.');
  }

  const requiredTextFields = [
    ['work-item', command.workItemId],
    ['title', command.title],
    ['owner', command.owner],
    ['rationale', command.rationale],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`Missing required --${field}`);
    }
  }

  return command;
}

function parseArchitectureDesignCommand(action, args) {
  if (action !== 'create') {
    throw new Error(`Unknown architecture-design operation "${action}". Expected create.`);
  }

  const options = parseFlagOptions(args);
  const fowlerSignalOption = Array.isArray(options.fowlerSignal)
    ? options.fowlerSignal[0]
    : options.fowlerSignal;
  const command = {
    kind: 'architecture_design_create',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    workItemId: requireOption(options, 'workItem'),
    title: requireOption(options, 'title'),
    owner: requireOption(options, 'owner'),
    status: validateArchitectureDesignCreateStatus(options.status || 'proposed'),
    rationale: requireOption(options, 'rationale'),
    fowlerSignal: validateArchitectureFowlerSignal(fowlerSignalOption || 'none'),
    railRef: validateArchitectureRailRef(requireOption(options, 'railRef')),
    supersedesId: options.supersedes ? validateArchitectureDesignId(options.supersedes) : null,
    scopes: parseArchitectureDesignScopes(options.scope),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureDesignCreateCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function validateComponentCreateCommand(command) {
  if (command.componentId === command.parentComponentId) {
    throw new Error(`Governance component ${command.componentId} cannot be its own parent.`);
  }

  if (command.expectedRevision !== null && command.expectedRevision !== undefined) {
    if (command.expectedRevision !== 0) {
      throw new Error(
        `CreateGovernanceComponent expects registry revision 0 for ${command.componentId}; received ${command.expectedRevision}.`
      );
    }
  }

  if (command.excludes.length > 0 && command.owns.length === 0) {
    throw new Error(`Governance component ${command.componentId} declares excludes without owns.`);
  }

  if (command.owns.length === 0 && command.childrenRequired !== true) {
    throw new Error(
      `Governance component ${command.componentId} must declare --owns or --children-required true.`
    );
  }

  const requiredTextFields = [
    ['name', command.name],
    ['owned-concern', command.ownedConcern],
    ['ddd-owner', command.dddOwner],
    ['cq-rails', command.cqRails],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`Missing required --${field}`);
    }
  }

  if (command.status === 'canonical') {
    const semanticFields = [
      ['public-api', command.publicApi],
      ['invariant', command.invariants],
      ['transition', command.transitions],
      ['consumer', command.consumers],
    ];
    for (const [field, values] of semanticFields) {
      if (!values || values.length === 0) {
        throw new Error(`Canonical component ${command.componentId} is missing --${field}.`);
      }
    }
  }

  return command;
}

function parseComponentCommand(action, args) {
  if (action !== 'create') {
    throw new Error(`Unknown component operation "${action}". Expected create.`);
  }

  const options = parseFlagOptions(args);
  const actor = requireOption(options, 'actor');
  const command = {
    kind: 'component_create',
    componentId: validateComponentId(requireOption(options, 'component'), 'component'),
    name: requireOption(options, 'name'),
    parentComponentId: validateComponentId(requireOption(options, 'parent'), 'parent'),
    level: 'component',
    status: validateComponentStatus(options.status || 'review'),
    childrenRequired: parseBooleanOption(options.childrenRequired, 'children-required') ?? false,
    ownedConcern: requireOption(options, 'ownedConcern'),
    owns: normalizeListOption(options.owns),
    excludes: normalizeListOption(options.excludes),
    responsibilities: normalizeListOption(options.responsibility),
    nonGoals: normalizeListOption(options.nonGoal),
    reasonsToChange: normalizeListOption(options.reasonToChange),
    dddOwner: requireOption(options, 'dddOwner'),
    cqRails: validateComponentCqRails(options.cqRails),
    publicApi: normalizeListOption(options.publicApi),
    invariants: normalizeListOption(options.invariant),
    transitions: normalizeListOption(options.transition),
    consumers: normalizeListOption(options.consumer),
    governance: normalizeListOption(options.governance),
    fowlerSignals: normalizeListOption(options.fowlerSignal),
    actor,
    expectedRevision: parseIntegerOption(options.expectedRevision, 'expected-revision'),
    idempotencyKey: options.idempotencyKey,
  };

  validateComponentCreateCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function parseArchitectureComponentResponsibility(value) {
  const parts = String(value || '')
    .split('|')
    .map((part) => part.trim());

  if (parts.length !== 4 || parts.some((part) => !part)) {
    throw new Error(
      'ARCH-COMPONENT-SEMANTICS-MISSING: --responsibility must use responsibility_id|responsibility|reason_to_change|ddd_owner.'
    );
  }

  return {
    responsibilityId: parts[0],
    responsibility: parts[1],
    reasonToChange: parts[2],
    dddOwner: parts[3],
  };
}

function parseArchitectureComponentResponsibilities(value) {
  return normalizeListOption(value).map(parseArchitectureComponentResponsibility);
}

function validateArchitectureComponentRecordCommand(command) {
  const requiredTextFields = [
    ['name', command.name],
    ['owner', command.owner],
    ['repo-path', command.repoPath],
    ['public-contract', command.publicContract],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-COMPONENT-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (command.responsibilities.length === 0) {
    throw new Error(
      'ARCH-COMPONENT-SEMANTICS-MISSING: RecordArchitectureComponent requires at least one --responsibility.'
    );
  }

  if (command.parentComponentId && command.parentComponentId === command.componentId) {
    throw new Error(`Architecture component ${command.componentId} cannot be its own parent.`);
  }

  return command;
}

function parseArchitectureComponentCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-component operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'architecture_component_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    componentId: validateArchitectureComponentId(requireOption(options, 'component'), 'component'),
    name: requireOption(options, 'name'),
    componentKind: validateArchitectureComponentKind(requireOption(options, 'kind')),
    layer: validateArchitectureComponentLayer(requireOption(options, 'layer')),
    owner: requireOption(options, 'owner'),
    repoPath: requireOption(options, 'repoPath'),
    publicContract: requireOption(options, 'publicContract'),
    runtime: options.runtime || 'none',
    criticality: validateArchitectureComponentCriticality(options.criticality || 'medium'),
    status: validateArchitectureRecordStatus(options.status || 'proposed'),
    parentComponentId: options.parent
      ? validateArchitectureComponentId(options.parent, 'parent')
      : null,
    responsibilities: parseArchitectureComponentResponsibilities(options.responsibility),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureComponentRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function validateArchitectureRelationRecordCommand(command) {
  const requiredTextFields = [
    ['failure-mode', command.failureMode],
    ['authorization-scope', command.authorizationScope],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-RELATION-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (command.sourceComponentId === command.targetComponentId) {
    throw new Error(
      'ARCH-RELATION-ENDPOINT-MISSING: architecture relations require two components.'
    );
  }

  return command;
}

function parseArchitectureRelationCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-relation operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'architecture_relation_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    relationId: validateArchitectureRelationId(requireOption(options, 'relation')),
    sourceComponentId: validateArchitectureComponentId(requireOption(options, 'source'), 'source'),
    targetComponentId: validateArchitectureComponentId(requireOption(options, 'target'), 'target'),
    relationType: validateArchitectureRelationType(requireOption(options, 'type')),
    direction: validateArchitectureRelationDirection(requireOption(options, 'direction')),
    syncAsync: validateArchitectureRelationSyncMode(requireOption(options, 'syncAsync')),
    contractId: normalizeOptionalText(options.contract),
    failureMode: requireOption(options, 'failureMode'),
    authorizationScope: requireOption(options, 'authorizationScope'),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    status: validateArchitectureRecordStatus(options.status || 'proposed'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureRelationRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function parseArgs(args = process.argv.slice(2)) {
  const [resource, action, ...rest] = args;

  if (resource === 'task') {
    if (!action) {
      throw new Error(
        'Missing task operation. Expected claim, release, update, create, delete, or show.'
      );
    }

    return parseTaskCommand(action, rest);
  }

  if (resource === 'component') {
    if (!action) {
      throw new Error('Missing component operation. Expected create.');
    }

    return parseComponentCommand(action, rest);
  }

  if (resource === 'architecture-design') {
    if (!action) {
      throw new Error('Missing architecture-design operation. Expected create.');
    }

    return parseArchitectureDesignCommand(action, rest);
  }

  if (resource === 'architecture-component') {
    if (!action) {
      throw new Error('Missing architecture-component operation. Expected record.');
    }

    return parseArchitectureComponentCommand(action, rest);
  }

  if (resource === 'architecture-relation') {
    if (!action) {
      throw new Error('Missing architecture-relation operation. Expected record.');
    }

    return parseArchitectureRelationCommand(action, rest);
  }

  if (resource === 'audit') {
    const options = parseFlagOptions([action, ...rest].filter(Boolean));
    return {
      kind: 'audit',
      laneId: options.lane || null,
      taskId: options.task || null,
      limit: parseIntegerOption(options.limit, 'limit') ?? 20,
    };
  }

  if (resource === 'docs-disposition' || resource === 'task-gap') {
    if (!action) {
      throw new Error(`Missing ${resource} operation. Expected resolve.`);
    }

    return parseDocsResolutionCommand(resource, action, rest);
  }

  throw new Error(
    'Unknown planning DB operation. Expected "task", "component", "architecture-design", "architecture-component", "architecture-relation", "docs-disposition", "task-gap", or "audit".'
  );
}

function normalizeState(row) {
  if (!row) {
    return null;
  }

  return {
    laneId: row.lane_id ?? row.laneId,
    taskId: row.task_id ?? row.taskId,
    sourcePath: row.source_path ?? row.sourcePath,
    baseSourceContentSha256: row.base_source_content_sha256 ?? row.baseSourceContentSha256,
    revision: Number(row.revision ?? 0),
    status: row.status,
    progressPct: row.progress_pct === undefined ? row.progressPct : row.progress_pct,
    evidenceRefs: row.evidence_refs ?? row.evidenceRefs ?? [],
    statusReason: row.status_reason ?? row.statusReason ?? null,
    claimedBy: row.claimed_by ?? row.claimedBy ?? null,
    claimToken: row.claim_token ?? row.claimToken ?? null,
    claimExpiresAt: row.claim_expires_at ?? row.claimExpiresAt ?? null,
  };
}

function buildInitialState(importedTask) {
  return {
    laneId: importedTask.laneId,
    taskId: importedTask.taskId,
    sourcePath: importedTask.sourcePath,
    baseSourceContentSha256: importedTask.sourceContentSha256,
    revision: 0,
    status: importedTask.status,
    progressPct: importedTask.progressPct ?? null,
    evidenceRefs: importedTask.evidenceRefs || [],
    statusReason: importedTask.statusReason ?? null,
    claimedBy: null,
    claimToken: null,
    claimExpiresAt: null,
  };
}

function rebaseLocalStateToImportedSource(state, importedTask) {
  if (!state) {
    return buildInitialState(importedTask);
  }

  if (
    state.sourcePath === importedTask.sourcePath &&
    state.baseSourceContentSha256 === importedTask.sourceContentSha256
  ) {
    return state;
  }

  return {
    ...state,
    sourcePath: importedTask.sourcePath,
    baseSourceContentSha256: importedTask.sourceContentSha256,
  };
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function planTaskLocalOperation({ command, importedTask, currentState, operationId, now }) {
  if (!importedTask) {
    throw new Error(
      `Planning task ${command.laneId}/${command.taskId} was not imported into the planning DB.`
    );
  }

  const previous = rebaseLocalStateToImportedSource(normalizeState(currentState), importedTask);
  const expectedRevision = command.expectedRevision;
  if (
    expectedRevision !== null &&
    expectedRevision !== undefined &&
    expectedRevision !== previous.revision
  ) {
    throw new Error(
      `Stale planning task revision for ${command.laneId}/${command.taskId}: expected ${expectedRevision} but current revision is ${previous.revision}.`
    );
  }

  const resultingRevision = previous.revision + 1;
  const state = {
    ...previous,
    revision: resultingRevision,
    updatedAt: toIso(now),
  };

  if (command.kind === 'task_claim') {
    const expiresAt = new Date(new Date(now).getTime() + command.ttlMinutes * 60 * 1000);
    state.claimedBy = command.actor;
    state.claimToken = operationId;
    state.claimExpiresAt = expiresAt.toISOString();
  } else if (command.kind === 'task_release') {
    state.claimedBy = null;
    state.claimToken = null;
    state.claimExpiresAt = null;
  } else if (command.kind === 'task_update') {
    if (command.status !== undefined) {
      state.status = command.status;
    }
    if (command.progressPct !== null && command.progressPct !== undefined) {
      state.progressPct = command.progressPct;
    }
    if (command.statusReason !== undefined) {
      state.statusReason = normalizeOptionalText(command.statusReason);
    }
    if (command.evidenceRefs && command.evidenceRefs.length > 0) {
      state.evidenceRefs = command.evidenceRefs;
    }
  } else {
    throw new Error(`Unsupported local operation kind "${command.kind}".`);
  }

  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    laneId: command.laneId,
    taskId: command.taskId,
    sourcePath: importedTask.sourcePath,
    baseSourceContentSha256: importedTask.sourceContentSha256,
    expectedRevision: expectedRevision ?? null,
    previousRevision: previous.revision,
    resultingRevision,
    payload: operationPayload(command),
    createdAt: toIso(now),
  };

  return { state, audit };
}

function buildRawTaskFromCreateCommand(command) {
  const rawTask = {
    task_id: command.taskId,
    status: command.status,
    objective: command.objective,
  };

  const optionalFields = [
    ['parent_task', command.parentTaskId],
    ['priority', command.priority],
    ['dependency', command.dependency],
    ['target', command.target],
    ['complexity', command.complexity],
    ['effort_points', command.effortPoints],
    ['progress_pct', command.progressPct],
    ['status_reason', command.statusReason],
    ['last_verified', command.lastVerified],
  ];

  for (const [key, value] of optionalFields) {
    if (value !== undefined && value !== null && value !== '') {
      rawTask[key] = value;
    }
  }

  if (command.evidenceRefs && command.evidenceRefs.length > 0) {
    rawTask.evidence_refs = command.evidenceRefs;
  }

  return rawTask;
}

function buildDefinitionFromCreateCommand({ command, importedLane, now }) {
  const rawTask = buildRawTaskFromCreateCommand(command);

  return {
    laneId: command.laneId,
    taskId: command.taskId,
    sourcePath: importedLane.sourcePath,
    sourceContentSha256: importedLane.sourceContentSha256,
    parentTaskId: normalizeOptionalText(command.parentTaskId),
    priority: normalizeOptionalText(command.priority),
    status: command.status,
    objective: command.objective,
    dependency: normalizeOptionalText(command.dependency),
    target: normalizeOptionalText(command.target),
    complexity: normalizeOptionalText(command.complexity),
    effortPoints: command.effortPoints ?? null,
    progressPct: command.progressPct ?? null,
    evidenceRefs: command.evidenceRefs || [],
    statusReason: normalizeOptionalText(command.statusReason),
    lastVerified: normalizeOptionalText(command.lastVerified),
    createdBy: command.actor,
    createdAt: toIso(now),
    rawTask,
  };
}

function normalizeGovernanceUnit(row) {
  if (!row) {
    return null;
  }

  return {
    unitId: row.unit_id ?? row.unitId ?? row.component_id ?? row.componentId,
    name: row.name,
    level: row.level ?? row.component_level ?? row.componentLevel,
    parentId: row.parent_id ?? row.parentId ?? row.parent_component_id ?? row.parentComponentId,
    rootUnit: row.root_unit ?? row.rootUnit,
    domainUnit: row.domain_unit ?? row.domainUnit,
    sourcePaths: row.source_paths ?? row.sourcePaths ?? [],
    sourceContentSha256Values:
      row.source_content_sha256_values ?? row.sourceContentSha256Values ?? [],
  };
}

function normalizeComponentDefinition(row) {
  if (!row) {
    return null;
  }

  return {
    componentId: row.component_id ?? row.componentId,
    name: row.name,
    status: row.status,
    revision: Number(row.revision ?? 0),
  };
}

function normalizeArchitectureDesign(row) {
  if (!row) {
    return null;
  }

  return {
    designId: row.design_id ?? row.designId,
    status: row.status,
  };
}

function normalizeArchitectureComponent(row) {
  if (!row) {
    return null;
  }

  return {
    componentId: row.component_id ?? row.componentId,
  };
}

function normalizeArchitectureRelation(row) {
  if (!row) {
    return null;
  }

  return {
    relationId: row.relation_id ?? row.relationId,
  };
}

function normalizeArchitectureDesignScope(row) {
  return {
    subjectKind: row.subject_kind ?? row.subjectKind,
    subjectId: row.subject_id ?? row.subjectId,
    scopeKind: row.scope_kind ?? row.scopeKind,
  };
}

function hasArchitectureDesignScope(designScopes, subjectKind, subjectId, scopeKinds) {
  const allowedKinds = new Set(scopeKinds);
  return (designScopes || []).some((scopeRow) => {
    const scope = normalizeArchitectureDesignScope(scopeRow);
    return (
      scope.subjectKind === subjectKind &&
      scope.subjectId === subjectId &&
      allowedKinds.has(scope.scopeKind)
    );
  });
}

function assertArchitectureDesignMayRecord(design, command) {
  const normalized = normalizeArchitectureDesign(design);
  if (!normalized || normalized.designId !== command.designId) {
    throw new Error(`ARCH-COMPONENT-DESIGN-MISSING: ${command.designId}`);
  }

  if (!allowedArchitectureRecordStatuses.has(normalized.status)) {
    throw new Error(
      `ARCH-COMPONENT-DESIGN-MISSING: design ${command.designId} is ${normalized.status}; component graph recording requires proposed or review.`
    );
  }

  return normalized;
}

function assertArchitectureDesignScope(designScopes, subjectKind, subjectId, scopeKinds, code) {
  if (!hasArchitectureDesignScope(designScopes, subjectKind, subjectId, scopeKinds)) {
    throw new Error(`${code}: missing ${subjectKind}:${subjectId}:${scopeKinds.join('|')} scope.`);
  }
}

function semanticArrayField(rawUnit, key, values) {
  if (values && values.length > 0) {
    rawUnit[key] = values;
  }
}

function buildRawUnitFromComponentCreateCommand(command) {
  const rawUnit = {
    id: command.componentId,
    name: command.name,
    level: 'component',
    parent: command.parentComponentId,
    status: command.status,
    childrenRequired: command.childrenRequired,
    dddOwner: command.dddOwner,
    cqRails: command.cqRails,
    ownedConcern: command.ownedConcern,
    owns: command.owns,
    excludes: command.excludes,
  };

  semanticArrayField(rawUnit, 'responsibilities', command.responsibilities);
  semanticArrayField(rawUnit, 'nonGoals', command.nonGoals);
  semanticArrayField(rawUnit, 'reasonsToChange', command.reasonsToChange);
  semanticArrayField(rawUnit, 'publicApi', command.publicApi);
  semanticArrayField(rawUnit, 'invariants', command.invariants);
  semanticArrayField(rawUnit, 'transitions', command.transitions);
  semanticArrayField(rawUnit, 'consumers', command.consumers);
  semanticArrayField(rawUnit, 'governance', command.governance);
  semanticArrayField(rawUnit, 'fowlerSignals', command.fowlerSignals);

  return rawUnit;
}

function componentDefinitionSourceHash(command) {
  return crypto
    .createHash('sha256')
    .update(canonicalJson(operationPayload(command)))
    .digest('hex');
}

function planArchitectureDesignCreateOperation({ command, existingDesign, operationId, now }) {
  const existing = normalizeArchitectureDesign(existingDesign);
  if (existing) {
    throw new Error(`Architecture design ${command.designId} already exists.`);
  }

  validateArchitectureDesignCreateCommand(command);

  const createdAt = toIso(now);
  const design = {
    designId: command.designId,
    workItemId: command.workItemId,
    title: command.title,
    owner: command.owner,
    status: command.status,
    rationale: command.rationale,
    fowlerSignal: command.fowlerSignal,
    railRef: command.railRef,
    approvedAt: null,
    supersedesId: command.supersedesId,
    createdAt,
    updatedAt: createdAt,
  };
  const scopes = command.scopes.map((scope) => ({
    designId: command.designId,
    ...scope,
    createdAt,
  }));
  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    designId: command.designId,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    expectedRevision: null,
    previousRevision: 0,
    resultingRevision: 0,
    payload: operationPayload(command),
    createdAt,
  };

  return { design, scopes, audit };
}

function architectureScopedAudit({ command, operationId, now, previousRevision = 0 }) {
  return {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    designId: command.designId,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    expectedRevision: null,
    previousRevision,
    resultingRevision: previousRevision,
    payload: operationPayload(command),
    createdAt: toIso(now),
  };
}

function planArchitectureComponentRecordOperation({
  command,
  design,
  designScopes,
  existingComponent,
  parentComponent,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const existing = normalizeArchitectureComponent(existingComponent);
  const requiredScope = existing ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    [requiredScope],
    'ARCH-COMPONENT-DESIGN-SCOPE-MISSING'
  );

  if (command.parentComponentId && !normalizeArchitectureComponent(parentComponent)) {
    throw new Error(`ARCH-RELATION-ENDPOINT-MISSING: parent ${command.parentComponentId}`);
  }

  validateArchitectureComponentRecordCommand(command);

  const createdAt = toIso(now);
  const component = {
    componentId: command.componentId,
    name: command.name,
    kind: command.componentKind,
    layer: command.layer,
    owner: command.owner,
    repoPath: command.repoPath,
    publicContract: command.publicContract,
    runtime: command.runtime,
    criticality: command.criticality,
    status: command.status,
    maturityScore: null,
    parentComponentId: command.parentComponentId,
    createdAt,
    updatedAt: createdAt,
  };
  const responsibilities = command.responsibilities.map((responsibility) => ({
    ...responsibility,
    componentId: command.componentId,
    status: 'proposed',
    createdAt,
  }));
  const audit = architectureScopedAudit({ command, operationId, now });

  return { component, responsibilities, audit };
}

function planArchitectureRelationRecordOperation({
  command,
  design,
  designScopes,
  sourceComponent,
  targetComponent,
  existingRelation,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const existing = normalizeArchitectureRelation(existingRelation);
  const requiredScope = existing ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'relation',
    command.relationId,
    [requiredScope],
    'ARCH-COMPONENT-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.sourceComponentId,
    ['may_reference', 'may_create', 'may_update'],
    'ARCH-RELATION-ENDPOINT-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.targetComponentId,
    ['may_reference', 'may_create', 'may_update'],
    'ARCH-RELATION-ENDPOINT-SCOPE-MISSING'
  );

  if (
    !normalizeArchitectureComponent(sourceComponent) ||
    !normalizeArchitectureComponent(targetComponent)
  ) {
    throw new Error('ARCH-RELATION-ENDPOINT-MISSING: source or target component does not exist.');
  }

  validateArchitectureRelationRecordCommand(command);

  const createdAt = toIso(now);
  const relation = {
    relationId: command.relationId,
    sourceComponentId: command.sourceComponentId,
    targetComponentId: command.targetComponentId,
    relationType: command.relationType,
    direction: command.direction,
    syncAsync: command.syncAsync,
    contractId: command.contractId,
    failureMode: command.failureMode,
    authorizationScope: command.authorizationScope,
    sourceRefs: [command.sourceRef],
    status: command.status,
    createdAt,
    updatedAt: createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { relation, audit };
}

function planComponentCreateOperation({
  command,
  parentUnit,
  existingComponent,
  operationId,
  now,
}) {
  const existing = normalizeComponentDefinition(existingComponent);
  if (existing) {
    throw new Error(`Governance component ${command.componentId} already exists.`);
  }

  const parent = normalizeGovernanceUnit(parentUnit);
  if (!parent) {
    throw new Error(
      `Parent governance unit ${command.parentComponentId} was not imported into the planning DB.`
    );
  }
  if (!allowedComponentParentLevels.has(parent.level)) {
    throw new Error(
      `Governance component ${command.componentId} cannot use ${parent.level} parent ${parent.unitId}.`
    );
  }

  validateComponentCreateCommand(command);

  const sourcePath = 'planning_query_store.governance_component_local_definitions';
  const sourceContentSha256 = componentDefinitionSourceHash(command);
  const createdAt = toIso(now);
  const rawUnit = buildRawUnitFromComponentCreateCommand(command);
  const definition = {
    componentId: command.componentId,
    sourcePath,
    sourceContentSha256,
    revision: 0,
    name: command.name,
    level: 'component',
    parentComponentId: command.parentComponentId,
    rootUnit: parent.rootUnit || parent.unitId,
    domainUnit: parent.domainUnit || parent.rootUnit || parent.unitId,
    status: command.status,
    childrenRequired: command.childrenRequired,
    owns: command.owns,
    excludes: command.excludes,
    ownedConcern: command.ownedConcern,
    responsibilities: command.responsibilities,
    nonGoals: command.nonGoals,
    reasonsToChange: command.reasonsToChange,
    dddOwner: command.dddOwner,
    cqRails: command.cqRails,
    publicApi: command.publicApi,
    invariants: command.invariants,
    transitions: command.transitions,
    consumers: command.consumers,
    governance: command.governance,
    fowlerSignals: command.fowlerSignals,
    createdBy: command.actor,
    createdAt,
    rawUnit,
  };
  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    componentId: command.componentId,
    sourcePath,
    sourceContentSha256,
    expectedRevision: command.expectedRevision ?? null,
    previousRevision: 0,
    resultingRevision: 0,
    payload: operationPayload(command),
    createdAt,
  };

  return { definition, audit };
}

function normalizeTaskDefinition(row) {
  if (!row) {
    return null;
  }

  return {
    laneId: row.lane_id ?? row.laneId,
    taskId: row.task_id ?? row.taskId,
    sourcePath: row.source_path ?? row.sourcePath,
    sourceContentSha256: row.source_content_sha256 ?? row.sourceContentSha256,
    parentTaskId: row.parent_task_id ?? row.parentTaskId ?? null,
    priority: row.priority ?? null,
    status: row.status,
    objective: row.objective,
    dependency: row.dependency ?? null,
    target: row.target ?? null,
    complexity: row.complexity ?? null,
    effortPoints: row.effort_points ?? row.effortPoints ?? null,
    progressPct: row.progress_pct ?? row.progressPct ?? null,
    evidenceRefs: row.evidence_refs ?? row.evidenceRefs ?? [],
    statusReason: row.status_reason ?? row.statusReason ?? null,
    lastVerified: row.last_verified ?? row.lastVerified ?? null,
    rawTask: row.raw_task ?? row.rawTask,
  };
}

function planTaskDefinitionOperation({
  command,
  importedLane,
  importedTask,
  localDefinition,
  localTombstone,
  currentState,
  operationId,
  now,
}) {
  if (localTombstone) {
    throw new Error(
      `Planning task ${command.laneId}/${command.taskId} is already deleted locally.`
    );
  }

  if (command.kind === 'task_create') {
    if (!importedLane) {
      throw new Error(`Planning lane ${command.laneId} was not imported into the planning DB.`);
    }
    if (importedTask || localDefinition) {
      throw new Error(`Planning task ${command.laneId}/${command.taskId} already exists.`);
    }

    const definition = buildDefinitionFromCreateCommand({ command, importedLane, now });
    const audit = {
      operationId,
      idempotencyKey: command.idempotencyKey,
      operationType: command.kind,
      actor: command.actor,
      laneId: command.laneId,
      taskId: command.taskId,
      sourcePath: importedLane.sourcePath,
      baseSourceContentSha256: importedLane.sourceContentSha256,
      expectedRevision: null,
      previousRevision: 0,
      resultingRevision: 0,
      payload: operationPayload(command),
      createdAt: toIso(now),
    };

    return { definition, audit };
  }

  if (command.kind === 'task_delete') {
    const effectiveTask = normalizeTaskDefinition(importedTask || localDefinition);
    if (!effectiveTask) {
      throw new Error(`Planning task ${command.laneId}/${command.taskId} does not exist.`);
    }

    const previous = {
      ...buildInitialState(effectiveTask),
      ...(normalizeState(currentState) || {}),
    };
    const expectedRevision = command.expectedRevision;
    if (
      expectedRevision !== null &&
      expectedRevision !== undefined &&
      expectedRevision !== previous.revision
    ) {
      throw new Error(
        `Stale planning task revision for ${command.laneId}/${command.taskId}: expected ${expectedRevision} but current revision is ${previous.revision}.`
      );
    }

    const resultingRevision = previous.revision + 1;
    const state = {
      ...previous,
      revision: resultingRevision,
      statusReason: normalizeOptionalText(command.statusReason),
      updatedAt: toIso(now),
    };
    const tombstone = {
      laneId: command.laneId,
      taskId: command.taskId,
      sourcePath: effectiveTask.sourcePath,
      baseSourceContentSha256: effectiveTask.sourceContentSha256,
      deletedBy: command.actor,
      deletedAt: toIso(now),
      statusReason: normalizeOptionalText(command.statusReason),
    };
    const audit = {
      operationId,
      idempotencyKey: command.idempotencyKey,
      operationType: command.kind,
      actor: command.actor,
      laneId: command.laneId,
      taskId: command.taskId,
      sourcePath: effectiveTask.sourcePath,
      baseSourceContentSha256: effectiveTask.sourceContentSha256,
      expectedRevision: expectedRevision ?? null,
      previousRevision: previous.revision,
      resultingRevision,
      payload: operationPayload(command),
      createdAt: toIso(now),
    };

    return { state, tombstone, audit };
  }

  throw new Error(`Unsupported task definition operation kind "${command.kind}".`);
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
    source.laneId || '',
    source.taskId || '',
  ].join('\0');

  return `${source.resolutionScope}:${crypto.createHash('sha256').update(seed).digest('hex')}`;
}

function normalizeDocsResolutionSource(command, sourceRow) {
  if (!sourceRow) {
    return null;
  }

  return {
    resolutionScope: command.resolutionScope,
    issueKind:
      resolutionSourceValue(sourceRow, 'action_kind') ||
      resolutionSourceValue(sourceRow, 'gap_kind') ||
      command.issueKind,
    documentPath: resolutionSourceValue(sourceRow, 'document_path') || command.documentPath,
    referenceText: resolutionSourceValue(sourceRow, 'reference_text') || command.referenceText,
    laneId: resolutionSourceValue(sourceRow, 'lane_id') || command.laneId,
    taskId: resolutionSourceValue(sourceRow, 'task_id') || command.taskId,
    sourceContentSha256:
      resolutionSourceValue(sourceRow, 'source_content_sha256') || command.sourceContentSha256,
    sourceReason: resolutionSourceValue(sourceRow, 'reason'),
  };
}

function planDocsResolutionOperation({ command, sourceRow, operationId, now }) {
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
    laneId: normalizeOptionalText(source.laneId),
    taskId: normalizeOptionalText(source.taskId),
    resolutionStatus: command.resolutionStatus,
    resolvedBy: command.actor,
    resolvedAt,
    reason: command.reason,
    targetLaneId: normalizeOptionalText(command.targetLaneId),
    targetTaskId: normalizeOptionalText(command.targetTaskId),
    sourceContentSha256: source.sourceContentSha256,
  };
  resolution.rawResolution = {
    ...resolution,
    sourceReason: source.sourceReason,
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
    laneId: normalizeOptionalText(source.laneId),
    taskId: normalizeOptionalText(source.taskId),
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

function buildAuditRows(rows) {
  return rows.map(
    (row) =>
      `${row.created_at} ${row.operation_id} ${row.operation_type} ${row.lane_id}/${row.task_id} actor=${row.actor} expected=${row.expected_revision ?? 'null'} resulting=${row.resulting_revision}`
  );
}

function buildDocsResolutionAuditRows(rows) {
  return rows.map((row) => {
    const reference = row.reference_text ? ` ref=${row.reference_text}` : '';
    const target =
      row.lane_id && row.task_id ? ` ${row.lane_id}/${row.task_id}` : ` ${row.document_path}`;
    return `${row.created_at} ${row.operation_id} ${row.operation_type} ${row.resolution_scope}/${row.issue_kind}${target}${reference} status=${row.resolution_status} actor=${row.actor}`;
  });
}

async function readImportedTask(client, command) {
  const result = await client.query(
    `select
       lane_id as "laneId",
       task_id as "taskId",
       status,
       progress_pct as "progressPct",
       evidence_refs as "evidenceRefs",
       status_reason as "statusReason",
       source_path as "sourcePath",
       source_content_sha256 as "sourceContentSha256"
     from ${schemaName}.planning_tasks
     where lane_id = $1 and task_id = $2`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readImportedLane(client, command) {
  const result = await client.query(
    `select
       lane_id as "laneId",
       source_path as "sourcePath",
       source_content_sha256 as "sourceContentSha256"
     from ${schemaName}.planning_lanes
     where lane_id = $1`,
    [command.laneId]
  );

  return result.rows[0] || null;
}

async function readEffectiveTask(client, command) {
  const result = await client.query(
    `select
       lane_id as "laneId",
       task_id as "taskId",
       status,
       progress_pct as "progressPct",
       evidence_refs as "evidenceRefs",
       status_reason as "statusReason",
       source_path as "sourcePath",
       source_content_sha256 as "sourceContentSha256",
       raw_task as "rawTask"
     from ${schemaName}.planning_effective_tasks
     where lane_id = $1 and task_id = $2`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readLocalDefinition(client, command, lock = false) {
  const result = await client.query(
    `select *
     from ${schemaName}.planning_task_local_definitions
     where lane_id = $1 and task_id = $2
     ${lock ? 'for update' : ''}`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readLocalTombstone(client, command, lock = false) {
  const result = await client.query(
    `select *
     from ${schemaName}.planning_task_local_tombstones
     where lane_id = $1 and task_id = $2
     ${lock ? 'for update' : ''}`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readCurrentState(client, command, lock = false) {
  const result = await client.query(
    `select *
     from ${schemaName}.planning_task_local_state
     where lane_id = $1 and task_id = $2
     ${lock ? 'for update' : ''}`,
    [command.laneId, command.taskId]
  );

  return result.rows[0] || null;
}

async function readExistingOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.planning_local_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
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

async function readExistingComponentOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.governance_component_local_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function readExistingArchitectureDesignOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from architecture.design_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function readArchitectureDesign(client, designId) {
  const result = await client.query(
    `select *
     from architecture.design
     where design_id = $1`,
    [designId]
  );

  return result.rows[0] || null;
}

async function readArchitectureDesignScopes(client, designId) {
  const result = await client.query(
    `select *
     from architecture.design_scope
     where design_id = $1`,
    [designId]
  );

  return result.rows;
}

async function readArchitectureComponent(client, componentId) {
  const result = await client.query(
    `select *
     from architecture.component
     where component_id = $1`,
    [componentId]
  );

  return result.rows[0] || null;
}

async function readArchitectureRelation(client, relationId) {
  const result = await client.query(
    `select *
     from architecture.component_relation
     where relation_id = $1`,
    [relationId]
  );

  return result.rows[0] || null;
}

async function readGovernanceUnit(client, unitId) {
  const result = await client.query(
    `select *
     from ${schemaName}.governance_unit_query
     where unit_id = $1`,
    [unitId]
  );

  return result.rows[0] || null;
}

async function readEffectiveComponentDefinition(client, componentId) {
  const result = await client.query(
    `select *
     from ${schemaName}.governance_component_definition_query
     where component_id = $1`,
    [componentId]
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

async function readTaskGapSource(client, command) {
  const params = [command.issueKind];
  const predicates = ['gap_kind = $1'];

  if (command.documentPath) {
    params.push(command.documentPath);
    predicates.push(`document_path = $${params.length}`);
  }
  if (command.laneId) {
    params.push(command.laneId);
    predicates.push(`lane_id = $${params.length}`);
  }
  if (command.taskId) {
    params.push(command.taskId);
    predicates.push(`task_id = $${params.length}`);
  }

  const result = await client.query(
    `select
       gap_kind,
       severity,
       lane_id,
       task_id,
       document_path,
       reason,
       source_path,
       source_content_sha256
     from ${schemaName}.planning_task_gap_query
     where ${predicates.join(' and ')}`,
    params
  );

  if (result.rows.length > 1) {
    throw new Error(
      `Task gap selector ${command.issueKind} matched ${result.rows.length} rows. Add --path or --lane/--task.`
    );
  }

  return result.rows[0] || null;
}

async function writePlannedOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.planning_task_local_state
      (lane_id, task_id, source_path, base_source_content_sha256, revision, status,
       progress_pct, evidence_refs, status_reason, claimed_by, claim_token,
       claim_expires_at, updated_at, raw_overlay)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14::jsonb)
     on conflict (lane_id, task_id) do update set
       source_path = excluded.source_path,
       base_source_content_sha256 = excluded.base_source_content_sha256,
       revision = excluded.revision,
       status = excluded.status,
       progress_pct = excluded.progress_pct,
       evidence_refs = excluded.evidence_refs,
       status_reason = excluded.status_reason,
       claimed_by = excluded.claimed_by,
       claim_token = excluded.claim_token,
       claim_expires_at = excluded.claim_expires_at,
       updated_at = excluded.updated_at,
       raw_overlay = excluded.raw_overlay`,
    [
      planned.state.laneId,
      planned.state.taskId,
      planned.state.sourcePath,
      planned.state.baseSourceContentSha256,
      planned.state.revision,
      planned.state.status,
      planned.state.progressPct,
      toJson(planned.state.evidenceRefs),
      planned.state.statusReason,
      planned.state.claimedBy,
      planned.state.claimToken,
      planned.state.claimExpiresAt,
      planned.state.updatedAt,
      toJson(planned.state),
    ]
  );

  await client.query(
    `insert into ${schemaName}.planning_local_operations
      (operation_id, idempotency_key, operation_type, actor, lane_id, task_id,
       source_path, base_source_content_sha256, expected_revision, previous_revision,
       resulting_revision, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.laneId,
      planned.audit.taskId,
      planned.audit.sourcePath,
      planned.audit.baseSourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function writePlannedDefinitionOperation(client, planned) {
  if (planned.state) {
    await client.query(
      `insert into ${schemaName}.planning_task_local_state
        (lane_id, task_id, source_path, base_source_content_sha256, revision, status,
         progress_pct, evidence_refs, status_reason, claimed_by, claim_token,
         claim_expires_at, updated_at, raw_overlay)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14::jsonb)
       on conflict (lane_id, task_id) do update set
         source_path = excluded.source_path,
         base_source_content_sha256 = excluded.base_source_content_sha256,
         revision = excluded.revision,
         status = excluded.status,
         progress_pct = excluded.progress_pct,
         evidence_refs = excluded.evidence_refs,
         status_reason = excluded.status_reason,
         claimed_by = excluded.claimed_by,
         claim_token = excluded.claim_token,
         claim_expires_at = excluded.claim_expires_at,
         updated_at = excluded.updated_at,
         raw_overlay = excluded.raw_overlay`,
      [
        planned.state.laneId,
        planned.state.taskId,
        planned.state.sourcePath,
        planned.state.baseSourceContentSha256,
        planned.state.revision,
        planned.state.status,
        planned.state.progressPct,
        toJson(planned.state.evidenceRefs),
        planned.state.statusReason,
        planned.state.claimedBy,
        planned.state.claimToken,
        planned.state.claimExpiresAt,
        planned.state.updatedAt,
        toJson(planned.state),
      ]
    );
  }

  if (planned.definition) {
    await client.query(
      `insert into ${schemaName}.planning_task_local_definitions
        (lane_id, task_id, source_path, source_content_sha256, parent_task_id, priority,
         status, objective, dependency, target, complexity, effort_points, progress_pct,
         evidence_refs, status_reason, last_verified, created_by, created_at, raw_task)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
               $14::jsonb, $15, $16, $17, $18, $19::jsonb)`,
      [
        planned.definition.laneId,
        planned.definition.taskId,
        planned.definition.sourcePath,
        planned.definition.sourceContentSha256,
        planned.definition.parentTaskId,
        planned.definition.priority,
        planned.definition.status,
        planned.definition.objective,
        planned.definition.dependency,
        planned.definition.target,
        planned.definition.complexity,
        planned.definition.effortPoints,
        planned.definition.progressPct,
        toJson(planned.definition.evidenceRefs),
        planned.definition.statusReason,
        planned.definition.lastVerified,
        planned.definition.createdBy,
        planned.definition.createdAt,
        toJson(planned.definition.rawTask),
      ]
    );
  }

  if (planned.tombstone) {
    await client.query(
      `insert into ${schemaName}.planning_task_local_tombstones
        (lane_id, task_id, source_path, base_source_content_sha256, deleted_by,
         deleted_at, status_reason)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        planned.tombstone.laneId,
        planned.tombstone.taskId,
        planned.tombstone.sourcePath,
        planned.tombstone.baseSourceContentSha256,
        planned.tombstone.deletedBy,
        planned.tombstone.deletedAt,
        planned.tombstone.statusReason,
      ]
    );
  }

  await client.query(
    `insert into ${schemaName}.planning_local_operations
      (operation_id, idempotency_key, operation_type, actor, lane_id, task_id,
       source_path, base_source_content_sha256, expected_revision, previous_revision,
       resulting_revision, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.laneId,
      planned.audit.taskId,
      planned.audit.sourcePath,
      planned.audit.baseSourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function writePlannedArchitectureDesignCreateOperation(client, planned) {
  await client.query(
    `insert into architecture.design
      (design_id, work_item_id, title, owner, status, rationale, fowler_signal,
       rail_ref, approved_at, supersedes_id, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      planned.design.designId,
      planned.design.workItemId,
      planned.design.title,
      planned.design.owner,
      planned.design.status,
      planned.design.rationale,
      planned.design.fowlerSignal,
      planned.design.railRef,
      planned.design.approvedAt,
      planned.design.supersedesId,
      planned.design.createdAt,
      planned.design.updatedAt,
    ]
  );

  for (const scope of planned.scopes) {
    await client.query(
      `insert into architecture.design_scope
        (design_id, subject_kind, subject_id, scope_kind, required, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        scope.designId,
        scope.subjectKind,
        scope.subjectId,
        scope.scopeKind,
        scope.required,
        scope.createdAt,
      ]
    );
  }

  await client.query(
    `insert into architecture.design_operations
      (operation_id, idempotency_key, operation_type, actor, design_id,
       source_ref, source_content_sha256, expected_revision, previous_revision,
       resulting_revision, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.designId,
      planned.audit.sourceRef,
      planned.audit.sourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function writeArchitectureScopedAudit(client, audit) {
  await client.query(
    `insert into architecture.design_operations
      (operation_id, idempotency_key, operation_type, actor, design_id,
       source_ref, source_content_sha256, expected_revision, previous_revision,
       resulting_revision, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      audit.operationId,
      audit.idempotencyKey,
      audit.operationType,
      audit.actor,
      audit.designId,
      audit.sourceRef,
      audit.sourceContentSha256,
      audit.expectedRevision,
      audit.previousRevision,
      audit.resultingRevision,
      toJson(audit.payload),
      audit.createdAt,
    ]
  );
}

async function writePlannedArchitectureComponentRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.component
      (component_id, name, kind, layer, owner, repo_path, public_contract,
       runtime, criticality, status, maturity_score, parent_component_id,
       created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     on conflict (component_id) do update set
       name = excluded.name,
       kind = excluded.kind,
       layer = excluded.layer,
       owner = excluded.owner,
       repo_path = excluded.repo_path,
       public_contract = excluded.public_contract,
       runtime = excluded.runtime,
       criticality = excluded.criticality,
       status = excluded.status,
       maturity_score = excluded.maturity_score,
       parent_component_id = excluded.parent_component_id,
       updated_at = excluded.updated_at`,
    [
      planned.component.componentId,
      planned.component.name,
      planned.component.kind,
      planned.component.layer,
      planned.component.owner,
      planned.component.repoPath,
      planned.component.publicContract,
      planned.component.runtime,
      planned.component.criticality,
      planned.component.status,
      planned.component.maturityScore,
      planned.component.parentComponentId,
      planned.component.createdAt,
      planned.component.updatedAt,
    ]
  );

  for (const responsibility of planned.responsibilities) {
    await client.query(
      `insert into architecture.component_responsibility
        (responsibility_id, component_id, responsibility, reason_to_change,
         ddd_owner, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (responsibility_id) do update set
         component_id = excluded.component_id,
         responsibility = excluded.responsibility,
         reason_to_change = excluded.reason_to_change,
         ddd_owner = excluded.ddd_owner,
         status = excluded.status`,
      [
        responsibility.responsibilityId,
        responsibility.componentId,
        responsibility.responsibility,
        responsibility.reasonToChange,
        responsibility.dddOwner,
        responsibility.status,
        responsibility.createdAt,
      ]
    );
  }

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitectureRelationRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.component_relation
      (relation_id, source_component_id, target_component_id, relation_type,
       direction, sync_async, contract_id, failure_mode, authorization_scope,
       source_refs, status, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)
     on conflict (relation_id) do update set
       source_component_id = excluded.source_component_id,
       target_component_id = excluded.target_component_id,
       relation_type = excluded.relation_type,
       direction = excluded.direction,
       sync_async = excluded.sync_async,
       contract_id = excluded.contract_id,
       failure_mode = excluded.failure_mode,
       authorization_scope = excluded.authorization_scope,
       source_refs = excluded.source_refs,
       status = excluded.status,
       updated_at = excluded.updated_at`,
    [
      planned.relation.relationId,
      planned.relation.sourceComponentId,
      planned.relation.targetComponentId,
      planned.relation.relationType,
      planned.relation.direction,
      planned.relation.syncAsync,
      planned.relation.contractId,
      planned.relation.failureMode,
      planned.relation.authorizationScope,
      toJson(planned.relation.sourceRefs),
      planned.relation.status,
      planned.relation.createdAt,
      planned.relation.updatedAt,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedComponentCreateOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.governance_component_local_definitions
      (component_id, source_path, source_content_sha256, revision, name, level, parent_id,
       root_unit, domain_unit, status, children_required, owns, excludes, owned_concern,
       responsibilities, non_goals, reasons_to_change, ddd_owner, cq_rails, public_api,
       invariants, transitions, consumers, governance_refs, fowler_signals, created_by,
       created_at, raw_unit)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb,
             $14, $15::jsonb, $16::jsonb, $17::jsonb, $18, $19, $20::jsonb,
             $21::jsonb, $22::jsonb, $23::jsonb, $24::jsonb, $25::jsonb, $26,
             $27, $28::jsonb)`,
    [
      planned.definition.componentId,
      planned.definition.sourcePath,
      planned.definition.sourceContentSha256,
      planned.definition.revision,
      planned.definition.name,
      planned.definition.level,
      planned.definition.parentComponentId,
      planned.definition.rootUnit,
      planned.definition.domainUnit,
      planned.definition.status,
      planned.definition.childrenRequired,
      toJson(planned.definition.owns),
      toJson(planned.definition.excludes),
      planned.definition.ownedConcern,
      toJson(planned.definition.responsibilities),
      toJson(planned.definition.nonGoals),
      toJson(planned.definition.reasonsToChange),
      planned.definition.dddOwner,
      planned.definition.cqRails,
      toJson(planned.definition.publicApi),
      toJson(planned.definition.invariants),
      toJson(planned.definition.transitions),
      toJson(planned.definition.consumers),
      toJson(planned.definition.governance),
      toJson(planned.definition.fowlerSignals),
      planned.definition.createdBy,
      planned.definition.createdAt,
      toJson(planned.definition.rawUnit),
    ]
  );

  await client.query(
    `insert into ${schemaName}.governance_component_local_operations
      (operation_id, idempotency_key, operation_type, actor, component_id, source_path,
       source_content_sha256, expected_revision, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.componentId,
      planned.audit.sourcePath,
      planned.audit.sourceContentSha256,
      planned.audit.expectedRevision,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function writePlannedDocsResolutionOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.doc_resolution_overlays
      (resolution_key, resolution_scope, issue_kind, document_path, reference_text,
       lane_id, task_id, resolution_status, resolved_by, resolved_at, reason,
       target_lane_id, target_task_id, source_content_sha256, raw_resolution)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb)
     on conflict (resolution_key) do update set
       resolution_status = excluded.resolution_status,
       resolved_by = excluded.resolved_by,
       resolved_at = excluded.resolved_at,
       reason = excluded.reason,
       target_lane_id = excluded.target_lane_id,
       target_task_id = excluded.target_task_id,
       source_content_sha256 = excluded.source_content_sha256,
       raw_resolution = excluded.raw_resolution`,
    [
      planned.resolution.resolutionKey,
      planned.resolution.resolutionScope,
      planned.resolution.issueKind,
      planned.resolution.documentPath,
      planned.resolution.referenceText,
      planned.resolution.laneId,
      planned.resolution.taskId,
      planned.resolution.resolutionStatus,
      planned.resolution.resolvedBy,
      planned.resolution.resolvedAt,
      planned.resolution.reason,
      planned.resolution.targetLaneId,
      planned.resolution.targetTaskId,
      planned.resolution.sourceContentSha256,
      toJson(planned.resolution.rawResolution),
    ]
  );

  await client.query(
    `insert into ${schemaName}.doc_resolution_operations
      (operation_id, idempotency_key, operation_type, actor, resolution_key,
       resolution_scope, issue_kind, document_path, reference_text, lane_id, task_id,
       resolution_status, source_content_sha256, payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15)`,
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
      planned.audit.laneId,
      planned.audit.taskId,
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
    await runMigrations({ client, silent: true });
    await client.query('begin');

    const sourceRow =
      command.resolutionScope === 'docs_disposition'
        ? await readDocsDispositionAction(client, command)
        : await readTaskGapSource(client, command);
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

    const planned = planDocsResolutionOperation({
      command: materializedCommand,
      sourceRow,
      operationId: options.operationId || crypto.randomUUID(),
      now: options.now || new Date(),
    });

    await writePlannedDocsResolutionOperation(client, planned);
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

async function applyArchitectureDesignCreateOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    await client.query('begin');

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureDesignIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const existingDesign = await readArchitectureDesign(client, command.designId);
    const planned = planArchitectureDesignCreateOperation({
      command,
      existingDesign,
      operationId: options.operationId || crypto.randomUUID(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureDesignCreateOperation(client, planned);
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

async function applyArchitectureComponentRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    await client.query('begin');

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const existingComponent = await readArchitectureComponent(client, command.componentId);
    const parentComponent = command.parentComponentId
      ? await readArchitectureComponent(client, command.parentComponentId)
      : null;
    const planned = planArchitectureComponentRecordOperation({
      command,
      design,
      designScopes,
      existingComponent,
      parentComponent,
      operationId: options.operationId || crypto.randomUUID(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureComponentRecordOperation(client, planned);
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

async function applyArchitectureRelationRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    await client.query('begin');

    const existing = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (existing) {
      assertArchitectureScopedOperationIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const sourceComponent = await readArchitectureComponent(client, command.sourceComponentId);
    const targetComponent = await readArchitectureComponent(client, command.targetComponentId);
    const existingRelation = await readArchitectureRelation(client, command.relationId);
    const planned = planArchitectureRelationRecordOperation({
      command,
      design,
      designScopes,
      sourceComponent,
      targetComponent,
      existingRelation,
      operationId: options.operationId || crypto.randomUUID(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureRelationRecordOperation(client, planned);
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

async function applyComponentCreateOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    await client.query('begin');

    const existing = await readExistingComponentOperation(client, command.idempotencyKey);
    if (existing) {
      assertComponentIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const parentUnit = await readGovernanceUnit(client, command.parentComponentId);
    const existingComponent = await readEffectiveComponentDefinition(client, command.componentId);
    const planned = planComponentCreateOperation({
      command,
      parentUnit,
      existingComponent,
      operationId: options.operationId || crypto.randomUUID(),
      now: options.now || new Date(),
    });

    await writePlannedComponentCreateOperation(client, planned);
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

async function applyTaskLocalOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    await client.query('begin');

    const existing = await readExistingOperation(client, command.idempotencyKey);
    if (existing) {
      const currentState = await readCurrentState(client, command);
      assertIdempotentReplayMatches(existing, command, currentState);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    if (command.kind === 'task_create' || command.kind === 'task_delete') {
      const importedLane =
        command.kind === 'task_create' ? await readImportedLane(client, command) : null;
      const importedTask =
        command.kind === 'task_create'
          ? await readImportedTask(client, command)
          : await readEffectiveTask(client, command);
      const localDefinition = await readLocalDefinition(client, command, true);
      const localTombstone = await readLocalTombstone(client, command, true);
      const currentState =
        command.kind === 'task_delete' ? await readCurrentState(client, command, true) : null;
      const planned = planTaskDefinitionOperation({
        command,
        importedLane,
        importedTask,
        localDefinition,
        localTombstone,
        currentState,
        operationId: options.operationId || crypto.randomUUID(),
        now: options.now || new Date(),
      });

      await writePlannedDefinitionOperation(client, planned);
      await client.query('commit');
      return { idempotent: false, ...planned };
    }

    const importedTask = await readEffectiveTask(client, command);
    const currentState = await readCurrentState(client, command, true);
    const planned = planTaskLocalOperation({
      command,
      importedTask,
      currentState,
      operationId: options.operationId || crypto.randomUUID(),
      now: options.now || new Date(),
    });

    await writePlannedOperation(client, planned);
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

async function showTask(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    const importedTask = await readImportedTask(client, command);
    const effectiveTask = await readEffectiveTask(client, command);
    const currentState = await readCurrentState(client, command);
    const localDefinition = await readLocalDefinition(client, command);
    const localTombstone = await readLocalTombstone(client, command);
    return {
      importedTask,
      effectiveTask,
      localDefinition: normalizeTaskDefinition(localDefinition),
      localTombstone,
      localState: normalizeState(currentState),
    };
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function readAudit(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    const params = [];
    const predicates = [];
    if (command.laneId) {
      params.push(command.laneId);
      predicates.push(`lane_id = $${params.length}`);
    }
    if (command.taskId) {
      params.push(command.taskId);
      predicates.push(`task_id = $${params.length}`);
    }
    params.push(command.limit);

    const result = await client.query(
      `select
         operation_id,
         operation_type,
         actor,
         lane_id,
         task_id,
         expected_revision,
         resulting_revision,
         created_at::text
       from ${schemaName}.planning_local_operations
       ${predicates.length > 0 ? `where ${predicates.join(' and ')}` : ''}
       order by created_at desc, operation_id desc
       limit $${params.length}`,
      params
    );

    return result.rows;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function printOperationResult(result) {
  if (result.idempotent) {
    if (result.audit.component_id) {
      console.log(
        `[planning:db:operate] idempotent operation=${result.audit.operation_id} component=${result.audit.component_id}`
      );
      return;
    }

    if (result.audit.resolution_scope) {
      console.log(
        `[planning:db:operate] idempotent operation=${result.audit.operation_id} resolution=${result.audit.resolution_scope}/${result.audit.issue_kind}`
      );
      return;
    }

    if (result.audit.design_id) {
      console.log(
        `[planning:db:operate] idempotent operation=${result.audit.operation_id} design=${result.audit.design_id}`
      );
      return;
    }

    console.log(
      `[planning:db:operate] idempotent operation=${result.audit.operation_id} resultingRevision=${result.audit.resulting_revision}`
    );
    return;
  }

  if (result.resolution) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.resolution.resolutionScope}/${result.resolution.issueKind} status=${result.resolution.resolutionStatus}`
    );
    return;
  }

  if (result.design) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.design.designId} status=${result.design.status} scopes=${result.scopes.length}`
    );
    return;
  }

  if (result.component) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.component.componentId} status=${result.component.status} responsibilities=${result.responsibilities.length}`
    );
    return;
  }

  if (result.relation) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.relation.relationId} ${result.relation.sourceComponentId}->${result.relation.targetComponentId}`
    );
    return;
  }

  if (result.definition) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.definition.componentId} revision=${result.audit.resultingRevision}`
    );
    return;
  }

  console.log(
    `[planning:db:operate] ${result.audit.operationType} ${result.audit.laneId}/${result.audit.taskId} revision=${result.audit.resultingRevision}`
  );
}

async function main() {
  const command = parseArgs();

  if (command.kind === 'task_show') {
    const task = await showTask(command);
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  if (command.kind === 'audit') {
    const rows = await readAudit(command);
    for (const row of buildAuditRows(rows)) {
      console.log(row);
    }
    return;
  }

  const result =
    command.kind === 'docs_disposition_resolve' || command.kind === 'task_gap_resolve'
      ? await applyDocsResolutionOperation(command)
      : command.kind === 'architecture_design_create'
        ? await applyArchitectureDesignCreateOperation(command)
        : command.kind === 'architecture_component_record'
          ? await applyArchitectureComponentRecordOperation(command)
          : command.kind === 'architecture_relation_record'
            ? await applyArchitectureRelationRecordOperation(command)
            : command.kind === 'component_create'
              ? await applyComponentCreateOperation(command)
              : await applyTaskLocalOperation(command);
  printOperationResult(result);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:operate] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  applyArchitectureComponentRecordOperation,
  applyArchitectureDesignCreateOperation,
  applyArchitectureRelationRecordOperation,
  applyComponentCreateOperation,
  applyDocsResolutionOperation,
  applyTaskLocalOperation,
  assertArchitectureDesignIdempotentReplayMatches,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  assertComponentIdempotentReplayMatches,
  assertDocsResolutionIdempotentReplayMatches,
  assertIdempotentReplayMatches,
  buildAuditRows,
  buildDocsResolutionAuditRows,
  databaseUrl,
  materializeDocsResolutionCommand,
  parseArgs,
  planArchitectureComponentRecordOperation,
  planArchitectureDesignCreateOperation,
  planArchitectureRelationRecordOperation,
  planComponentCreateOperation,
  planDocsResolutionOperation,
  planTaskDefinitionOperation,
  planTaskLocalOperation,
  readAudit,
  showTask,
  validateArchitectureDesignStatus,
  validateComponentStatus,
  validateTaskStatus,
};
