/**
 * @file scripts/planning-db/operate/component-definition.cjs
 * @ownedConcern Valid governance definitions and precise semantic/ownership deltas.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  canonicalJson,
  mergeUniqueValues,
  normalizeListOption,
  normalizeOperationRevision,
  normalizeOptionalText,
  parseBooleanOption,
  parseFlagOptions,
  parseIntegerOption,
  requireOption,
  toIso,
  validateComponentId,
  validateSha256,
} = require('./command-values.cjs');

const { defaultIdempotencyKey, operationPayload } = require('./operation-payload.cjs');

const {
  assertArchitectureDesignMayRecord,
  assertArchitectureDesignScope,
  validateArchitectureDesignId,
} = require('./architecture-design-authority.cjs');

const { sha256HexUtf8 } = require('@dvt/crypto');

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

function validateComponentReparentCommand(command) {
  if (command.componentId === command.parentComponentId) {
    throw new Error(`Governance component ${command.componentId} cannot be its own parent.`);
  }

  return command;
}

function validateComponentReviseCommand(command) {
  const changes = [
    command.status,
    command.childrenRequired,
    command.ownedConcern,
    command.dddOwner,
    command.cqRails,
    ...(command.addOwns || []),
    ...(command.removeOwns || []),
    ...(command.addExcludes || []),
    ...(command.removeExcludes || []),
    ...(command.responsibilities || []),
    ...(command.removeResponsibilities || []),
    ...(command.nonGoals || []),
    ...(command.reasonsToChange || []),
    ...(command.removeNonGoals || []),
    ...(command.removeReasonsToChange || []),
    ...(command.publicApi || []),
    ...(command.removePublicApi || []),
    ...(command.invariants || []),
    ...(command.transitions || []),
    ...(command.consumers || []),
    ...(command.governance || []),
    ...(command.fowlerSignals || []),
  ].filter((value) => value !== null && value !== undefined);
  if (changes.length === 0) {
    throw new Error(
      `Governance component ${command.componentId} revise requires a status, children-required, ownership delta, or semantic metadata.`
    );
  }

  for (const [label, additions, removals] of [
    ['owns', command.addOwns, command.removeOwns],
    ['excludes', command.addExcludes, command.removeExcludes],
    ['responsibility', command.responsibilities, command.removeResponsibilities],
  ]) {
    const removalSet = new Set(removals || []);
    const conflict = (additions || []).find((value) => removalSet.has(value));
    if (conflict) {
      throw new Error(
        `Governance component ${command.componentId} cannot add and remove the same ${label} pattern "${conflict}".`
      );
    }
  }

  return command;
}

function parseComponentCommand(action, args) {
  if (action !== 'create' && action !== 'revise' && action !== 'reparent') {
    throw new Error(
      `Unknown component operation "${action}". Expected create, revise, or reparent.`
    );
  }

  const options = parseFlagOptions(args);
  const actor = requireOption(options, 'actor');
  if (action === 'reparent') {
    const command = {
      kind: 'component_reparent',
      componentId: validateComponentId(requireOption(options, 'component'), 'component'),
      parentComponentId: validateComponentId(requireOption(options, 'parent'), 'parent'),
      sourceRef: requireOption(options, 'sourceRef'),
      sourceContentSha256: validateSha256(
        requireOption(options, 'sourceContentSha256'),
        'source-content-sha256'
      ),
      actor,
      expectedRevision: parseIntegerOption(options.expectedRevision, 'expected-revision'),
      idempotencyKey: options.idempotencyKey,
    };

    validateComponentReparentCommand(command);
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

  if (action === 'revise') {
    const command = {
      kind: 'component_revise',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      componentId: validateComponentId(requireOption(options, 'component'), 'component'),
      status: options.status ? validateComponentStatus(options.status) : null,
      childrenRequired:
        options.childrenRequired === undefined
          ? null
          : parseBooleanOption(options.childrenRequired, 'children-required'),
      ownedConcern: normalizeOptionalText(options.ownedConcern),
      dddOwner: normalizeOptionalText(options.dddOwner),
      cqRails: options.cqRails === undefined ? null : validateComponentCqRails(options.cqRails),
      addOwns: normalizeListOption(options.addOwns),
      removeOwns: normalizeListOption(options.removeOwns),
      addExcludes: normalizeListOption(options.addExcludes),
      removeExcludes: normalizeListOption(options.removeExcludes),
      responsibilities: normalizeListOption(options.responsibility),
      ...(options.removeResponsibility === undefined
        ? {}
        : { removeResponsibilities: normalizeListOption(options.removeResponsibility) }),
      nonGoals: normalizeListOption(options.nonGoal),
      reasonsToChange: normalizeListOption(options.reasonToChange),
      removeNonGoals: normalizeListOption(options.removeNonGoal),
      removeReasonsToChange: normalizeListOption(options.removeReasonToChange),
      publicApi: normalizeListOption(options.publicApi),
      removePublicApi: normalizeListOption(options.removePublicApi),
      invariants: normalizeListOption(options.invariant),
      transitions: normalizeListOption(options.transition),
      consumers: normalizeListOption(options.consumer),
      governance: normalizeListOption(options.governance),
      fowlerSignals: normalizeListOption(options.fowlerSignal),
      sourceRef: requireOption(options, 'sourceRef'),
      sourceContentSha256: validateSha256(
        requireOption(options, 'sourceContentSha256'),
        'source-content-sha256'
      ),
      actor,
      expectedRevision: parseIntegerOption(options.expectedRevision, 'expected-revision'),
      idempotencyKey: options.idempotencyKey,
    };

    validateComponentReviseCommand(command);
    return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
  }

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

function normalizeComponentList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeEffectiveComponentDefinition(row) {
  if (!row) {
    return null;
  }

  return {
    componentId: row.component_id ?? row.componentId,
    name: row.name,
    level: row.level,
    parentComponentId: row.parent_id ?? row.parentComponentId,
    rootUnit: row.root_unit ?? row.rootUnit,
    domainUnit: row.domain_unit ?? row.domainUnit,
    status: row.status,
    childrenRequired: row.children_required ?? row.childrenRequired ?? false,
    ownedConcern: row.owned_concern ?? row.ownedConcern,
    owns: normalizeComponentList(row.owns),
    excludes: normalizeComponentList(row.excludes),
    responsibilities: normalizeComponentList(row.responsibilities),
    nonGoals: normalizeComponentList(row.non_goals ?? row.nonGoals),
    reasonsToChange: normalizeComponentList(row.reasons_to_change ?? row.reasonsToChange),
    dddOwner: row.ddd_owner ?? row.dddOwner,
    cqRails: row.cq_rails ?? row.cqRails,
    publicApi: normalizeComponentList(row.public_api ?? row.publicApi),
    invariants: normalizeComponentList(row.invariants),
    transitions: normalizeComponentList(row.transitions),
    consumers: normalizeComponentList(row.consumers),
    governance: normalizeComponentList(row.governance_refs ?? row.governance),
    fowlerSignals: normalizeComponentList(row.fowler_signals ?? row.fowlerSignals),
    revision: Number(row.revision ?? 0),
  };
}

function buildComponentOwnershipPatterns(command) {
  return [
    ...(command.owns || []).map((pattern, index) => ({
      componentId: command.componentId,
      patternKind: 'owns',
      pattern,
      patternOrder: index,
    })),
    ...(command.excludes || []).map((pattern, index) => ({
      componentId: command.componentId,
      patternKind: 'excludes',
      pattern,
      patternOrder: index,
    })),
  ];
}

function buildComponentSemanticItems(command) {
  const fields = [
    ['responsibility', command.responsibilities],
    ['non_goal', command.nonGoals],
    ['reason_to_change', command.reasonsToChange],
    ['public_api', command.publicApi],
    ['invariant', command.invariants],
    ['transition', command.transitions],
    ['consumer', command.consumers],
    ['governance_ref', command.governance],
    ['fowler_signal', command.fowlerSignals],
  ];

  return fields.flatMap(([itemKind, values]) =>
    (values || []).map((itemValue, index) => ({
      componentId: command.componentId,
      itemKind,
      itemValue,
      itemOrder: index,
    }))
  );
}

function componentDefinitionSourceHash(command) {
  return sha256HexUtf8(canonicalJson(operationPayload(command)));
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
  const ownershipPatterns = buildComponentOwnershipPatterns(command);
  const semanticItems = buildComponentSemanticItems(command);
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
    ownedConcern: command.ownedConcern,
    dddOwner: command.dddOwner,
    cqRails: command.cqRails,
    createdBy: command.actor,
    createdAt,
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

  return { definition, ownershipPatterns, semanticItems, audit };
}

function normalizeImportedGovernanceComponent(row) {
  if (!row) {
    return null;
  }

  return {
    sourceKind: row.source_kind ?? row.sourceKind ?? 'imported',
    componentId: row.component_id ?? row.componentId,
    parentId: row.parent_id ?? row.parentId,
    revision: row.revision === undefined || row.revision === null ? null : Number(row.revision),
    sourcePath: row.source_path ?? row.sourcePath,
    sourceContentSha256: row.source_content_sha256 ?? row.sourceContentSha256,
    rawComponent: row.raw_component ?? row.rawComponent ?? {},
  };
}

function normalizeUnitPathRows(rows) {
  return (rows || []).map((row) => row.unit_id ?? row.unitId).filter(Boolean);
}

function reparentRawComponent(rawComponent, command, unitPath) {
  const raw =
    rawComponent && typeof rawComponent === 'object' && !Array.isArray(rawComponent)
      ? { ...rawComponent }
      : {};
  raw.parent = command.parentComponentId;
  raw.unitPath = unitPath;
  raw.reparentedBy = {
    operation: command.kind,
    sourceRef: command.sourceRef,
  };

  if (Array.isArray(raw.unitReferences)) {
    raw.unitReferences = raw.unitReferences.map((unit) =>
      unit && unit.id === command.componentId
        ? { ...unit, parent: command.parentComponentId }
        : unit
    );
  }

  return raw;
}

function planComponentReparentOperation({
  command,
  parentUnit,
  existingComponent,
  parentPathRows,
  latestOperation,
  operationId,
  now,
}) {
  const component = normalizeImportedGovernanceComponent(existingComponent);
  if (!component) {
    throw new Error(
      `Governance component ${command.componentId} is not present in the planning DB.`
    );
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

  const previousRevision =
    component.revision === null ? normalizeOperationRevision(latestOperation) : component.revision;
  if (
    command.expectedRevision !== null &&
    command.expectedRevision !== undefined &&
    previousRevision !== command.expectedRevision
  ) {
    throw new Error(
      `Governance component ${command.componentId} expected revision ${command.expectedRevision}, but current revision is ${previousRevision}.`
    );
  }

  validateComponentReparentCommand(command);

  const parentPath = normalizeUnitPathRows(parentPathRows);
  if (parentPath[parentPath.length - 1] !== command.parentComponentId) {
    throw new Error(
      `Parent governance unit ${command.parentComponentId} does not have a resolvable unit path.`
    );
  }
  if (parentPath.includes(command.componentId)) {
    throw new Error(
      `Governance component ${command.componentId} cannot be reparented under its own descendant ${command.parentComponentId}.`
    );
  }

  const unitPath = [...parentPath, command.componentId];
  const resultingRevision = previousRevision + 1;
  const createdAt = toIso(now);
  const definition = {
    sourceKind: component.sourceKind,
    componentId: command.componentId,
    parentComponentId: command.parentComponentId,
    rootUnit: parent.rootUnit || parent.unitId,
    domainUnit: parent.domainUnit || parent.rootUnit || parent.unitId,
    sourcePath: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    revision: resultingRevision,
    unitPath,
    rawComponent: reparentRawComponent(component.rawComponent, command, unitPath),
  };
  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    componentId: command.componentId,
    sourcePath: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    expectedRevision: command.expectedRevision ?? null,
    previousRevision,
    resultingRevision,
    payload: {
      ...operationPayload(command),
      resultingDefinition: definition,
    },
    createdAt,
  };

  return { definition, audit };
}

function applyComponentPatternDelta(componentId, label, currentValues, additions, removals) {
  const values = new Set(currentValues || []);
  for (const removal of removals || []) {
    if (!values.has(removal)) {
      throw new Error(
        `Governance component ${componentId} cannot remove unknown ${label} pattern "${removal}".`
      );
    }
    values.delete(removal);
  }
  for (const addition of additions || []) {
    values.add(addition);
  }
  return [...values];
}

function validateRevisedComponentDefinition(definition) {
  if (definition.status !== 'superseded') {
    if (definition.owns.length === 0 && definition.childrenRequired !== true) {
      throw new Error(
        `Governance component ${definition.componentId} must retain owns or children-required true.`
      );
    }
    if (definition.excludes.length > 0 && definition.owns.length === 0) {
      throw new Error(
        `Governance component ${definition.componentId} cannot retain excludes without owns.`
      );
    }
  }

  for (const [field, value] of [
    ['name', definition.name],
    ['parent', definition.parentComponentId],
    ['owned-concern', definition.ownedConcern],
    ['ddd-owner', definition.dddOwner],
    ['cq-rails', definition.cqRails],
  ]) {
    if (!normalizeOptionalText(value)) {
      throw new Error(
        `Governance component ${definition.componentId} is missing effective ${field} semantics.`
      );
    }
  }

  if (definition.status === 'canonical') {
    for (const [field, values] of [
      ['public-api', definition.publicApi],
      ['invariant', definition.invariants],
      ['transition', definition.transitions],
      ['consumer', definition.consumers],
    ]) {
      if (values.length === 0) {
        throw new Error(`Canonical component ${definition.componentId} is missing --${field}.`);
      }
    }
  }
}

function planComponentReviseOperation({
  command,
  design,
  designScopes,
  existingComponent,
  latestOperation,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_update'],
    'GOVERNANCE-COMPONENT-DESIGN-SCOPE-MISSING'
  );
  validateComponentReviseCommand(command);

  const component = normalizeEffectiveComponentDefinition(existingComponent);
  if (!component) {
    throw new Error(
      `Governance component ${command.componentId} is not present in the planning DB.`
    );
  }

  const previousRevision = Math.max(
    component.revision,
    normalizeOperationRevision(latestOperation)
  );
  if (
    command.expectedRevision !== null &&
    command.expectedRevision !== undefined &&
    previousRevision !== command.expectedRevision
  ) {
    throw new Error(
      `Governance component ${command.componentId} expected revision ${command.expectedRevision}, but current revision is ${previousRevision}.`
    );
  }

  const resultingRevision = previousRevision + 1;
  const createdAt = toIso(now);
  const definition = {
    ...component,
    sourcePath: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    revision: resultingRevision,
    status: command.status ?? component.status,
    childrenRequired: command.childrenRequired ?? component.childrenRequired,
    ownedConcern: command.ownedConcern ?? component.ownedConcern,
    dddOwner: command.dddOwner ?? component.dddOwner,
    cqRails: command.cqRails ?? component.cqRails,
    owns: applyComponentPatternDelta(
      command.componentId,
      'owns',
      component.owns,
      command.addOwns,
      command.removeOwns
    ),
    excludes: applyComponentPatternDelta(
      command.componentId,
      'excludes',
      component.excludes,
      command.addExcludes,
      command.removeExcludes
    ),
    responsibilities: applyComponentPatternDelta(
      command.componentId,
      'responsibility',
      component.responsibilities,
      command.responsibilities,
      command.removeResponsibilities
    ),
    nonGoals: applyComponentPatternDelta(
      command.componentId,
      'non-goal',
      component.nonGoals,
      command.nonGoals,
      command.removeNonGoals
    ),
    reasonsToChange: applyComponentPatternDelta(
      command.componentId,
      'reason-to-change',
      component.reasonsToChange,
      command.reasonsToChange,
      command.removeReasonsToChange
    ),
    publicApi: applyComponentPatternDelta(
      command.componentId,
      'public-api',
      component.publicApi,
      command.publicApi,
      command.removePublicApi
    ),
    invariants: mergeUniqueValues(component.invariants, command.invariants),
    transitions: mergeUniqueValues(component.transitions, command.transitions),
    consumers: mergeUniqueValues(component.consumers, command.consumers),
    governance: mergeUniqueValues(component.governance, command.governance),
    fowlerSignals: mergeUniqueValues(component.fowlerSignals, command.fowlerSignals),
    createdBy: command.actor,
    createdAt,
  };
  validateRevisedComponentDefinition(definition);

  const ownershipPatterns = buildComponentOwnershipPatterns(definition);
  const semanticItems = buildComponentSemanticItems(definition);
  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    componentId: command.componentId,
    sourcePath: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    expectedRevision: command.expectedRevision ?? null,
    previousRevision,
    resultingRevision,
    payload: {
      ...operationPayload(command),
      resultingDefinition: definition,
    },
    createdAt,
  };

  return { definition, ownershipPatterns, semanticItems, audit };
}

module.exports = {
  parseComponentCommand,
  planComponentCreateOperation,
  planComponentReparentOperation,
  planComponentReviseOperation,
  validateComponentStatus,
};
