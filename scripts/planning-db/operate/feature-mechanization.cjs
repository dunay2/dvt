/**
 * @file scripts/planning-db/operate/feature-mechanization.cjs
 * @ownedConcern Existing record/retire input, reference eligibility, projection and transaction.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const { defaultIdempotencyKey, operationPayload } = require('./operation-payload.cjs');

const {
  canonicalJson,
  excludesFeatureMechanizationSurface,
  mergeFeatureMechanizationManifest,
  mergeFeatureMechanizationValue,
  mergeUniqueValues,
  normalizeExistingPayload,
  normalizeListOption,
  normalizeOptionalText,
  normalizeRevision,
  parseBooleanOption,
  parseFlagOptions,
  parseIntegerOption,
  requireOption,
  surfaceMatchesPattern,
  toIso,
  toJson,
  validateSha256,
} = require('./command-values.cjs');

const { parseCatalogReconciliation } = require('../catalog-reconciliation.cjs');

const { readFileSync } = require('node:fs');

const {
  assertArchitectureDesignMayRecord,
  assertArchitectureDesignScope,
  readArchitectureDesign,
  readArchitectureDesignScopes,
  validateArchitectureDesignId,
} = require('./architecture-design-authority.cjs');

const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../../planning-db-schema.cjs');

const { applyCatalogReconciliation } = require('../catalog-reconciliation-write.cjs');

const { Client } = require('pg');

const { databaseUrl } = require('../../planning-db-schema.cjs');

const { randomUuidV4 } = require('@dvt/crypto');

const allowedFeatureMechanizationStatuses = new Set(['closed', 'implemented']);

const allowedFeatureMechanizationRailTypes = new Set(['command', 'query']);

const allowedFeatureMechanizationRailStatuses = new Set([
  'accepted',
  'declared',
  'deprecated',
  'documented',
  'implemented',
  'missing',
  'planned',
  'proposed',
  'retired',
  'unimplemented',
  'not-implemented',
]);

function validateFeatureMechanizationStatus(value) {
  if (!allowedFeatureMechanizationStatuses.has(value)) {
    throw new Error(
      `Invalid feature mechanization status "${value}". Expected: ${[
        ...allowedFeatureMechanizationStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFeatureMechanizationRailType(value) {
  if (!allowedFeatureMechanizationRailTypes.has(value)) {
    throw new Error(
      `Invalid feature mechanization rail type "${value}". Expected: ${[
        ...allowedFeatureMechanizationRailTypes,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFeatureMechanizationRailStatus(value) {
  if (!allowedFeatureMechanizationRailStatuses.has(value)) {
    throw new Error(
      `Invalid feature mechanization rail status "${value}". Expected: ${[
        ...allowedFeatureMechanizationRailStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFeatureMechanizationFeatureId(value) {
  const normalized = String(value || '').trim();
  if (!/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/.test(normalized)) {
    throw new Error(`Invalid --feature "${value}". Expected a stable feature mechanization id.`);
  }

  return normalized;
}

function normalizeFeatureMechanizationRailName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function assertFeatureMechanizationRailIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.rail_id === command.railId &&
    normalizeRevision(existingOperation.expected_revision) ===
      normalizeRevision(command.expectedRevision) &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (existingSourceContentSha256 !== command.sourceContentSha256 || !sameOperation) {
    throw new Error(
      `FEATURE-MECHANIZATION-IDEMPOTENCY-MISMATCH: idempotency key "${command.idempotencyKey}" already belongs to a different feature mechanization operation.`
    );
  }
}

function featureMechanizationRailId({ featureId, railType, normalizedRailName }) {
  return ['local', featureId, railType, normalizedRailName].join('#');
}

function validateFeatureMechanizationRecordCommand(command) {
  const requiredTextFields = [
    ['feature', command.featureId],
    ['rail', command.railName],
    ['ddd-owner', command.dddOwner],
    ['application-port', command.applicationPort],
    ['adapter-surface', command.adapterSurface],
    ['authorization-scope', command.authorizationScope],
    ['implementation-plan', command.implementationPlan],
    ['red-test', command.redTest],
    ['expected-failure', command.expectedFailure],
    ['green-test', command.greenTest],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`Missing required --${field}`);
    }
  }

  const requiredListFields = [
    ['component-guide', command.componentGuides],
    ['user-story', command.userStories],
    ['documentation-ref', command.documentationRefs],
    ['governing-source', command.governingSources],
    ['allowed-surface', command.allowedImplementationSurfaces],
    ['forbidden-surface', command.forbiddenImplementationSurfaces],
    ['domain-object', command.domainObjects],
    ['fowler-signal', command.fowlerSignals],
    ['architecture-guard', command.architectureGuards],
    ['cypress-flow', command.cypressFlows],
    ['completion-gate', command.completionGate],
    ['unit-test', command.unitTests],
    ['negative-test', command.negativeTests],
  ];
  for (const [field, value] of requiredListFields) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(`Missing required --${field}`);
    }
  }

  if (!command.completionGate.includes('pnpm verify:prepush')) {
    throw new Error(
      'RecordFeatureMechanizationRail completion gate must include pnpm verify:prepush.'
    );
  }

  if (command.referenceOnly === false) {
    throw new Error('RecordFeatureMechanizationRail --reference-only must be true when declared.');
  }
  if (command.referenceOnly === true && !command.authorityRef) {
    throw new Error(
      'RecordFeatureMechanizationRail --reference-only true requires --authority-ref.'
    );
  }
  if (command.authorityRef && command.referenceOnly !== true) {
    throw new Error(
      'RecordFeatureMechanizationRail --authority-ref requires --reference-only true.'
    );
  }

  if (command.redGreenCycle !== undefined) {
    if (!normalizeOptionalText(command.redGreenCycle) || command.expectedRevision == null) {
      throw new Error(
        'Named red-green cycle reconciliation requires an ID and --expected-revision.'
      );
    }
    if (command.patchSurfaces.length === 0) {
      throw new Error(
        'Named red-green cycle reconciliation requires explicit --patch-surface evidence.'
      );
    }
    for (const surface of command.patchSurfaces) {
      if (excludesFeatureMechanizationSurface(surface, command.forbiddenImplementationSurfaces)) {
        throw new Error(`Red-green cycle patch surface ${surface} is forbidden.`);
      }
      if (
        !command.allowedImplementationSurfaces.some((pattern) =>
          surfaceMatchesPattern(surface, pattern)
        )
      ) {
        throw new Error(`Red-green cycle patch surface ${surface} is outside allowed surfaces.`);
      }
    }
  }

  const terminalRailStatus =
    command.railStatus === 'retired' || command.railStatus === 'deprecated';
  if (terminalRailStatus && command.mechanizationStatus !== 'closed') {
    throw new Error(
      'RecordFeatureMechanizationRail retired or deprecated rail status requires closed mechanization.'
    );
  }
  if (terminalRailStatus && command.implementationRefs.length > 0) {
    throw new Error(
      'RecordFeatureMechanizationRail closed retired or deprecated rails must not include --implementation-ref.'
    );
  }
  if (
    !terminalRailStatus &&
    !command.implementationRefs.some((implementationRef) => implementationRef.includes('#'))
  ) {
    throw new Error(
      'RecordFeatureMechanizationRail requires at least one --implementation-ref in path#symbol form.'
    );
  }

  return command;
}

function parseFeatureMechanizationCommand(action, args) {
  if (args.includes('--catalog-reconciliation')) {
    if (action !== 'record' || args.length !== 2 || args[0] !== '--catalog-reconciliation') {
      throw new Error(
        'Catalog reconciliation requires record --catalog-reconciliation <json-file> only.'
      );
    }
    return parseCatalogReconciliation(JSON.parse(readFileSync(args[1], 'utf8')));
  }
  const options = parseFlagOptions(args);
  const featureId = validateFeatureMechanizationFeatureId(requireOption(options, 'feature'));
  const railName = requireOption(options, 'rail');
  const railType = validateFeatureMechanizationRailType(requireOption(options, 'type'));
  const normalizedRailName = normalizeFeatureMechanizationRailName(railName);

  if (action === 'retire') {
    const command = {
      kind: 'feature_mechanization_rail_retire',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      featureId,
      railName,
      normalizedRailName,
      railId: featureMechanizationRailId({ featureId, railType, normalizedRailName }),
      railType,
      expectedRevision: parseIntegerOption(
        requireOption(options, 'expectedRevision'),
        'expected-revision'
      ),
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

  if (action !== 'record') {
    throw new Error(
      `Unknown feature-mechanization operation "${action}". Expected record or retire.`
    );
  }

  if (options.responsibilityBindings !== undefined)
    throw new Error(
      'Source responsibility bindings belong to RecordArchitectureComponent; use --source-bindings there.'
    );

  const command = {
    kind: 'feature_mechanization_rail_record',
    featureId,
    railName,
    normalizedRailName,
    railId: featureMechanizationRailId({ featureId, railType, normalizedRailName }),
    railType,
    dddOwner: requireOption(options, 'dddOwner'),
    applicationPort: requireOption(options, 'applicationPort'),
    adapterSurface: requireOption(options, 'adapterSurface'),
    authorizationScope: requireOption(options, 'authorizationScope'),
    negativeTests: normalizeListOption(options.negativeTest),
    mechanizationStatus: validateFeatureMechanizationStatus(
      options.mechanizationStatus || 'implemented'
    ),
    railStatus: validateFeatureMechanizationRailStatus(options.railStatus || 'implemented'),
    referenceOnly: parseBooleanOption(options.referenceOnly, 'reference-only'),
    authorityRef: normalizeOptionalText(options.authorityRef),
    implementationRefs: normalizeListOption(options.implementationRef),
    documentationRefs: normalizeListOption(options.documentationRef),
    implementationPlan: requireOption(options, 'implementationPlan'),
    componentGuides: normalizeListOption(options.componentGuide),
    userStories: normalizeListOption(options.userStory),
    governingSources: normalizeListOption(options.governingSource),
    allowedImplementationSurfaces: normalizeListOption(options.allowedSurface),
    forbiddenImplementationSurfaces: normalizeListOption(options.forbiddenSurface),
    domainObjects: normalizeListOption(options.domainObject),
    fowlerSignals: normalizeListOption(options.fowlerSignal),
    architectureGuards: normalizeListOption(options.architectureGuard),
    cypressFlows: normalizeListOption(options.cypressFlow),
    completionGate: normalizeListOption(options.completionGate),
    unitTests: normalizeListOption(options.unitTest),
    redTest: requireOption(options, 'redTest'),
    expectedFailure: requireOption(options, 'expectedFailure'),
    patchSurfaces: normalizeListOption(options.patchSurface),
    ...(options.redGreenCycle === undefined
      ? {}
      : { redGreenCycle: requireOption(options, 'redGreenCycle') }),
    greenTest: requireOption(options, 'greenTest'),
    replaceImplementationRefs:
      parseBooleanOption(options.replaceImplementationRefs, 'replace-implementation-refs') ?? false,
    replaceArchitectureGuards:
      parseBooleanOption(options.replaceArchitectureGuards, 'replace-architecture-guards') ?? false,
    replaceDocumentationRefs:
      parseBooleanOption(options.replaceDocumentationRefs, 'replace-documentation-refs') ?? false,
    replaceCurrent: parseBooleanOption(options.replaceCurrent, 'replace-current') ?? false,
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    expectedRevision: parseIntegerOption(options.expectedRevision, 'expected-revision'),
    idempotencyKey: options.idempotencyKey,
  };

  validateFeatureMechanizationRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function normalizeFeatureMechanizationList(value) {
  const normalized = normalizeExistingPayload(value);
  if (Array.isArray(normalized)) {
    return normalized;
  }
  if (normalized && typeof normalized === 'object') {
    return Object.values(normalized)
      .filter(Array.isArray)
      .flat()
      .filter((item) => typeof item === 'string');
  }
  return [];
}

function normalizeFeatureMechanizationReferences(value) {
  return normalizeFeatureMechanizationList(value)
    .map((reference) => {
      if (typeof reference === 'string') {
        return reference;
      }
      if (reference && typeof reference.path === 'string' && typeof reference.name === 'string') {
        return `${reference.path}#${reference.name}`;
      }
      return null;
    })
    .filter(Boolean);
}

function normalizeFeatureMechanizationRail(row) {
  if (!row) {
    return null;
  }

  return {
    railId: row.rail_id ?? row.railId,
    revision: row.revision === null || row.revision === undefined ? null : Number(row.revision),
    createdAt: row.created_at ?? row.createdAt ?? row.imported_at ?? row.importedAt,
    symbolRefs: normalizeFeatureMechanizationReferences(row.symbol_refs ?? row.symbolRefs ?? []),
    implementationRefs: normalizeFeatureMechanizationReferences(
      row.implementation_refs ?? row.implementationRefs ?? []
    ),
    documentationRefs: normalizeFeatureMechanizationList(
      row.documentation_refs ?? row.documentationRefs ?? []
    ),
    governingSources: normalizeFeatureMechanizationList(
      row.governing_sources ?? row.governingSources ?? []
    ),
    allowedImplementationSurfaces: normalizeFeatureMechanizationList(
      row.allowed_implementation_surfaces ?? row.allowedImplementationSurfaces ?? []
    ),
    architectureGuards: normalizeFeatureMechanizationList(
      row.architecture_guards ?? row.architectureGuards ?? []
    ),
    completionGate: normalizeFeatureMechanizationList(
      row.completion_gate ?? row.completionGate ?? []
    ),
    rawRail: normalizeExistingPayload(row.raw_rail ?? row.rawRail ?? {}),
    rawManifest: normalizeExistingPayload(row.raw_manifest ?? row.rawManifest ?? {}),
  };
}

function buildFeatureMechanizationSymbols(command) {
  return command.implementationRefs
    .map((implementationRef) => {
      const separatorIndex = implementationRef.lastIndexOf('#');
      if (separatorIndex < 1 || separatorIndex === implementationRef.length - 1) {
        return null;
      }

      return {
        name: implementationRef.slice(separatorIndex + 1),
        path: implementationRef.slice(0, separatorIndex),
        dddOwner: command.dddOwner,
        cqRails: [command.railName],
        fowlerSignals: command.fowlerSignals,
        architectureGuard: command.architectureGuards[0],
        cypressCoverage: command.cypressFlows[0],
        unitTests: command.unitTests,
      };
    })
    .filter(Boolean);
}

function planFeatureMechanizationRailRecordOperation({ command, existingRail, operationId, now }) {
  if (command.redGreenCycle !== undefined) validateFeatureMechanizationRecordCommand(command);
  const previous = normalizeFeatureMechanizationRail(existingRail);
  const previousRevision = previous ? previous.revision : null;
  if (command.responsibilityBindings !== undefined)
    throw new Error('Source responsibility bindings belong to RecordArchitectureComponent.');
  if (command.replaceCurrent && previous && command.expectedRevision == null)
    throw new Error('--replace-current requires --expected-revision for an existing rail.');
  if (command.replaceDocumentationRefs === true && previous && command.expectedRevision == null) {
    throw new Error(
      '--replace-documentation-refs requires --expected-revision for an existing rail.'
    );
  }
  if (
    command.expectedRevision !== null &&
    command.expectedRevision !== undefined &&
    previousRevision !== command.expectedRevision
  ) {
    throw new Error(
      `Feature mechanization rail ${command.railId} expected revision ${command.expectedRevision}, but current revision is ${previousRevision ?? 'none'}.`
    );
  }

  if (
    command.redGreenCycle !== undefined &&
    previous?.rawManifest.redGreenCycles?.filter((cycle) => cycle.id === command.redGreenCycle)
      .length !== 1
  ) {
    throw new Error(
      `Red-green cycle ${command.redGreenCycle} not found uniquely in rail ${command.railId}.`
    );
  }
  const resultingRevision = previousRevision === null ? 0 : previousRevision + 1;
  const updatedAt = toIso(now);
  const createdAt = previous?.createdAt || updatedAt;
  const terminalRailStatus =
    command.railStatus === 'retired' || command.railStatus === 'deprecated';
  const replaceImplementationRefs = command.replaceImplementationRefs || terminalRailStatus;
  const mergeCommand = { ...command, replaceImplementationRefs };
  const referenceMetadata =
    command.referenceOnly === true
      ? { referenceOnly: true, authorityRef: command.authorityRef }
      : {};
  const retainedPrevious = command.replaceCurrent ? undefined : previous;
  const rawRail = mergeFeatureMechanizationValue(retainedPrevious?.rawRail || {}, {
    name: command.railName,
    type: command.railType,
    dddOwner: command.dddOwner,
    status: command.railStatus,
    applicationPort: command.applicationPort,
    adapterSurface: command.adapterSurface,
    authorizationScope: command.authorizationScope,
    negativeTests: command.negativeTests,
    ...referenceMetadata,
  });
  const patchSurfaces =
    command.patchSurfaces.length > 0
      ? command.patchSurfaces
      : command.allowedImplementationSurfaces;
  const incomingManifest = {
    version: 1,
    featureId: command.featureId,
    mechanizationStatus: command.mechanizationStatus,
    noHumanDecisionsRemaining: true,
    implementationPlan: command.implementationPlan,
    componentGuides: command.componentGuides,
    userStories: command.userStories,
    governingSources: command.governingSources,
    allowedImplementationSurfaces: command.allowedImplementationSurfaces,
    forbiddenImplementationSurfaces: command.forbiddenImplementationSurfaces,
    domainObjects: command.domainObjects,
    fowlerSignals: command.fowlerSignals,
    architectureGuards: command.architectureGuards,
    cypressFlows: command.cypressFlows,
    completionGate: command.completionGate,
    commandQueryRails: [rawRail],
    redGreenCycles: [
      {
        id: command.redGreenCycle ?? `${command.normalizedRailName}-record`,
        redTest: command.redTest,
        expectedFailure: command.expectedFailure,
        patchSurfaces,
        greenTest: command.greenTest,
      },
    ],
    symbols: buildFeatureMechanizationSymbols(command),
  };
  const rawManifest = mergeFeatureMechanizationManifest(
    retainedPrevious?.rawManifest,
    incomingManifest,
    mergeCommand
  );
  const retained = (values) =>
    values.filter(
      (value) =>
        !excludesFeatureMechanizationSurface(value, command.forbiddenImplementationSurfaces)
    );
  const previousSymbolRefs = replaceImplementationRefs ? [] : retainedPrevious?.symbolRefs;
  const previousImplementationRefs = replaceImplementationRefs
    ? []
    : retainedPrevious?.implementationRefs;
  const rail = {
    railId: command.railId,
    featureId: command.featureId,
    mechanizationStatus: command.mechanizationStatus,
    railName: command.railName,
    normalizedRailName: command.normalizedRailName,
    railType: command.railType,
    dddOwner: command.dddOwner,
    railStatus: rawRail.referenceOnly === true ? 'referenced' : command.railStatus,
    symbolRefs: retained(mergeUniqueValues(previousSymbolRefs, command.implementationRefs)),
    implementationRefs: retained(
      mergeUniqueValues(previousImplementationRefs, command.implementationRefs)
    ),
    documentationRefs: mergeUniqueValues(
      command.replaceDocumentationRefs === true ? [] : retainedPrevious?.documentationRefs,
      command.documentationRefs
    ),
    governingSources: mergeUniqueValues(
      retainedPrevious?.governingSources,
      command.governingSources
    ),
    allowedImplementationSurfaces: retained(
      mergeUniqueValues(
        retainedPrevious?.allowedImplementationSurfaces,
        command.allowedImplementationSurfaces
      )
    ),
    architectureGuards: mergeUniqueValues(
      command.replaceArchitectureGuards ? [] : retainedPrevious?.architectureGuards,
      command.architectureGuards
    ),
    completionGate: mergeUniqueValues(retainedPrevious?.completionGate, command.completionGate),
    sourcePath: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    rawRail,
    rawManifest,
    revision: resultingRevision,
    createdBy: command.actor,
    createdAt,
    updatedAt,
  };
  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    railId: command.railId,
    sourcePath: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    expectedRevision: command.expectedRevision,
    previousRevision,
    resultingRevision,
    payload: operationPayload(command),
    createdAt: updatedAt,
  };

  return { rail, audit };
}

function planFeatureMechanizationRailRetireOperation({
  command,
  design,
  designScopes,
  existingRail,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  assertArchitectureDesignScope(
    designScopes,
    'decision',
    command.railId,
    ['may_delete'],
    'FEATURE-MECHANIZATION-RETIRE-DESIGN-SCOPE-MISSING'
  );
  const previous = normalizeFeatureMechanizationRail(existingRail);
  if (!previous || previous.railId !== command.railId) {
    throw new Error(`FEATURE-MECHANIZATION-RETIRE-NOT-FOUND: ${command.railId}`);
  }
  if (previous.revision !== command.expectedRevision) {
    throw new Error(
      `FEATURE-MECHANIZATION-RETIRE-REVISION-CONFLICT: expected ${command.expectedRevision}, found ${previous.revision}.`
    );
  }

  const createdAt = toIso(now);
  return {
    retirement: { railId: command.railId, expectedRevision: command.expectedRevision },
    audit: {
      operationId,
      idempotencyKey: command.idempotencyKey,
      operationType: command.kind,
      actor: command.actor,
      railId: command.railId,
      sourcePath: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
      expectedRevision: command.expectedRevision,
      previousRevision: previous.revision,
      resultingRevision: previous.revision + 1,
      payload: operationPayload(command),
      createdAt,
    },
  };
}

async function readExistingFeatureMechanizationOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.feature_mechanization_local_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function readLocalFeatureMechanizationRail(client, railId, lock = false, identity = null) {
  const result = await client.query(
    `select *
     from ${schemaName}.feature_mechanization_local_rails
     where rail_id = $1
     ${lock ? 'for update' : ''}`,
    [railId]
  );

  if (result.rows[0] || !identity) {
    return result.rows[0] || null;
  }

  const effectiveResult = await client.query(
    `select *
     from ${schemaName}.command_query_rail_manifest_query
     where feature_id = $1
       and rail_type = $2
       and normalized_rail_name = $3
     limit 1`,
    [identity.featureId, identity.railType, identity.normalizedRailName]
  );

  return effectiveResult.rows[0] || null;
}

async function assertFeatureMechanizationReferenceAuthority(client, rail) {
  if (rail.rawRail.referenceOnly !== true) {
    return;
  }

  const { readRailReferenceAuthority } = require('../command-query-rail-authority.cjs');
  const authority = await readRailReferenceAuthority(client, rail);

  if (!authority) {
    throw new Error(
      `FEATURE-MECHANIZATION-REFERENCE-AUTHORITY-NOT-FOUND: ${rail.railType} ${rail.normalizedRailName} at ${rail.rawRail.authorityRef}.`
    );
  }
}

async function writePlannedFeatureMechanizationRailRecordOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.feature_mechanization_local_rails
      (rail_id, feature_id, mechanization_status, rail_name, normalized_rail_name,
       rail_type, ddd_owner, rail_status, symbol_refs, implementation_refs,
       documentation_refs, governing_sources, allowed_implementation_surfaces,
       architecture_guards, completion_gate, source_path, source_content_sha256,
       raw_rail, raw_manifest, revision, created_by, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb,
             $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17,
             $18::jsonb, $19::jsonb, $20, $21, $22, $23)
     on conflict (rail_id) do update set
       feature_id = excluded.feature_id,
       mechanization_status = excluded.mechanization_status,
       rail_name = excluded.rail_name,
       normalized_rail_name = excluded.normalized_rail_name,
       rail_type = excluded.rail_type,
       ddd_owner = excluded.ddd_owner,
       rail_status = excluded.rail_status,
       symbol_refs = excluded.symbol_refs,
       implementation_refs = excluded.implementation_refs,
       documentation_refs = excluded.documentation_refs,
       governing_sources = excluded.governing_sources,
       allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
       architecture_guards = excluded.architecture_guards,
       completion_gate = excluded.completion_gate,
       source_path = excluded.source_path,
       source_content_sha256 = excluded.source_content_sha256,
       raw_rail = excluded.raw_rail,
       raw_manifest = excluded.raw_manifest,
       revision = excluded.revision,
       updated_at = excluded.updated_at`,
    [
      planned.rail.railId,
      planned.rail.featureId,
      planned.rail.mechanizationStatus,
      planned.rail.railName,
      planned.rail.normalizedRailName,
      planned.rail.railType,
      planned.rail.dddOwner,
      planned.rail.railStatus,
      toJson(planned.rail.symbolRefs),
      toJson(planned.rail.implementationRefs),
      toJson(planned.rail.documentationRefs),
      toJson(planned.rail.governingSources),
      toJson(planned.rail.allowedImplementationSurfaces),
      toJson(planned.rail.architectureGuards),
      toJson(planned.rail.completionGate),
      planned.rail.sourcePath,
      planned.rail.sourceContentSha256,
      toJson(planned.rail.rawRail),
      toJson(planned.rail.rawManifest),
      planned.rail.revision,
      planned.rail.createdBy,
      planned.rail.createdAt,
      planned.rail.updatedAt,
    ]
  );

  await client.query(
    `insert into ${schemaName}.feature_mechanization_local_operations
      (operation_id, idempotency_key, operation_type, actor, rail_id, source_path,
       source_content_sha256, expected_revision, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.railId,
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

async function writePlannedFeatureMechanizationRailRetireOperation(client, planned) {
  const result = await client.query(
    `delete from ${schemaName}.feature_mechanization_local_rails
     where rail_id = $1
       and revision = $2`,
    [planned.retirement.railId, planned.retirement.expectedRevision]
  );
  if (result.rowCount !== 1) {
    throw new Error(
      `FEATURE-MECHANIZATION-RETIRE-CONFLICT: ${planned.retirement.railId} no longer has revision ${planned.retirement.expectedRevision}.`
    );
  }

  await client.query(
    `insert into ${schemaName}.feature_mechanization_local_operations
      (operation_id, idempotency_key, operation_type, actor, rail_id, source_path,
       source_content_sha256, expected_revision, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.railId,
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

async function applyFeatureMechanizationRailRecordOperation(command, options = {}) {
  if (command.catalogReconciliation) {
    return applyCatalogReconciliation(command.catalogReconciliation, options);
  }
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingFeatureMechanizationOperation(
      client,
      command.idempotencyKey
    );
    if (existing) {
      assertFeatureMechanizationRailIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const existingRail = await readLocalFeatureMechanizationRail(
      client,
      command.railId,
      true,
      command
    );
    const planned = planFeatureMechanizationRailRecordOperation({
      command,
      existingRail,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await assertFeatureMechanizationReferenceAuthority(client, planned.rail);
    await writePlannedFeatureMechanizationRailRecordOperation(client, planned);
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

async function applyFeatureMechanizationRailRetireOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;
  if (ownsClient) await client.connect();

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');
    const existing = await readExistingFeatureMechanizationOperation(
      client,
      command.idempotencyKey
    );
    if (existing) {
      assertFeatureMechanizationRailIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }
    const [design, designScopes, existingRail] = await Promise.all([
      readArchitectureDesign(client, command.designId),
      readArchitectureDesignScopes(client, command.designId),
      readLocalFeatureMechanizationRail(client, command.railId, true),
    ]);
    const planned = planFeatureMechanizationRailRetireOperation({
      command,
      design,
      designScopes,
      existingRail,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });
    await writePlannedFeatureMechanizationRailRetireOperation(client, planned);
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
  applyFeatureMechanizationRailRecordOperation,
  applyFeatureMechanizationRailRetireOperation,
  assertFeatureMechanizationRailIdempotentReplayMatches,
  assertFeatureMechanizationReferenceAuthority,
  parseFeatureMechanizationCommand,
  planFeatureMechanizationRailRecordOperation,
  planFeatureMechanizationRailRetireOperation,
  writePlannedFeatureMechanizationRailRecordOperation,
  writePlannedFeatureMechanizationRailRetireOperation,
};
