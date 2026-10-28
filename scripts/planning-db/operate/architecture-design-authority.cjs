/**
 * @file scripts/planning-db/operate/architecture-design-authority.cjs
 * @ownedConcern Design states, exact scopes and current architecture authorization reads.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const { normalizeListOption, normalizeOptionalText } = require('./command-values.cjs');

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

const allowedArchitectureDesignTransitions = new Map([
  ['proposed', new Set(['review', 'superseded'])],
  ['review', new Set(['approved', 'superseded'])],
  ['approved', new Set(['implementing', 'superseded'])],
  ['implementing', new Set(['implemented', 'drift', 'superseded'])],
  ['implemented', new Set(['drift', 'superseded'])],
  ['drift', new Set(['review', 'superseded'])],
  ['superseded', new Set()],
]);

const allowedArchitectureFitnessDesignStatuses = new Set([
  'proposed',
  'review',
  'approved',
  'implementing',
  'implemented',
  'drift',
]);

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
  'command',
  'relation',
  'contract',
  'port',
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

const allowedArchitectureRecordStatuses = new Set([
  'proposed',
  'review',
  'approved',
  'implemented',
  'deprecated',
  'drift',
]);

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

function validateArchitectureDesignTransition(fromStatusValue, toStatusValue) {
  const fromStatus = validateArchitectureDesignStatus(fromStatusValue);
  const toStatus = validateArchitectureDesignStatus(toStatusValue);
  if (!allowedArchitectureDesignTransitions.get(fromStatus)?.has(toStatus)) {
    throw new Error(
      `ARCH-DESIGN-TRANSITION-INVALID: cannot transition architecture design from ${fromStatus} to ${toStatus}.`
    );
  }

  return { fromStatus, toStatus };
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

function validateArchitectureDesignId(value) {
  const normalized = String(value || '').trim();
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --design "${value}". Expected an alphanumeric kebab-case architecture design id.`
    );
  }

  return normalized;
}

function validateArchitectureRecordStatus(value) {
  if (!allowedArchitectureRecordStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureComponent and RecordArchitectureRelation start in proposed or review status.`
    );
  }

  return value;
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

function normalizeArchitectureDesign(row) {
  if (!row) {
    return null;
  }

  return {
    designId: row.design_id ?? row.designId,
    status: row.status,
    approvedAt: row.approved_at ?? row.approvedAt ?? null,
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

function assertArchitectureDesignMayScan(design, command) {
  const normalized = normalizeArchitectureDesign(design);
  if (!normalized || normalized.designId !== command.designId) {
    throw new Error(`ARCH-FITNESS-DESIGN-MISSING: ${command.designId}`);
  }

  if (!allowedArchitectureFitnessDesignStatuses.has(normalized.status)) {
    throw new Error(
      `ARCH-FITNESS-DESIGN-MISSING: design ${command.designId} is ${normalized.status}; architecture fitness scan recording requires an active design.`
    );
  }

  return normalized;
}

function assertArchitectureDesignMayProve(design, command) {
  const normalized = normalizeArchitectureDesign(design);
  if (!normalized || normalized.designId !== command.designId) {
    throw new Error(`ARCH-EVIDENCE-DESIGN-MISSING: ${command.designId}`);
  }

  if (!['implementing', 'implemented'].includes(normalized.status)) {
    throw new Error(
      `ARCH-EVIDENCE-DESIGN-INACTIVE: design ${command.designId} is ${normalized.status}; execution proof requires implementing or implemented.`
    );
  }

  return normalized;
}

function assertArchitectureDesignMayImplement(design, command) {
  const normalized = normalizeArchitectureDesign(design);
  if (!normalized || normalized.designId !== command.designId) {
    throw new Error(`ARCH-COMPONENT-DESIGN-MISSING: ${command.designId}`);
  }

  if (normalized.status !== 'implementing') {
    throw new Error(
      `ARCH-COMPONENT-DESIGN-INACTIVE: design ${command.designId} is ${normalized.status}; governed responsibility retirement requires implementing.`
    );
  }

  return normalized;
}

function assertArchitectureDesignScope(designScopes, subjectKind, subjectId, scopeKinds, code) {
  if (!hasArchitectureDesignScope(designScopes, subjectKind, subjectId, scopeKinds)) {
    throw new Error(`${code}: missing ${subjectKind}:${subjectId}:${scopeKinds.join('|')} scope.`);
  }
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

async function readArchitectureImplementationViolations(client, designId) {
  const result = await client.query(
    `select violation_kind, subject_kind, subject_id, severity
     from architecture.implementation_violation_query
     where design_id = $1`,
    [designId]
  );
  return result.rows;
}

module.exports = {
  allowedArchitectureScopeSubjectKinds,
  assertArchitectureDesignMayImplement,
  assertArchitectureDesignMayProve,
  assertArchitectureDesignMayRecord,
  assertArchitectureDesignMayScan,
  assertArchitectureDesignScope,
  normalizeArchitectureDesign,
  parseArchitectureDesignScopes,
  readArchitectureDesign,
  readArchitectureDesignScopes,
  readArchitectureImplementationViolations,
  readExistingArchitectureDesignOperation,
  validateArchitectureDesignCreateStatus,
  validateArchitectureDesignId,
  validateArchitectureDesignStatus,
  validateArchitectureDesignTransition,
  validateArchitectureFowlerSignal,
  validateArchitectureRailRef,
  validateArchitectureRecordStatus,
};
