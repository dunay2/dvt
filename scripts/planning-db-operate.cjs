/**
 * @file scripts/planning-db-operate.cjs
 * @ownedConcern Execute database architecture and governance command rails with idempotent audit.
 * @baseline ADR-0055: Planning DB canonical operational source
 * @decision Keep operational writes behind explicit command rails instead of direct generated-file edits.
 * @consequence Architecture, docs resolutions, and governance component definitions share
 *   validation, idempotency, and audit semantics before projections consume them.
 * @version 1.2.0
 */
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { randomUuidV4, sha256Hex, sha256HexUtf8 } = require('@dvt/crypto');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { assertPlanningDbCurrentSchemaReady, schemaName } = require('./planning-db-schema.cjs');
const componentEngineeringSchemaName = 'component_engineering';
const { runArchitectureFitnessScan } = require('./planning-db/architecture-fitness/scan.cjs');

function sha256(value) {
  return typeof value === 'string' ? sha256HexUtf8(value) : sha256Hex(value);
}
const {
  allowedDbSurfaceAuthorityModes,
  allowedDbSurfaceWriteRailKinds,
} = require('./planning-db/db-surface-inventory.cjs');
const {
  applyGovernanceRefreshRunRecordOperation,
  planGovernanceRefreshRunRecordOperation,
  writePlannedGovernanceRefreshRunRecordOperation,
} = require('./planning-db/governance-refresh-write-rail.cjs');
const {
  createGovernanceRefreshCommandParser,
  validateGovernanceRefreshRunState,
} = require('./planning-db/commands/governance-refresh-command.cjs');
const {
  createGovernedSourceRefreshCommandParser,
} = require('./planning-db/commands/governed-source-refresh-command.cjs');
const {
  applyGovernedSourceRefreshOperation,
} = require('./planning-db/governed-source-refresh-write-rail.cjs');

const allowedDocsResolutionStatuses = new Set(['resolved', 'accepted', 'ignored', 'linked']);
const allowedFowlerAnalysisDispositionStatuses = new Set([
  'proposed',
  'accepted',
  'rejected',
  'superseded',
]);
const allowedFowlerAnalysisCanonicalTargetStatuses = new Set([
  'proposed',
  'accepted',
  'rejected',
  'superseded',
]);
const allowedFowlerAnalysisReferenceResolutionStatuses = new Set([
  'resolved',
  'obsolete',
  'replaced',
  'blocked',
  'ignored',
]);
const allowedFowlerAnalysisRetirementDecisionStatuses = new Set([
  'approved',
  'rejected',
  'blocked',
]);
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
const allowedArchitectureRecordStatuses = new Set([
  'proposed',
  'review',
  'approved',
  'implemented',
  'deprecated',
  'drift',
]);
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
const allowedArchitectureRelationRecordStatuses = new Set([
  'proposed',
  'approved',
  'implemented',
  'deprecated',
  'drift',
]);
const allowedArchitectureContractKinds = new Set([
  'api',
  'event',
  'port',
  'storage',
  'type',
  'workflow',
  'dbt',
]);
const allowedArchitectureContractCompatibilities = new Set([
  'breaking',
  'additive',
  'internal',
  'none',
]);
const allowedArchitectureContractStatuses = new Set([
  'proposed',
  'approved',
  'implemented',
  'deprecated',
]);
const allowedArchitecturePortKinds = new Set([
  'command',
  'query',
  'event',
  'storage',
  'api',
  'ui-action',
]);
const allowedArchitecturePortDirections = new Set(['inbound', 'outbound']);
const allowedArchitecturePortStatuses = new Set(['proposed', 'approved', 'implemented']);
const allowedArchitectureStorageIoDirections = new Set(['reads', 'writes']);
const allowedArchitectureStorageIoAccessPatterns = new Set([
  'transactional',
  'projection',
  'bulk',
  'migration',
  'read_only',
]);
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
  'add-owns',
  'remove-owns',
  'add-excludes',
  'remove-excludes',
]);
const featureMechanizationListOptionKeys = new Set([
  'component-guide',
  'implementation-ref',
  'documentation-ref',
  'governing-source',
  'allowed-surface',
  'forbidden-surface',
  'domain-object',
  'fowler-signal',
  'architecture-guard',
  'cypress-flow',
  'completion-gate',
  'unit-test',
  'patch-surface',
]);
const architectureListOptionKeys = new Set(['negative-test']);
const operationHelp = Object.freeze({
  component: {
    operations: ['create', 'revise', 'reparent'],
    usage:
      'pnpm planning:db:operate component <create|revise|reparent> --component <SYS-ID> --actor <actor>',
    details: [
      'CreateGovernanceComponent records DB-authored governance component ownership.',
      'ReviseGovernanceComponent overlays imported ownership and status through a scoped, audited DB command.',
      'ReparentGovernanceComponent updates the imported governance component tree through an audited DB command rail.',
      'Required semantic fields include --name, --owned-concern, --owns or --children-required true, --ddd-owner, and --cq-rails.',
    ],
  },
  'db-surface': {
    operations: ['upsert'],
    usage:
      'pnpm planning:db:operate db-surface upsert --surface <name> --authority-mode <state> --write-rail-kind <kind> --actor <actor>',
    details: [
      'UpsertDbGovernanceSurface records the DB surface inventory through a DB command rail.',
      'database surfaces require --write-rail-kind db_command and a source-content hash.',
    ],
  },
  'architecture-design': {
    operations: ['create', 'transition'],
    usage:
      'pnpm planning:db:operate architecture-design <create|transition> --design <DESIGN-ID> --actor <actor>',
    details: [
      'CreateArchitectureDesign records database architecture authority before implementation.',
      'TransitionArchitectureDesign advances or supersedes that authority through an audited compare-and-set lifecycle.',
      'Requires --work-item, --title, --owner, --rationale, --rail-ref, --scope, --source-ref, and --source-content-sha256.',
    ],
  },
  'architecture-component': {
    operations: ['record', 'retire-responsibility'],
    usage:
      'pnpm planning:db:operate architecture-component <record|retire-responsibility> --design <DESIGN-ID> --component <SYS-ID> --actor <actor>',
    details: [
      'RecordArchitectureComponent adds a scoped component to an approved or review design authority.',
      'RetireArchitectureComponentResponsibility removes one stale responsibility through exact component update authority.',
      'Requires taxonomy fields --kind, --layer, --owner, --repo-path, --public-contract, and at least one --responsibility.',
    ],
  },
  'architecture-relation': {
    operations: ['record'],
    usage:
      'pnpm planning:db:operate architecture-relation record --design <DESIGN-ID> --relation <REL-ID> --actor <actor>',
    details: [
      'RecordArchitectureRelation adds scoped graph edges between two architecture components.',
      'Requires --source, --target, --type, --direction, --sync-async, --failure-mode, --authorization-scope, --source-ref, and --source-content-sha256.',
    ],
  },
  'architecture-contract': {
    operations: ['record'],
    usage:
      'pnpm planning:db:operate architecture-contract record --design <DESIGN-ID> --contract <CONTRACT-ID> --actor <actor>',
    details: [
      'RecordArchitectureContract adds scoped contract authority for a component-owned API, event, port, storage, type, workflow, or dbt contract.',
      'Requires --owner-component, --kind, --contract-ref, --compatibility, --status, --validation-command, --source-ref, and --source-content-sha256.',
    ],
  },
  'architecture-port': {
    operations: ['record'],
    usage:
      'pnpm planning:db:operate architecture-port record --design <DESIGN-ID> --port <PORT-ID> --component <SYS-ID> --actor <actor>',
    details: [
      'RecordArchitecturePort adds scoped command/query/event/storage/API/UI-action ports to an architecture component.',
      'Requires --name, --kind, --direction, at least one --input-contract or --output-contract, at least one --negative-test, --source-ref, and --source-content-sha256.',
    ],
  },
  'architecture-storage-io': {
    operations: ['record'],
    usage:
      'pnpm planning:db:operate architecture-storage-io record --design <DESIGN-ID> --storage-io <STORAGE-ID> --component <SYS-ID> --actor <actor>',
    details: [
      'RecordArchitectureStorageIo updates one existing storage I/O fact under explicit design, component, output-path, and optional contract scope.',
      'Requires --expected-storage-object, --storage-object, --direction, --access-pattern, --source-ref, and --source-content-sha256.',
    ],
  },
  'architecture-fitness': {
    operations: ['scan'],
    usage:
      'pnpm planning:db:operate architecture-fitness scan --design <DESIGN-ID> --scan <SCAN-ID> --actor <actor>',
    details: [
      'RecordArchitectureFitnessScan records observed repository dependencies against a database architecture design.',
      'Requires --root, --source-ref, --source-content-sha256, and an existing architecture design.',
    ],
  },
  'architecture-evidence': {
    operations: [
      'record-test',
      'retire-test',
      'record-observability',
      'record-execution',
      'retire-execution',
    ],
    usage:
      'pnpm planning:db:operate architecture-evidence <record-test|retire-test|record-observability|record-execution|retire-execution> --design <DESIGN-ID> --actor <actor>',
    details: [
      'RecordArchitectureTestEvidence attaches required test evidence to a scoped architecture component.',
      'Requires --test-path, --test-kind, --coverage-level, --validation-command, --source-ref, and --source-content-sha256.',
      'RecordArchitectureObservabilityEvidence attaches observability evidence to a scoped architecture component.',
      'Requires --observability, --signal-name, --signal-kind, --status, --source-ref, and --source-content-sha256.',
      'RecordArchitectureEvidenceExecution records a local or CI execution against an exact must-prove subject.',
      'Requires --evidence, --subject-kind, --subject, --evidence-kind, --origin, --result, --source-ref, --source-path, and --source-content-sha256.',
      'ci_execution is post-completion evidence: --source-ref must identify a concrete GitHub Actions job for the canonical repository and current commit, verified through the GitHub API.',
      'RetireArchitectureTestEvidence and RetireArchitectureEvidenceExecution remove stale current authority under exact may-delete design scope and preserve an audited operation.',
    ],
  },
  'docs-disposition': {
    operations: ['resolve'],
    usage:
      'pnpm planning:db:operate docs-disposition resolve --kind <kind> --path <path> --actor <actor> --reason <reason>',
    details: [
      'ResolveDocsDispositionQueue records source-hash guarded disposition for planning document findings.',
      'Use --resolution resolved|accepted|ignored|linked to choose the durable disposition.',
    ],
  },
  'feature-mechanization': {
    operations: ['record', 'retire'],
    usage:
      'pnpm planning:db:operate feature-mechanization <record|retire> --feature <FEATURE-ID> --rail <RailName> --type <command|query> --actor <actor>',
    details: [
      'RecordFeatureMechanizationRail stores a database command/query rail declaration and a valid feature-mechanization manifest projection without editing Markdown manifests.',
      'Explicit replace flags hard-cut inherited implementation refs or architecture guards with audited idempotency.',
      'Requires --ddd-owner, --implementation-plan, --source-ref, --source-content-sha256, governance/doc/surface/validation fields, and at least one --implementation-ref in path#symbol form.',
      'RetireFeatureMechanizationRail deletes one stale local rail under exact may-delete design scope, expected revision, and audited provenance.',
    ],
  },
  'fowler-analysis': {
    operations: [
      'record-disposition',
      'link-canonical-target',
      'resolve-reference',
      'approve-retirement',
    ],
    usage:
      'pnpm planning:db:operate fowler-analysis <record-disposition|link-canonical-target|resolve-reference|approve-retirement> --path <buzon/file.md> --actor <actor>',
    details: [
      'Fowler analysis commands write DB-owned retirement facts; Markdown files are not the source of truth.',
      'Retirement approval is only effective when the DB retirement query also proves no live references, accepted canonical target, accepted disposition, and no open improvements.',
    ],
  },
  'governance-refresh': {
    operations: ['record-run'],
    usage:
      'pnpm planning:db:operate governance-refresh record-run --run <RUN-ID> --state <accepted|passed|failed> --actor <actor>',
    details: [
      'GovernanceRefresh records the refresh run state in Planning DB before generated/exported surfaces are treated as evidence.',
      'Requires --source-ref, --source-content-sha256, --max-passes, and --generation-passes.',
    ],
  },
  'governed-source': {
    operations: ['refresh'],
    usage:
      'pnpm planning:db:operate governed-source refresh --path <repo-relative-path> --actor <actor>',
    details: [
      'RefreshGovernedSourceContent records exact clean HEAD content identity for existing governed files.',
      'It does not import architecture, mutate ownership, or generate human documentation.',
    ],
  },
});

function isHelpCommand(value) {
  return value === 'help' || value === '--help' || value === '-h';
}

function isHelpFlag(value) {
  return value === '--help' || value === '-h';
}

function unknownOperationMessage() {
  return 'Unknown planning DB operation. Expected "component", "db-surface", "architecture-design", "architecture-component", "architecture-relation", "architecture-contract", "architecture-port", "architecture-storage-io", "architecture-fitness", "architecture-evidence", "docs-disposition", "feature-mechanization", "fowler-analysis", "governance-refresh", or "governed-source".';
}

function buildPlanningDbOperateHelpText(resource, action) {
  if (!resource) {
    return [
      'Planning DB operate CLI',
      '',
      'Usage:',
      '  pnpm planning:db:operate <resource> <operation> [--flag value]',
      '  pnpm planning:db:operate --help',
      '  pnpm planning:db:operate <resource> --help',
      '  pnpm planning:db:operate <resource> <operation> --help',
      '',
      'Resources:',
      `  ${Object.keys(operationHelp).join(', ')}`,
      '',
      'Examples:',
      '  pnpm planning:db:operate component create --component SYS-WEB-EXAMPLE --parent SYS-WEB-ROOT --actor codex',
    ].join('\n');
  }

  const resourceHelp = operationHelp[resource];
  if (!resourceHelp) {
    throw new Error(unknownOperationMessage());
  }

  if (action) {
    if (!resourceHelp.operations.includes(action)) {
      throw new Error(
        `Unknown ${resource} operation "${action}". Expected ${resourceHelp.operations.join(', ')}.`
      );
    }

    return [
      `Planning DB operate: ${resource} ${action}`,
      '',
      'Usage:',
      `  ${resourceHelp.usage}`,
      `  pnpm planning:db:operate ${resource} ${action} --help`,
      '',
      'Notes:',
      ...resourceHelp.details.map((detail) => `  ${detail}`),
    ].join('\n');
  }

  return [
    `Planning DB operate resource: ${resource}`,
    '',
    'Usage:',
    `  ${resourceHelp.usage}`,
    `  pnpm planning:db:operate ${resource} --help`,
    '',
    'Operations:',
    `  ${resourceHelp.operations.length > 0 ? resourceHelp.operations.join(', ') : '(none)'}`,
    '',
    'Notes:',
    ...resourceHelp.details.map((detail) => `  ${detail}`),
  ].join('\n');
}

function resolveOperateHelpRequest(args) {
  const [resource, action, ...rest] = args;
  if (resource === undefined) {
    return null;
  }

  if (isHelpCommand(resource)) {
    if (resource === 'help' && action) {
      return buildPlanningDbOperateHelpText(action, rest[0]);
    }
    return buildPlanningDbOperateHelpText();
  }

  if (isHelpFlag(action)) {
    return buildPlanningDbOperateHelpText(resource);
  }

  if (rest.some(isHelpFlag)) {
    const resourceHelp = operationHelp[resource];
    if (resourceHelp?.operations.length === 0) {
      return buildPlanningDbOperateHelpText(resource);
    }
    return buildPlanningDbOperateHelpText(resource, action);
  }

  return null;
}

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

function validateFowlerAnalysisDispositionStatus(value) {
  if (!allowedFowlerAnalysisDispositionStatuses.has(value)) {
    throw new Error(
      `Invalid Fowler analysis disposition status "${value}". Expected: ${[
        ...allowedFowlerAnalysisDispositionStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFowlerAnalysisCanonicalTargetStatus(value) {
  if (!allowedFowlerAnalysisCanonicalTargetStatuses.has(value)) {
    throw new Error(
      `Invalid Fowler analysis canonical target status "${value}". Expected: ${[
        ...allowedFowlerAnalysisCanonicalTargetStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFowlerAnalysisReferenceResolutionStatus(value) {
  if (!allowedFowlerAnalysisReferenceResolutionStatuses.has(value)) {
    throw new Error(
      `Invalid Fowler analysis reference resolution status "${value}". Expected: ${[
        ...allowedFowlerAnalysisReferenceResolutionStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateFowlerAnalysisRetirementDecisionStatus(value) {
  if (!allowedFowlerAnalysisRetirementDecisionStatuses.has(value)) {
    throw new Error(
      `Invalid Fowler analysis retirement decision status "${value}". Expected: ${[
        ...allowedFowlerAnalysisRetirementDecisionStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateDbSurfaceAuthorityMode(value) {
  if (!allowedDbSurfaceAuthorityModes.has(value)) {
    throw new Error(
      `Invalid DB surface authority mode "${value}". Expected: ${[
        ...allowedDbSurfaceAuthorityModes,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateDbSurfaceWriteRailKind(value) {
  if (!allowedDbSurfaceWriteRailKinds.has(value)) {
    throw new Error(
      `Invalid DB surface write rail kind "${value}". Expected: ${[
        ...allowedDbSurfaceWriteRailKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

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
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --design "${value}". Expected an alphanumeric kebab-case architecture design id.`
    );
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

function validateArchitectureContractId(value) {
  const normalized = String(value || '').trim();
  if (!/^CONTRACT-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --contract "${value}". Expected an uppercase CONTRACT-* architecture contract id.`
    );
  }

  return normalized;
}

function validateArchitecturePortId(value) {
  const normalized = String(value || '').trim();
  if (!/^PORT-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --port "${value}". Expected an uppercase PORT-* architecture port id.`
    );
  }

  return normalized;
}

function validateArchitectureStorageIoId(value) {
  const normalized = String(value || '').trim();
  if (!/^STORAGE-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `ARCH-STORAGE-IO-ID-INVALID: invalid --storage-io "${value}". Expected an uppercase STORAGE-* architecture storage I/O id.`
    );
  }

  return normalized;
}

function validateArchitectureFitnessScanId(value) {
  const normalized = String(value || '').trim();
  if (!/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/.test(normalized)) {
    throw new Error(`Invalid --scan "${value}". Expected a stable architecture fitness scan id.`);
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

function validateArchitectureRelationRecordStatus(value) {
  if (!allowedArchitectureRelationRecordStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureRelation stores statuses accepted by architecture.component_relation: ${[
        ...allowedArchitectureRelationRecordStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

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

function validateArchitectureContractKind(value) {
  if (!allowedArchitectureContractKinds.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid contract kind "${value}". Expected: ${[
        ...allowedArchitectureContractKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureContractCompatibility(value) {
  if (!allowedArchitectureContractCompatibilities.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid contract compatibility "${value}". Expected: ${[
        ...allowedArchitectureContractCompatibilities,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureContractStatus(value) {
  if (!allowedArchitectureContractStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitectureContract stores statuses accepted by architecture.contract: ${[
        ...allowedArchitectureContractStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitecturePortKind(value) {
  if (!allowedArchitecturePortKinds.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid port kind "${value}". Expected: ${[
        ...allowedArchitecturePortKinds,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitecturePortDirection(value) {
  if (!allowedArchitecturePortDirections.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: invalid port direction "${value}". Expected: ${[
        ...allowedArchitecturePortDirections,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitecturePortStatus(value) {
  if (!allowedArchitecturePortStatuses.has(value)) {
    throw new Error(
      `ARCH-COMPONENT-TAXONOMY-INVALID: RecordArchitecturePort stores statuses accepted by architecture.component_port: ${[
        ...allowedArchitecturePortStatuses,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureStorageIoDirection(value) {
  if (!allowedArchitectureStorageIoDirections.has(value)) {
    throw new Error(
      `ARCH-STORAGE-IO-DIRECTION-INVALID: invalid direction "${value}". Expected: ${[
        ...allowedArchitectureStorageIoDirections,
      ].join(', ')}.`
    );
  }

  return value;
}

function validateArchitectureStorageIoAccessPattern(value) {
  if (!allowedArchitectureStorageIoAccessPatterns.has(value)) {
    throw new Error(
      `ARCH-STORAGE-IO-ACCESS-PATTERN-INVALID: invalid access pattern "${value}". Expected: ${[
        ...allowedArchitectureStorageIoAccessPatterns,
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
    if (
      key === 'evidence' ||
      componentListOptionKeys.has(key) ||
      featureMechanizationListOptionKeys.has(key) ||
      architectureListOptionKeys.has(key)
    ) {
      options[camelKey] = options[camelKey] || [];
      options[camelKey].push(value);
      continue;
    }

    options[camelKey] = value;
  }

  return options;
}

function operationPayload(command) {
  if (command.kind === 'docs_disposition_resolve') {
    return {
      resolutionScope: command.resolutionScope,
      issueKind: command.issueKind,
      documentPath: normalizeOptionalText(command.documentPath),
      referenceText: normalizeOptionalText(command.referenceText),
      resolutionStatus: command.resolutionStatus,
      reason: command.reason,
    };
  }

  if (command.kind === 'fowler_analysis_disposition_record') {
    return {
      documentPath: command.documentPath,
      dispositionStatus: command.dispositionStatus,
      dispositionKind: command.dispositionKind,
      canonicalTargetPath: normalizeOptionalText(command.canonicalTargetPath),
      reason: command.reason,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'fowler_analysis_canonical_target_link') {
    return {
      documentPath: command.documentPath,
      targetPath: command.targetPath,
      targetKind: command.targetKind,
      targetStatus: command.targetStatus,
      reason: command.reason,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'fowler_analysis_reference_resolve') {
    return {
      documentPath: command.documentPath,
      referencePath: command.referencePath,
      relationType: command.relationType,
      resolutionStatus: command.resolutionStatus,
      canonicalTargetPath: normalizeOptionalText(command.canonicalTargetPath),
      reason: command.reason,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'fowler_analysis_retirement_approve') {
    return {
      documentPath: command.documentPath,
      decisionStatus: command.decisionStatus,
      reason: command.reason,
      sourceContentSha256: command.sourceContentSha256,
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

  if (command.kind === 'architecture_design_transition') {
    return {
      designId: command.designId,
      fromStatus: command.fromStatus,
      toStatus: command.toStatus,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
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

  if (command.kind === 'architecture_component_responsibility_retire') {
    return {
      designId: command.designId,
      componentId: command.componentId,
      responsibilityId: command.responsibilityId,
      reason: command.reason,
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

  if (command.kind === 'architecture_contract_record') {
    return {
      designId: command.designId,
      contractId: command.contractId,
      contractKind: command.contractKind,
      ownerComponentId: command.ownerComponentId,
      contractRef: command.contractRef,
      compatibility: command.compatibility,
      status: command.status,
      validationCommand: command.validationCommand,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_port_record') {
    return {
      designId: command.designId,
      portId: command.portId,
      componentId: command.componentId,
      portName: command.portName,
      portKind: command.portKind,
      direction: command.direction,
      inputContractId: normalizeOptionalText(command.inputContractId),
      outputContractId: normalizeOptionalText(command.outputContractId),
      negativeTests: command.negativeTests || [],
      status: command.status,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_storage_io_record') {
    return {
      designId: command.designId,
      storageIoId: command.storageIoId,
      componentId: command.componentId,
      expectedStorageObject: command.expectedStorageObject,
      storageObject: command.storageObject,
      direction: command.direction,
      accessPattern: command.accessPattern,
      contractId: normalizeOptionalText(command.contractId),
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_fitness_scan') {
    return {
      designId: command.designId,
      scanId: command.scanId,
      root: command.root,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_test_record') {
    return {
      designId: command.designId,
      testId: command.testId,
      componentId: command.componentId,
      testPath: command.testPath,
      testKind: command.testKind,
      coverageLevel: command.coverageLevel,
      required: command.required,
      validationCommand: command.validationCommand,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_test_retire') {
    return {
      designId: command.designId,
      testId: command.testId,
      componentId: command.componentId,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_observability_record') {
    return {
      designId: command.designId,
      observabilityId: command.observabilityId,
      componentId: command.componentId,
      signalName: command.signalName,
      signalKind: command.signalKind,
      required: command.required,
      status: command.status,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_evidence_record') {
    return {
      designId: command.designId,
      evidenceId: command.evidenceId,
      subjectKind: command.subjectKind,
      subjectId: command.subjectId,
      evidenceKind: command.evidenceKind,
      evidenceOrigin: command.evidenceOrigin,
      resultState: command.resultState,
      sourceRef: command.sourceRef,
      sourcePath: command.sourcePath,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'architecture_evidence_retire') {
    return {
      designId: command.designId,
      evidenceId: command.evidenceId,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
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

  if (command.kind === 'component_reparent') {
    return {
      componentId: command.componentId,
      parentComponentId: command.parentComponentId,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'component_revise') {
    return {
      designId: command.designId,
      componentId: command.componentId,
      status: command.status,
      childrenRequired: command.childrenRequired,
      ownedConcern: command.ownedConcern,
      addOwns: command.addOwns || [],
      removeOwns: command.removeOwns || [],
      addExcludes: command.addExcludes || [],
      removeExcludes: command.removeExcludes || [],
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'db_surface_upsert') {
    return {
      surfaceName: command.surfaceName,
      canonicalSource: command.canonicalSource,
      writeRail: command.writeRail,
      writeRailKind: command.writeRailKind,
      readQueryRail: command.readQueryRail,
      projection: command.projection,
      validation: command.validation,
      authorityMode: command.authorityMode,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'feature_mechanization_rail_record') {
    return {
      featureId: command.featureId,
      railName: command.railName,
      normalizedRailName: command.normalizedRailName,
      railType: command.railType,
      dddOwner: command.dddOwner,
      applicationPort: command.applicationPort,
      adapterSurface: command.adapterSurface,
      authorizationScope: command.authorizationScope,
      negativeTests: command.negativeTests || [],
      mechanizationStatus: command.mechanizationStatus,
      railStatus: command.railStatus,
      implementationRefs: command.implementationRefs || [],
      documentationRefs: command.documentationRefs || [],
      implementationPlan: command.implementationPlan,
      componentGuides: command.componentGuides || [],
      userStories: command.userStories || [],
      governingSources: command.governingSources || [],
      allowedImplementationSurfaces: command.allowedImplementationSurfaces || [],
      forbiddenImplementationSurfaces: command.forbiddenImplementationSurfaces || [],
      domainObjects: command.domainObjects || [],
      fowlerSignals: command.fowlerSignals || [],
      architectureGuards: command.architectureGuards || [],
      cypressFlows: command.cypressFlows || [],
      completionGate: command.completionGate || [],
      unitTests: command.unitTests || [],
      redTest: command.redTest,
      expectedFailure: command.expectedFailure,
      patchSurfaces: command.patchSurfaces || [],
      greenTest: command.greenTest,
      replaceImplementationRefs: command.replaceImplementationRefs,
      replaceArchitectureGuards: command.replaceArchitectureGuards,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind === 'feature_mechanization_rail_retire') {
    return {
      designId: command.designId,
      featureId: command.featureId,
      railId: command.railId,
      railName: command.railName,
      normalizedRailName: command.normalizedRailName,
      railType: command.railType,
      expectedRevision: command.expectedRevision,
      reason: command.reason,
      sourceRef: command.sourceRef,
      sourceContentSha256: command.sourceContentSha256,
    };
  }

  if (command.kind && command.kind.startsWith('fowler_analysis_')) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.documentPath || 'no-document',
      command.targetPath || command.referencePath || 'no-subject',
      command.relationType || 'no-relation',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
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
  if (command.kind === 'docs_disposition_resolve') {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.resolutionScope,
      command.issueKind,
      command.documentPath || 'no-document',
      command.referenceText || 'no-reference',
      sha256HexUtf8(canonicalJson(docsResolutionIdempotencyPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'component_create' ||
    command.kind === 'component_revise' ||
    command.kind === 'component_reparent'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.componentId || 'all',
      command.expectedRevision ?? 'latest',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'architecture_design_create' ||
    command.kind === 'architecture_design_transition'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.designId || 'all',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'architecture_component_record' ||
    command.kind === 'architecture_component_responsibility_retire' ||
    command.kind === 'architecture_relation_record' ||
    command.kind === 'architecture_contract_record' ||
    command.kind === 'architecture_port_record' ||
    command.kind === 'architecture_storage_io_record' ||
    command.kind === 'architecture_fitness_scan' ||
    command.kind === 'architecture_test_record' ||
    command.kind === 'architecture_test_retire' ||
    command.kind === 'architecture_observability_record' ||
    command.kind === 'architecture_evidence_record' ||
    command.kind === 'architecture_evidence_retire'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.designId || 'no-design',
      command.storageIoId ||
        command.contractId ||
        command.portId ||
        command.responsibilityId ||
        command.componentId ||
        command.relationId ||
        command.scanId ||
        command.testId ||
        command.observabilityId ||
        command.evidenceId ||
        'no-subject',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (command.kind === 'db_surface_upsert') {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.surfaceName || 'all',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  if (
    command.kind === 'feature_mechanization_rail_record' ||
    command.kind === 'feature_mechanization_rail_retire'
  ) {
    return [
      command.kind,
      command.actor || 'anonymous',
      command.featureId || 'no-feature',
      command.railType || 'no-type',
      command.normalizedRailName || 'no-rail',
      command.expectedRevision ?? 'latest',
      sha256HexUtf8(canonicalJson(operationPayload(command))).slice(0, 16),
    ].join(':');
  }

  return [
    command.kind,
    command.actor || 'anonymous',
    command.expectedRevision ?? 'latest',
    sha256HexUtf8(JSON.stringify(operationPayload(command))).slice(0, 16),
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

function assertDbSurfaceIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.surface_name === command.surfaceName &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (existingSourceContentSha256 !== command.sourceContentSha256 || !sameOperation) {
    throw new Error(
      `DB-SURFACE-IDEMPOTENCY-MISMATCH: idempotency key "${command.idempotencyKey}" already belongs to a different DB surface operation.`
    );
  }
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

function assertFowlerAnalysisIdempotentReplayMatches(existingOperation, command) {
  const expectedPayload = operationPayload(command);
  const existingPayload = normalizeExistingPayload(existingOperation.payload);
  const existingSourceContentSha256 = normalizeOptionalText(
    existingOperation.source_content_sha256 ?? existingOperation.sourceContentSha256
  );
  const sameOperation =
    existingOperation.operation_type === command.kind &&
    existingOperation.actor === command.actor &&
    existingOperation.document_path === command.documentPath &&
    normalizeOptionalText(existingOperation.target_path) ===
      normalizeOptionalText(command.targetPath || command.canonicalTargetPath) &&
    normalizeOptionalText(existingOperation.reference_path) ===
      normalizeOptionalText(command.referencePath) &&
    normalizeOptionalText(existingOperation.relation_type) ===
      normalizeOptionalText(command.relationType) &&
    canonicalJson(existingPayload) === canonicalJson(expectedPayload);

  if (existingSourceContentSha256 !== command.sourceContentSha256 || !sameOperation) {
    throw new Error(
      `FOWLER-ANALYSIS-IDEMPOTENCY-MISMATCH: idempotency key "${command.idempotencyKey}" already belongs to a different Fowler analysis operation.`
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
  const options = parseFlagOptions(args);
  if (action === 'transition') {
    const { fromStatus, toStatus } = validateArchitectureDesignTransition(
      requireOption(options, 'fromStatus'),
      requireOption(options, 'toStatus')
    );
    const command = {
      kind: 'architecture_design_transition',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      fromStatus,
      toStatus,
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

  if (action !== 'create') {
    throw new Error(
      `Unknown architecture-design operation "${action}". Expected create or transition.`
    );
  }

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
    ...(command.addOwns || []),
    ...(command.removeOwns || []),
    ...(command.addExcludes || []),
    ...(command.removeExcludes || []),
  ].filter((value) => value !== null && value !== undefined);
  if (changes.length === 0) {
    throw new Error(
      `Governance component ${command.componentId} revise requires a status, children-required, or ownership delta.`
    );
  }

  for (const [label, additions, removals] of [
    ['owns', command.addOwns, command.removeOwns],
    ['excludes', command.addExcludes, command.removeExcludes],
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
      addOwns: normalizeListOption(options.addOwns),
      removeOwns: normalizeListOption(options.removeOwns),
      addExcludes: normalizeListOption(options.addExcludes),
      removeExcludes: normalizeListOption(options.removeExcludes),
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

function validateArchitectureResponsibilityId(value) {
  const normalized = String(value || '').trim();
  if (!/^RESP-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw new Error(
      `Invalid --responsibility "${value}". Expected an uppercase RESP-* architecture responsibility id.`
    );
  }

  return normalized;
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
  const options = parseFlagOptions(args);
  if (action === 'retire-responsibility') {
    const command = {
      kind: 'architecture_component_responsibility_retire',
      designId: validateArchitectureDesignId(requireOption(options, 'design')),
      componentId: validateArchitectureComponentId(
        requireOption(options, 'component'),
        'component'
      ),
      responsibilityId: validateArchitectureResponsibilityId(
        requireOption(options, 'responsibility')
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
      `Unknown architecture-component operation "${action}". Expected record or retire-responsibility.`
    );
  }

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
    status: validateArchitectureRelationRecordStatus(options.status || 'proposed'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureRelationRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function validateArchitectureContractRecordCommand(command) {
  const requiredTextFields = [
    ['contract', command.contractId],
    ['owner-component', command.ownerComponentId],
    ['contract-ref', command.contractRef],
    ['validation-command', command.validationCommand],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-CONTRACT-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  return command;
}

function parseArchitectureContractCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-contract operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'architecture_contract_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    contractId: validateArchitectureContractId(requireOption(options, 'contract')),
    contractKind: validateArchitectureContractKind(requireOption(options, 'kind')),
    ownerComponentId: validateArchitectureComponentId(
      requireOption(options, 'ownerComponent'),
      'owner-component'
    ),
    contractRef: requireOption(options, 'contractRef'),
    compatibility: validateArchitectureContractCompatibility(
      requireOption(options, 'compatibility')
    ),
    status: validateArchitectureContractStatus(options.status || 'proposed'),
    validationCommand: requireOption(options, 'validationCommand'),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureContractRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function validateArchitecturePortRecordCommand(command) {
  const requiredTextFields = [
    ['port', command.portId],
    ['component', command.componentId],
    ['name', command.portName],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-PORT-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (!command.inputContractId && !command.outputContractId) {
    throw new Error(
      'ARCH-PORT-CONTRACT-MISSING: RecordArchitecturePort requires --input-contract or --output-contract.'
    );
  }

  if (!command.negativeTests || command.negativeTests.length === 0) {
    throw new Error(
      'ARCH-PORT-NEGATIVE-TESTS-MISSING: RecordArchitecturePort requires at least one --negative-test.'
    );
  }

  return command;
}

function parseArchitecturePortCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-port operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const inputContractId = options.inputContract
    ? validateArchitectureContractId(options.inputContract)
    : null;
  const outputContractId = options.outputContract
    ? validateArchitectureContractId(options.outputContract)
    : null;
  const command = {
    kind: 'architecture_port_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    portId: validateArchitecturePortId(requireOption(options, 'port')),
    componentId: validateArchitectureComponentId(requireOption(options, 'component'), 'component'),
    portName: requireOption(options, 'name'),
    portKind: validateArchitecturePortKind(requireOption(options, 'kind')),
    direction: validateArchitecturePortDirection(requireOption(options, 'direction')),
    inputContractId,
    outputContractId,
    negativeTests: normalizeListOption(options.negativeTest),
    status: validateArchitecturePortStatus(options.status || 'proposed'),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitecturePortRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
}

function validateArchitectureStorageIoRecordCommand(command) {
  const requiredTextFields = [
    ['expected-storage-object', command.expectedStorageObject],
    ['storage-object', command.storageObject],
    ['source-ref', command.sourceRef],
  ];
  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`ARCH-STORAGE-IO-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (command.expectedStorageObject === command.storageObject) {
    throw new Error(
      'ARCH-STORAGE-IO-NOOP: expected and replacement storage objects are identical.'
    );
  }

  return command;
}

function parseArchitectureStorageIoCommand(action, args) {
  if (action !== 'record') {
    throw new Error(`Unknown architecture-storage-io operation "${action}". Expected record.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'architecture_storage_io_record',
    designId: validateArchitectureDesignId(requireOption(options, 'design')),
    storageIoId: validateArchitectureStorageIoId(requireOption(options, 'storageIo')),
    componentId: validateArchitectureComponentId(requireOption(options, 'component'), 'component'),
    expectedStorageObject: requireOption(options, 'expectedStorageObject'),
    storageObject: requireOption(options, 'storageObject'),
    direction: validateArchitectureStorageIoDirection(requireOption(options, 'direction')),
    accessPattern: validateArchitectureStorageIoAccessPattern(
      requireOption(options, 'accessPattern')
    ),
    contractId: options.contract ? validateArchitectureContractId(options.contract) : null,
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateArchitectureStorageIoRecordCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
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

function normalizeGitHubRepositorySlug(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/\.git$/u, '')
    .replace(/\/$/u, '');
  const match =
    normalized.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u) ||
    normalized.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u) ||
    normalized.match(/^git@github\.com:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u) ||
    normalized.match(/^ssh:\/\/git@github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u);
  if (!match) {
    throw new Error(`cannot resolve canonical GitHub repository from ${normalized || 'empty'}`);
  }
  return match[1];
}

function readGitValue(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.repoRoot || __dirname,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      String(result.stderr || result.stdout).trim() || `git ${args.join(' ')} failed`
    );
  }
  return String(result.stdout).trim();
}

function readGitFileAtCommit(commitSha, filePath, options = {}) {
  if (typeof options.readGitFileAtCommit === 'function') {
    const content = options.readGitFileAtCommit(commitSha, filePath);
    return Buffer.isBuffer(content) ? content : Buffer.from(content);
  }
  const result = spawnSync('git', ['show', `${commitSha}:${filePath}`], {
    cwd: options.repoRoot || __dirname,
    encoding: null,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      String(result.stderr || result.stdout).trim() || `git show ${commitSha}:${filePath} failed`
    );
  }
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || '');
}

async function readGitHubActionsEvidence(url, options = {}) {
  const fetchImplementation = options.fetch || globalThis.fetch;
  if (typeof fetchImplementation !== 'function') {
    throw new Error('GitHub API fetch is unavailable');
  }
  const environment = options.environment || process.env;
  const token = options.githubToken || environment.GITHUB_TOKEN || environment.GH_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'dvt-planning-db-evidence-verifier',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImplementation(url, { headers });
  if (!response?.ok) {
    throw new Error(`GitHub API ${url} returned HTTP ${response?.status ?? 'unknown'}`);
  }
  return response.json();
}

async function assertArchitectureEvidenceOriginAuthenticity(command, options = {}) {
  if (command.evidenceOrigin !== 'ci_execution') {
    return command;
  }
  try {
    const sourceMatch = command.sourceRef.match(
      /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/actions\/runs\/([1-9]\d*)\/job\/([1-9]\d*)$/u
    );
    if (!sourceMatch) {
      throw new Error('source-ref must identify one concrete GitHub Actions job');
    }
    if (command.evidenceKind !== 'ci') {
      throw new Error('ci_execution requires evidence-kind=ci');
    }

    const sourceRepositorySlug = `${sourceMatch[1]}/${sourceMatch[2]}`;
    const canonicalRepositorySlug = normalizeGitHubRepositorySlug(
      options.repositorySlug || readGitValue(['remote', 'get-url', 'origin'], options)
    );
    if (sourceRepositorySlug.toLowerCase() !== canonicalRepositorySlug.toLowerCase()) {
      throw new Error(
        `source repository ${sourceRepositorySlug} is not canonical repository ${canonicalRepositorySlug}`
      );
    }

    const currentGitSha = String(
      options.currentGitSha || readGitValue(['rev-parse', 'HEAD'], options)
    )
      .trim()
      .toLowerCase();
    if (!/^[a-f0-9]{40}$/u.test(currentGitSha)) {
      throw new Error(`current commit ${currentGitSha || 'empty'} is not a full Git SHA`);
    }

    const runId = Number(sourceMatch[3]);
    const jobId = Number(sourceMatch[4]);
    const apiRepositorySlug = canonicalRepositorySlug
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const [run, job] = await Promise.all([
      readGitHubActionsEvidence(
        `https://api.github.com/repos/${apiRepositorySlug}/actions/runs/${runId}`,
        options
      ),
      readGitHubActionsEvidence(
        `https://api.github.com/repos/${apiRepositorySlug}/actions/jobs/${jobId}`,
        options
      ),
    ]);
    if (
      Number(run.id) !== runId ||
      String(run.repository?.full_name || '').toLowerCase() !==
        canonicalRepositorySlug.toLowerCase() ||
      run.html_url !== `https://github.com/${sourceRepositorySlug}/actions/runs/${runId}`
    ) {
      throw new Error('GitHub API run identity does not match source-ref and repository');
    }
    if (
      Number(job.id) !== jobId ||
      Number(job.run_id) !== runId ||
      job.html_url !== command.sourceRef ||
      !normalizeOptionalText(job.name)
    ) {
      throw new Error('GitHub API job identity does not match source-ref and run');
    }
    if (run.status !== 'completed' || job.status !== 'completed') {
      throw new Error('GitHub Actions run and job must both be completed');
    }
    if (
      command.resultState === 'pass' &&
      (run.conclusion !== 'success' || job.conclusion !== 'success')
    ) {
      throw new Error('pass evidence requires a successful completed job and run');
    }
    if (command.resultState === 'fail' && job.conclusion === 'success') {
      throw new Error('fail evidence requires a non-successful completed job');
    }
    if (
      String(run.head_sha || '').toLowerCase() !== currentGitSha ||
      String(job.head_sha || '').toLowerCase() !== currentGitSha
    ) {
      throw new Error('GitHub Actions evidence does not prove the current commit');
    }
    const committedSourceSha256 = sha256(
      readGitFileAtCommit(currentGitSha, command.sourcePath, options)
    );
    if (committedSourceSha256 !== command.sourceContentSha256) {
      throw new Error(
        `source bytes at the proven commit hash to ${committedSourceSha256}, not ${command.sourceContentSha256}`
      );
    }
    if (command.subjectKind === 'command' || command.subjectKind === 'query') {
      const subjectImplementation = options.subjectImplementation;
      if (
        !subjectImplementation ||
        !Array.isArray(subjectImplementation.implementation_files) ||
        subjectImplementation.implementation_files.length === 0 ||
        !subjectImplementation.rail_source_path ||
        !subjectImplementation.rail_source_content_sha256
      ) {
        throw new Error(
          `canonical implementation inputs are missing for ${command.subjectKind} ${command.subjectId}`
        );
      }
      const implementationInputs = new Map([
        [subjectImplementation.rail_source_path, subjectImplementation.rail_source_content_sha256],
        ...subjectImplementation.implementation_files.map((implementationFile) => [
          implementationFile.implementation_path,
          implementationFile.implementation_content_hash,
        ]),
      ]);
      for (const [implementationPath, expectedHash] of implementationInputs) {
        const committedImplementationSha256 = sha256(
          readGitFileAtCommit(currentGitSha, implementationPath, options)
        );
        if (committedImplementationSha256 !== expectedHash) {
          throw new Error(
            `implementation bytes at the proven commit for ${implementationPath} hash to ${committedImplementationSha256}, not ${expectedHash}`
          );
        }
      }
    }
    return command;
  } catch (error) {
    throw new Error(
      `ARCH-EVIDENCE-CI-ORIGIN-UNVERIFIED: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
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
      componentId: validateArchitectureComponentId(
        requireOption(options, 'component'),
        'component'
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
      componentId: validateArchitectureComponentId(
        requireOption(options, 'component'),
        'component'
      ),
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
    componentId: validateArchitectureComponentId(requireOption(options, 'component'), 'component'),
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

function validateDbSurfaceUpsertCommand(command) {
  const requiredTextFields = [
    ['surface', command.surfaceName],
    ['canonical-source', command.canonicalSource],
    ['write-rail', command.writeRail],
    ['write-rail-kind', command.writeRailKind],
    ['read-query-rail', command.readQueryRail],
    ['projection', command.projection],
    ['validation', command.validation],
    ['authority-mode', command.authorityMode],
    ['source-ref', command.sourceRef],
    ['source-content-sha256', command.sourceContentSha256],
    ['actor', command.actor],
  ];

  for (const [field, value] of requiredTextFields) {
    if (!normalizeOptionalText(value)) {
      throw new Error(`DB-SURFACE-SEMANTICS-MISSING: missing required --${field}.`);
    }
  }

  if (command.authorityMode === 'database' && command.writeRailKind !== 'db_command') {
    throw new Error(
      `DATABASE-AUTHORITY-WRITE-RAIL-MISMATCH: database surface "${command.surfaceName}" requires write rail kind db_command.`
    );
  }

  return command;
}

function parseDbSurfaceCommand(action, args) {
  if (action !== 'upsert') {
    throw new Error(`Unknown db-surface operation "${action}". Expected upsert.`);
  }

  const options = parseFlagOptions(args);
  const command = {
    kind: 'db_surface_upsert',
    surfaceName: requireOption(options, 'surface'),
    canonicalSource: requireOption(options, 'canonicalSource'),
    writeRail: requireOption(options, 'writeRail'),
    writeRailKind: validateDbSurfaceWriteRailKind(requireOption(options, 'writeRailKind')),
    readQueryRail: requireOption(options, 'readQueryRail'),
    projection: requireOption(options, 'projection'),
    validation: requireOption(options, 'validation'),
    authorityMode: validateDbSurfaceAuthorityMode(requireOption(options, 'authorityMode')),
    sourceRef: requireOption(options, 'sourceRef'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    actor: requireOption(options, 'actor'),
    idempotencyKey: options.idempotencyKey,
  };

  validateDbSurfaceUpsertCommand(command);
  return { ...command, idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command) };
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
    ['implementation-ref', command.implementationRefs],
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

  if (!command.implementationRefs.some((implementationRef) => implementationRef.includes('#'))) {
    throw new Error(
      'RecordFeatureMechanizationRail requires at least one --implementation-ref in path#symbol form.'
    );
  }

  return command;
}

function parseFeatureMechanizationCommand(action, args) {
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
    greenTest: requireOption(options, 'greenTest'),
    replaceImplementationRefs:
      parseBooleanOption(options.replaceImplementationRefs, 'replace-implementation-refs') ?? false,
    replaceArchitectureGuards:
      parseBooleanOption(options.replaceArchitectureGuards, 'replace-architecture-guards') ?? false,
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

function parseFowlerAnalysisCommand(action, args) {
  const options = parseFlagOptions(args);
  const baseCommand = {
    documentPath: requireOption(options, 'path'),
    actor: requireOption(options, 'actor'),
    reason: requireOption(options, 'reason'),
    sourceContentSha256: validateSha256(
      requireOption(options, 'sourceContentSha256'),
      'source-content-sha256'
    ),
    idempotencyKey: options.idempotencyKey,
  };

  if (action === 'record-disposition') {
    const command = {
      kind: 'fowler_analysis_disposition_record',
      ...baseCommand,
      dispositionStatus: validateFowlerAnalysisDispositionStatus(options.status || 'accepted'),
      dispositionKind: options.kind || 'canonicalized',
      canonicalTargetPath: normalizeOptionalText(options.target),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command),
    };
  }

  if (action === 'link-canonical-target') {
    const command = {
      kind: 'fowler_analysis_canonical_target_link',
      ...baseCommand,
      targetPath: requireOption(options, 'target'),
      targetKind: options.targetKind || 'canonical_document',
      targetStatus: validateFowlerAnalysisCanonicalTargetStatus(options.status || 'accepted'),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command),
    };
  }

  if (action === 'resolve-reference') {
    const command = {
      kind: 'fowler_analysis_reference_resolve',
      ...baseCommand,
      referencePath: requireOption(options, 'reference'),
      relationType: requireOption(options, 'relation'),
      resolutionStatus: validateFowlerAnalysisReferenceResolutionStatus(
        options.resolution || 'resolved'
      ),
      canonicalTargetPath: normalizeOptionalText(options.target),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command),
    };
  }

  if (action === 'approve-retirement') {
    const command = {
      kind: 'fowler_analysis_retirement_approve',
      ...baseCommand,
      decisionStatus: validateFowlerAnalysisRetirementDecisionStatus(
        options.decision || 'approved'
      ),
    };

    return {
      ...command,
      idempotencyKey: command.idempotencyKey || defaultIdempotencyKey(command),
    };
  }

  throw new Error(
    `Unknown fowler-analysis operation "${action}". Expected record-disposition, link-canonical-target, resolve-reference, or approve-retirement.`
  );
}

const parseGovernanceRefreshCommand = createGovernanceRefreshCommandParser({
  normalizeOptionalText,
  parseBooleanOption,
  parseFlagOptions,
  parseIntegerOption,
  requireOption,
});
const parseGovernedSourceRefreshCommand = createGovernedSourceRefreshCommandParser({
  normalizeOptionalText,
  parseFlagOptions,
  requireOption,
});

function parseArgs(args = process.argv.slice(2)) {
  const helpText = resolveOperateHelpRequest(args);
  if (helpText) {
    return { kind: 'help', helpText };
  }

  const [resource, action, ...rest] = args;

  if (resource === 'task' || resource === 'task-gap' || resource === 'audit') {
    throw new Error(
      'Planning task lifecycle, gaps, and audit are owned by GitHub Issues; the local task rails are retired.'
    );
  }

  if (resource === 'component') {
    if (!action) {
      throw new Error('Missing component operation. Expected create.');
    }

    return parseComponentCommand(action, rest);
  }

  if (resource === 'db-surface') {
    if (!action) {
      throw new Error('Missing db-surface operation. Expected upsert.');
    }

    return parseDbSurfaceCommand(action, rest);
  }

  if (resource === 'architecture-design') {
    if (!action) {
      throw new Error('Missing architecture-design operation. Expected create or transition.');
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

  if (resource === 'architecture-contract') {
    if (!action) {
      throw new Error('Missing architecture-contract operation. Expected record.');
    }

    return parseArchitectureContractCommand(action, rest);
  }

  if (resource === 'architecture-port') {
    if (!action) {
      throw new Error('Missing architecture-port operation. Expected record.');
    }

    return parseArchitecturePortCommand(action, rest);
  }

  if (resource === 'architecture-storage-io') {
    if (!action) {
      throw new Error('Missing architecture-storage-io operation. Expected record.');
    }

    return parseArchitectureStorageIoCommand(action, rest);
  }

  if (resource === 'architecture-fitness') {
    if (!action) {
      throw new Error('Missing architecture-fitness operation. Expected scan.');
    }

    return parseArchitectureFitnessCommand(action, rest);
  }

  if (resource === 'architecture-evidence') {
    if (!action) {
      throw new Error(
        'Missing architecture-evidence operation. Expected record-test, retire-test, record-observability, record-execution, or retire-execution.'
      );
    }

    return parseArchitectureEvidenceCommand(action, rest);
  }

  if (resource === 'feature-mechanization') {
    if (!action) {
      throw new Error('Missing feature-mechanization operation. Expected record.');
    }

    return parseFeatureMechanizationCommand(action, rest);
  }

  if (resource === 'fowler-analysis') {
    if (!action) {
      throw new Error(
        'Missing fowler-analysis operation. Expected record-disposition, link-canonical-target, resolve-reference, or approve-retirement.'
      );
    }

    return parseFowlerAnalysisCommand(action, rest);
  }

  if (resource === 'governance-refresh') {
    if (!action) {
      throw new Error('Missing governance-refresh operation. Expected record-run.');
    }

    return parseGovernanceRefreshCommand(action, rest);
  }

  if (resource === 'governed-source') {
    if (!action) {
      throw new Error('Missing governed-source operation. Expected refresh.');
    }
    return parseGovernedSourceRefreshCommand(action, rest);
  }

  if (resource === 'docs-disposition') {
    if (!action) {
      throw new Error('Missing docs-disposition operation. Expected resolve.');
    }

    return parseDocsResolutionCommand(action, rest);
  }

  throw new Error(unknownOperationMessage());
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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

function normalizeArchitectureComponent(row) {
  if (!row) {
    return null;
  }

  return {
    componentId: row.component_id ?? row.componentId,
    maturityScore: row.maturity_score ?? row.maturityScore ?? null,
    createdAt: row.created_at ?? row.createdAt,
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

function normalizeArchitectureContract(row) {
  if (!row) {
    return null;
  }

  return {
    contractId: row.contract_id ?? row.contractId,
  };
}

function normalizeArchitecturePort(row) {
  if (!row) {
    return null;
  }

  return {
    portId: row.port_id ?? row.portId,
  };
}

function normalizeArchitectureStorageIo(row) {
  if (!row) {
    return null;
  }

  return {
    storageIoId: row.storage_io_id ?? row.storageIoId,
    componentId: row.component_id ?? row.componentId,
    storageObject: row.storage_object ?? row.storageObject,
    direction: row.direction,
    accessPattern: row.access_pattern ?? row.accessPattern,
    contractId: row.contract_id ?? row.contractId ?? null,
    createdAt: row.created_at ?? row.createdAt,
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

function planArchitectureDesignTransitionOperation({
  command,
  existingDesign,
  implementationViolations = [],
  operationId,
  now,
}) {
  const existing = normalizeArchitectureDesign(existingDesign);
  if (!existing) {
    throw new Error(
      `ARCH-DESIGN-NOT-FOUND: architecture design ${command.designId} does not exist.`
    );
  }
  if (existing.status !== command.fromStatus) {
    throw new Error(
      `ARCH-DESIGN-TRANSITION-CONFLICT: expected ${command.designId} in ${command.fromStatus}, found ${existing.status}.`
    );
  }
  validateArchitectureDesignTransition(command.fromStatus, command.toStatus);
  if (
    command.toStatus === 'implemented' &&
    implementationViolations.some(
      (violation) =>
        (violation.violation_kind ?? violation.violationKind) === 'required_evidence_missing' &&
        violation.severity === 'blocker'
    )
  ) {
    const subjects = implementationViolations
      .map(
        (violation) =>
          `${violation.subject_kind ?? violation.subjectKind}:${violation.subject_id ?? violation.subjectId}`
      )
      .join(', ');
    throw new Error(
      `ARCH-DESIGN-IMPLEMENTATION-EVIDENCE-MISSING: ${command.designId} cannot become implemented while required proof is invalid for ${subjects}.`
    );
  }

  const updatedAt = toIso(now);
  const transition = {
    designId: command.designId,
    fromStatus: command.fromStatus,
    toStatus: command.toStatus,
    reason: command.reason,
    approvedAt:
      command.toStatus === 'approved' ? existing.approvedAt || updatedAt : existing.approvedAt,
    updatedAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { transition, audit };
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

  const updatedAt = toIso(now);
  const createdAt = existing?.createdAt ?? updatedAt;
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
    maturityScore: existing?.maturityScore ?? null,
    parentComponentId: command.parentComponentId,
    createdAt,
    updatedAt,
  };
  const responsibilities = command.responsibilities.map((responsibility) => ({
    ...responsibility,
    componentId: command.componentId,
    status: ['approved', 'implemented', 'drift'].includes(command.status)
      ? command.status
      : 'proposed',
    createdAt,
  }));
  const audit = architectureScopedAudit({ command, operationId, now });

  return { component, responsibilities, audit };
}

function planArchitectureComponentResponsibilityRetireOperation({
  command,
  design,
  designScopes,
  existingResponsibility,
  operationId,
  now,
}) {
  assertArchitectureDesignMayImplement(design, command);
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_update'],
    'ARCH-COMPONENT-DESIGN-SCOPE-MISSING'
  );
  if (!existingResponsibility) {
    throw new Error(`ARCH-RESPONSIBILITY-NOT-FOUND: ${command.responsibilityId}`);
  }
  const existingComponentId =
    existingResponsibility.component_id ?? existingResponsibility.componentId;
  if (existingComponentId !== command.componentId) {
    throw new Error(
      `ARCH-RESPONSIBILITY-COMPONENT-MISMATCH: ${command.responsibilityId} belongs to ${existingComponentId}.`
    );
  }

  return {
    retirement: {
      responsibilityId: command.responsibilityId,
      componentId: command.componentId,
    },
    audit: architectureScopedAudit({ command, operationId, now }),
  };
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

function planArchitectureContractRecordOperation({
  command,
  design,
  designScopes,
  ownerComponent,
  existingContract,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const existing = normalizeArchitectureContract(existingContract);
  const requiredScope = existing ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'contract',
    command.contractId,
    [requiredScope],
    'ARCH-CONTRACT-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.ownerComponentId,
    ['may_reference', 'may_create', 'may_update'],
    'ARCH-CONTRACT-OWNER-SCOPE-MISSING'
  );

  if (!normalizeArchitectureComponent(ownerComponent)) {
    throw new Error(`ARCH-CONTRACT-OWNER-MISSING: component ${command.ownerComponentId}`);
  }

  validateArchitectureContractRecordCommand(command);

  const createdAt = toIso(now);
  const contract = {
    contractId: command.contractId,
    contractKind: command.contractKind,
    ownerComponentId: command.ownerComponentId,
    contractRef: command.contractRef,
    compatibility: command.compatibility,
    status: command.status,
    validationCommand: command.validationCommand,
    createdAt,
    updatedAt: createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { contract, audit };
}

function planArchitecturePortRecordOperation({
  command,
  design,
  designScopes,
  component,
  inputContract,
  outputContract,
  existingPort,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  const existing = normalizeArchitecturePort(existingPort);
  const requiredScope = existing ? 'may_update' : 'may_create';
  assertArchitectureDesignScope(
    designScopes,
    'port',
    command.portId,
    [requiredScope],
    'ARCH-PORT-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_reference', 'may_create', 'may_update'],
    'ARCH-PORT-COMPONENT-SCOPE-MISSING'
  );

  if (command.inputContractId) {
    assertArchitectureDesignScope(
      designScopes,
      'contract',
      command.inputContractId,
      ['may_reference', 'may_create', 'may_update'],
      'ARCH-PORT-CONTRACT-SCOPE-MISSING'
    );
  }
  if (command.outputContractId) {
    assertArchitectureDesignScope(
      designScopes,
      'contract',
      command.outputContractId,
      ['may_reference', 'may_create', 'may_update'],
      'ARCH-PORT-CONTRACT-SCOPE-MISSING'
    );
  }

  if (!normalizeArchitectureComponent(component)) {
    throw new Error(`ARCH-PORT-COMPONENT-MISSING: component ${command.componentId}`);
  }
  if (command.inputContractId && !normalizeArchitectureContract(inputContract)) {
    throw new Error(`ARCH-PORT-CONTRACT-MISSING: input contract ${command.inputContractId}`);
  }
  if (command.outputContractId && !normalizeArchitectureContract(outputContract)) {
    throw new Error(`ARCH-PORT-CONTRACT-MISSING: output contract ${command.outputContractId}`);
  }

  validateArchitecturePortRecordCommand(command);

  const createdAt = toIso(now);
  const port = {
    portId: command.portId,
    componentId: command.componentId,
    portName: command.portName,
    portKind: command.portKind,
    direction: command.direction,
    inputContractId: command.inputContractId,
    outputContractId: command.outputContractId,
    negativeTests: command.negativeTests,
    status: command.status,
    createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { port, audit };
}

function planArchitectureStorageIoRecordOperation({
  command,
  design,
  designScopes,
  component,
  contract,
  existingStorageIo,
  operationId,
  now,
}) {
  assertArchitectureDesignMayRecord(design, command);
  assertArchitectureDesignScope(
    designScopes,
    'component',
    command.componentId,
    ['may_reference', 'may_update'],
    'ARCH-STORAGE-IO-DESIGN-SCOPE-MISSING'
  );
  assertArchitectureDesignScope(
    designScopes,
    'path',
    command.storageObject,
    ['may_update'],
    'ARCH-STORAGE-IO-DESIGN-SCOPE-MISSING'
  );

  const existing = normalizeArchitectureStorageIo(existingStorageIo);
  if (!existing || existing.storageIoId !== command.storageIoId) {
    throw new Error(`ARCH-STORAGE-IO-MISSING: ${command.storageIoId}`);
  }
  if (!normalizeArchitectureComponent(component)) {
    throw new Error(`ARCH-STORAGE-IO-COMPONENT-MISSING: ${command.componentId}`);
  }
  if (existing.componentId !== command.componentId) {
    throw new Error(
      `ARCH-STORAGE-IO-COMPONENT-MISMATCH: ${command.storageIoId} belongs to ${existing.componentId}, not ${command.componentId}.`
    );
  }
  if (existing.storageObject !== command.expectedStorageObject) {
    throw new Error(
      `ARCH-STORAGE-IO-STALE: ${command.storageIoId} expected ${command.expectedStorageObject}, found ${existing.storageObject}.`
    );
  }
  if (
    existing.direction !== command.direction ||
    existing.accessPattern !== command.accessPattern
  ) {
    throw new Error(
      `ARCH-STORAGE-IO-SEMANTICS-MISMATCH: ${command.storageIoId} direction/access pattern must remain ${existing.direction}/${existing.accessPattern}.`
    );
  }
  if (command.contractId && !normalizeArchitectureContract(contract)) {
    throw new Error(`ARCH-STORAGE-IO-CONTRACT-MISSING: ${command.contractId}`);
  }
  if (command.contractId && command.contractId !== existing.contractId) {
    throw new Error(
      `ARCH-STORAGE-IO-CONTRACT-MISMATCH: ${command.storageIoId} contract must remain ${existing.contractId || 'none'}.`
    );
  }

  validateArchitectureStorageIoRecordCommand(command);

  const storageIo = {
    storageIoId: command.storageIoId,
    componentId: command.componentId,
    storageObject: command.storageObject,
    direction: command.direction,
    accessPattern: command.accessPattern,
    contractId: existing.contractId,
    createdAt: existing.createdAt,
  };
  const audit = architectureScopedAudit({ command, operationId, now });

  return { storageIo, expectedStorageObject: command.expectedStorageObject, audit };
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

function normalizeOperationRevision(row) {
  if (!row) {
    return 0;
  }

  return Number(row.resulting_revision ?? row.resultingRevision ?? 0);
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

function normalizeDbSurface(row) {
  if (!row) {
    return null;
  }

  return {
    surfaceName: row.surface_name ?? row.surfaceName,
    revision: Number(row.revision ?? 0),
  };
}

function planDbSurfaceUpsertOperation({ command, existingSurface, operationId, now }) {
  validateDbSurfaceUpsertCommand(command);

  const previous = normalizeDbSurface(existingSurface);
  const previousRevision = previous ? previous.revision : 0;
  const resultingRevision = previous ? previous.revision + 1 : 0;
  const updatedAt = toIso(now);
  const surface = {
    surfaceName: command.surfaceName,
    canonicalSource: command.canonicalSource,
    writeRail: command.writeRail,
    writeRailKind: command.writeRailKind,
    readQueryRail: command.readQueryRail,
    projection: command.projection,
    validation: command.validation,
    authorityMode: command.authorityMode,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    revision: resultingRevision,
    updatedBy: command.actor,
    updatedAt,
    rawSurface: operationPayload(command),
  };
  const audit = {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    surfaceName: command.surfaceName,
    sourceRef: command.sourceRef,
    sourceContentSha256: command.sourceContentSha256,
    previousRevision,
    resultingRevision,
    payload: operationPayload(command),
    createdAt: updatedAt,
  };

  return { surface, audit };
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

function mergeUniqueValues(existing = [], incoming = []) {
  const merged = new Map();
  for (const value of [...existing, ...incoming]) {
    merged.set(canonicalJson(value), value);
  }
  return [...merged.values()];
}

function mergeFeatureMechanizationValue(existing, incoming) {
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return mergeUniqueValues(existing, incoming);
  }
  if (
    existing &&
    incoming &&
    typeof existing === 'object' &&
    typeof incoming === 'object' &&
    !Array.isArray(existing) &&
    !Array.isArray(incoming)
  ) {
    return Object.fromEntries(
      mergeUniqueValues(Object.keys(existing), Object.keys(incoming)).map((key) => [
        key,
        key in incoming
          ? key in existing
            ? mergeFeatureMechanizationValue(existing[key], incoming[key])
            : incoming[key]
          : existing[key],
      ])
    );
  }
  return incoming;
}

function mergeFeatureMechanizationObjectsByKey(existing, incoming, keyOf) {
  const merged = new Map();
  for (const value of existing) {
    merged.set(keyOf(value), value);
  }
  for (const value of incoming) {
    const key = keyOf(value);
    merged.set(
      key,
      merged.has(key) ? mergeFeatureMechanizationValue(merged.get(key), value) : value
    );
  }
  return [...merged.values()];
}

function featureMechanizationSurfacePath(value) {
  return String(value || '')
    .trim()
    .split(/\s+/, 1)[0];
}

function surfaceMatchesPattern(surface, pattern) {
  const normalizedSurface = featureMechanizationSurfacePath(surface);
  const normalizedPattern = featureMechanizationSurfacePath(pattern);
  if (normalizedSurface === normalizedPattern) {
    return true;
  }
  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.slice(0, -3);
    return normalizedSurface === prefix || normalizedSurface.startsWith(`${prefix}/`);
  }
  return false;
}

function excludesFeatureMechanizationSurface(reference, patterns) {
  const surface = reference.split('#', 1)[0];
  return patterns.some((pattern) => surfaceMatchesPattern(surface, pattern));
}

function pruneForbiddenFeatureMechanizationReferences(value, patterns) {
  if (typeof value === 'string') {
    return excludesFeatureMechanizationSurface(value, patterns) ? undefined : value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneForbiddenFeatureMechanizationReferences(item, patterns))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, pruneForbiddenFeatureMechanizationReferences(item, patterns)])
        .filter(([, item]) => item !== undefined)
    );
  }
  return value;
}

function mergeFeatureMechanizationManifest(existingManifest, incomingManifest, command) {
  const existing = command.replaceArchitectureGuards
    ? { ...(existingManifest || {}), architectureGuards: [] }
    : existingManifest || {};
  const merged = pruneForbiddenFeatureMechanizationReferences(
    mergeFeatureMechanizationValue(existing, incomingManifest),
    command.forbiddenImplementationSurfaces
  );
  const retainedForbidden = (existing.forbiddenImplementationSurfaces || []).filter(
    (pattern) =>
      !command.allowedImplementationSurfaces.some((surface) =>
        surfaceMatchesPattern(surface, pattern)
      )
  );
  const forbiddenImplementationSurfaces = mergeUniqueValues(
    retainedForbidden,
    command.forbiddenImplementationSurfaces
  );
  const symbols = mergeFeatureMechanizationObjectsByKey(
    (command.replaceImplementationRefs ? [] : existing.symbols || []).filter(
      (symbol) =>
        !excludesFeatureMechanizationSurface(
          `${symbol.path}#${symbol.name}`,
          command.forbiddenImplementationSurfaces
        )
    ),
    incomingManifest.symbols,
    (symbol) => `${symbol.path}#${symbol.name}`
  );

  const reconciled = {
    ...merged,
    allowedImplementationSurfaces: mergeUniqueValues(
      existing.allowedImplementationSurfaces || [],
      incomingManifest.allowedImplementationSurfaces
    ).filter(
      (surface) =>
        !excludesFeatureMechanizationSurface(surface, command.forbiddenImplementationSurfaces)
    ),
    forbiddenImplementationSurfaces,
    commandQueryRails: mergeFeatureMechanizationObjectsByKey(
      existing.commandQueryRails || [],
      incomingManifest.commandQueryRails,
      (rail) => `${rail.type}#${rail.name}`
    ),
    redGreenCycles: mergeFeatureMechanizationObjectsByKey(
      existing.redGreenCycles || [],
      incomingManifest.redGreenCycles,
      (cycle) => cycle.id
    ),
    symbols,
  };
  return {
    ...pruneForbiddenFeatureMechanizationReferences(
      reconciled,
      command.forbiddenImplementationSurfaces
    ),
    forbiddenImplementationSurfaces,
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
  const previous = normalizeFeatureMechanizationRail(existingRail);
  const previousRevision = previous ? previous.revision : null;
  if (
    command.expectedRevision !== null &&
    command.expectedRevision !== undefined &&
    previousRevision !== command.expectedRevision
  ) {
    throw new Error(
      `Feature mechanization rail ${command.railId} expected revision ${command.expectedRevision}, but current revision is ${previousRevision ?? 'none'}.`
    );
  }

  const resultingRevision = previousRevision === null ? 0 : previousRevision + 1;
  const updatedAt = toIso(now);
  const createdAt = previous?.createdAt || updatedAt;
  const rawRail = mergeFeatureMechanizationValue(previous?.rawRail || {}, {
    name: command.railName,
    type: command.railType,
    dddOwner: command.dddOwner,
    status: command.railStatus,
    applicationPort: command.applicationPort,
    adapterSurface: command.adapterSurface,
    authorizationScope: command.authorizationScope,
    negativeTests: command.negativeTests,
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
        id: `${command.normalizedRailName}-record`,
        redTest: command.redTest,
        expectedFailure: command.expectedFailure,
        patchSurfaces,
        greenTest: command.greenTest,
      },
    ],
    symbols: buildFeatureMechanizationSymbols(command),
  };
  const rawManifest = mergeFeatureMechanizationManifest(
    previous?.rawManifest,
    incomingManifest,
    command
  );
  const retained = (values) =>
    values.filter(
      (value) =>
        !excludesFeatureMechanizationSurface(value, command.forbiddenImplementationSurfaces)
    );
  const previousSymbolRefs = command.replaceImplementationRefs ? [] : previous?.symbolRefs;
  const previousImplementationRefs = command.replaceImplementationRefs
    ? []
    : previous?.implementationRefs;
  const rail = {
    railId: command.railId,
    featureId: command.featureId,
    mechanizationStatus: command.mechanizationStatus,
    railName: command.railName,
    normalizedRailName: command.normalizedRailName,
    railType: command.railType,
    dddOwner: command.dddOwner,
    railStatus: command.railStatus,
    symbolRefs: retained(mergeUniqueValues(previousSymbolRefs, command.implementationRefs)),
    implementationRefs: retained(
      mergeUniqueValues(previousImplementationRefs, command.implementationRefs)
    ),
    documentationRefs: mergeUniqueValues(previous?.documentationRefs, command.documentationRefs),
    governingSources: mergeUniqueValues(previous?.governingSources, command.governingSources),
    allowedImplementationSurfaces: retained(
      mergeUniqueValues(
        previous?.allowedImplementationSurfaces,
        command.allowedImplementationSurfaces
      )
    ),
    architectureGuards: mergeUniqueValues(
      command.replaceArchitectureGuards ? [] : previous?.architectureGuards,
      command.architectureGuards
    ),
    completionGate: mergeUniqueValues(previous?.completionGate, command.completionGate),
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

function fowlerAnalysisAudit({ command, operationId, now }) {
  return {
    operationId,
    idempotencyKey: command.idempotencyKey,
    operationType: command.kind,
    actor: command.actor,
    documentPath: command.documentPath,
    targetPath: command.targetPath || command.canonicalTargetPath || null,
    referencePath: command.referencePath || null,
    relationType: command.relationType || null,
    sourceContentSha256: command.sourceContentSha256,
    payload: operationPayload(command),
    createdAt: toIso(now),
  };
}

function planFowlerAnalysisOperation({ command, operationId, now }) {
  const createdAt = toIso(now);
  const audit = fowlerAnalysisAudit({ command, operationId, now });

  if (command.kind === 'fowler_analysis_disposition_record') {
    return {
      disposition: {
        documentPath: command.documentPath,
        dispositionStatus: command.dispositionStatus,
        dispositionKind: command.dispositionKind,
        canonicalTargetPath: command.canonicalTargetPath,
        reason: command.reason,
        sourceContentSha256: command.sourceContentSha256,
        recordedBy: command.actor,
        recordedAt: createdAt,
        rawDisposition: operationPayload(command),
      },
      audit,
    };
  }

  if (command.kind === 'fowler_analysis_canonical_target_link') {
    return {
      target: {
        documentPath: command.documentPath,
        targetPath: command.targetPath,
        targetKind: command.targetKind,
        targetStatus: command.targetStatus,
        reason: command.reason,
        sourceContentSha256: command.sourceContentSha256,
        linkedBy: command.actor,
        linkedAt: createdAt,
        rawTarget: operationPayload(command),
      },
      audit,
    };
  }

  if (command.kind === 'fowler_analysis_reference_resolve') {
    return {
      referenceResolution: {
        documentPath: command.documentPath,
        referencePath: command.referencePath,
        relationType: command.relationType,
        resolutionStatus: command.resolutionStatus,
        canonicalTargetPath: command.canonicalTargetPath,
        reason: command.reason,
        sourceContentSha256: command.sourceContentSha256,
        resolvedBy: command.actor,
        resolvedAt: createdAt,
        rawResolution: operationPayload(command),
      },
      audit,
    };
  }

  if (command.kind === 'fowler_analysis_retirement_approve') {
    return {
      retirementDecision: {
        documentPath: command.documentPath,
        decisionStatus: command.decisionStatus,
        reason: command.reason,
        sourceContentSha256: command.sourceContentSha256,
        decidedBy: command.actor,
        decidedAt: createdAt,
        rawDecision: operationPayload(command),
      },
      audit,
    };
  }

  throw new Error(`Unsupported Fowler analysis operation kind "${command.kind}".`);
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

function buildDocsResolutionAuditRows(rows) {
  return rows.map((row) => {
    const reference = row.reference_text ? ` ref=${row.reference_text}` : '';
    return `${row.created_at} ${row.operation_id} ${row.operation_type} ${row.resolution_scope}/${row.issue_kind} ${row.document_path}${reference} status=${row.resolution_status} actor=${row.actor}`;
  });
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

async function readExistingDbSurfaceOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.db_governance_surface_operations
     where idempotency_key = $1`,
    [idempotencyKey]
  );

  return result.rows[0] || null;
}

async function readDbSurface(client, surfaceName, lock = false) {
  const result = await client.query(
    `select *
     from ${schemaName}.db_governance_surfaces
     where surface_name = $1
     ${lock ? 'for update' : ''}`,
    [surfaceName]
  );

  return result.rows[0] || null;
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

async function readExistingFowlerAnalysisOperation(client, idempotencyKey) {
  const result = await client.query(
    `select *
     from ${schemaName}.fowler_analysis_operations
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

async function readArchitectureComponentResponsibility(client, responsibilityId) {
  const result = await client.query(
    `select *
     from architecture.component_responsibility
     where responsibility_id = $1`,
    [responsibilityId]
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

async function readArchitectureContract(client, contractId) {
  const result = await client.query(
    `select *
     from architecture.contract
     where contract_id = $1`,
    [contractId]
  );

  return result.rows[0] || null;
}

async function readArchitecturePort(client, portId) {
  const result = await client.query(
    `select *
     from architecture.component_port
     where port_id = $1`,
    [portId]
  );

  return result.rows[0] || null;
}

async function readArchitectureStorageIo(client, storageIoId) {
  const result = await client.query(
    `select *
     from architecture.component_storage_io
     where storage_io_id = $1`,
    [storageIoId]
  );

  return result.rows[0] || null;
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

async function readArchitectureImplementationViolations(client, designId) {
  const result = await client.query(
    `select violation_kind, subject_kind, subject_id, severity
     from architecture.implementation_violation_query
     where design_id = $1`,
    [designId]
  );
  return result.rows;
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

async function readGovernanceUnit(client, unitId) {
  const result = await client.query(
    `select
       component_id as unit_id,
       name,
       component_level as level,
       parent_component_id as parent_id,
       root_unit,
       domain_unit,
       status
     from ${componentEngineeringSchemaName}.component_tree_query
     where component_id = $1`,
    [unitId]
  );

  return result.rows[0] || null;
}

async function readGovernanceUnitPath(client, unitId) {
  const result = await client.query(
    `with recursive unit_chain as (
       select component_id as unit_id, parent_component_id as parent_id, 0 as depth
       from ${componentEngineeringSchemaName}.component_tree_query
       where component_id = $1
       union all
       select parent.component_id as unit_id, parent.parent_component_id as parent_id,
              unit_chain.depth + 1
       from ${componentEngineeringSchemaName}.component_tree_query parent
       join unit_chain
         on unit_chain.parent_id = parent.component_id
       where unit_chain.depth < 64
     )
     select unit_id
     from unit_chain
     order by depth desc`,
    [unitId]
  );

  return result.rows;
}

async function readImportedGovernanceComponent(client, componentId, lock = false) {
  const result = await client.query(
    `select 'imported'::text as source_kind, *
     from ${schemaName}.governance_components
     where component_id = $1
     ${lock ? 'for update' : ''}`,
    [componentId]
  );

  return result.rows[0] || null;
}

async function readLocalGovernanceComponent(client, componentId, lock = false) {
  const result = await client.query(
    `select 'local'::text as source_kind, *
     from ${schemaName}.governance_component_local_definitions
     where component_id = $1
     ${lock ? 'for update' : ''}`,
    [componentId]
  );

  return result.rows[0] || null;
}

async function readLatestComponentOperation(client, componentId) {
  const result = await client.query(
    `select *
     from ${schemaName}.governance_component_local_operations
     where component_id = $1
     order by created_at desc, resulting_revision desc
     limit 1`,
    [componentId]
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

async function writePlannedArchitectureDesignTransitionOperation(client, planned) {
  const result = await client.query(
    `update architecture.design
     set status = $3,
         approved_at = case
           when $3 = 'approved' then coalesce(approved_at, $4)
           else approved_at
         end,
         updated_at = $5
     where design_id = $1
       and status = $2
     returning design_id`,
    [
      planned.transition.designId,
      planned.transition.fromStatus,
      planned.transition.toStatus,
      planned.transition.approvedAt,
      planned.transition.updatedAt,
    ]
  );
  if (!result.rows[0]) {
    throw new Error(
      `ARCH-DESIGN-TRANSITION-CONFLICT: ${planned.transition.designId} no longer has status ${planned.transition.fromStatus}.`
    );
  }

  await writeArchitectureScopedAudit(client, planned.audit);
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
         status = architecture.component_responsibility.status`,
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

async function writePlannedArchitectureComponentResponsibilityRetireOperation(client, planned) {
  const result = await client.query(
    `delete from architecture.component_responsibility
     where responsibility_id = $1
       and component_id = $2`,
    [planned.retirement.responsibilityId, planned.retirement.componentId]
  );
  if (result.rowCount !== 1) {
    throw new Error(
      `ARCH-RESPONSIBILITY-RETIRE-CONFLICT: ${planned.retirement.responsibilityId} was not deleted.`
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

async function writePlannedArchitectureContractRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.contract
      (contract_id, contract_kind, owner_component_id, contract_ref,
       compatibility, status, validation_command, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (contract_id) do update set
       contract_kind = excluded.contract_kind,
       owner_component_id = excluded.owner_component_id,
       contract_ref = excluded.contract_ref,
       compatibility = excluded.compatibility,
       status = excluded.status,
       validation_command = excluded.validation_command,
       updated_at = excluded.updated_at`,
    [
      planned.contract.contractId,
      planned.contract.contractKind,
      planned.contract.ownerComponentId,
      planned.contract.contractRef,
      planned.contract.compatibility,
      planned.contract.status,
      planned.contract.validationCommand,
      planned.contract.createdAt,
      planned.contract.updatedAt,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitecturePortRecordOperation(client, planned) {
  await client.query(
    `insert into architecture.component_port
      (port_id, component_id, port_name, port_kind, direction,
       input_contract_id, output_contract_id, negative_tests, status, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10)
     on conflict (port_id) do update set
       component_id = excluded.component_id,
       port_name = excluded.port_name,
       port_kind = excluded.port_kind,
       direction = excluded.direction,
       input_contract_id = excluded.input_contract_id,
       output_contract_id = excluded.output_contract_id,
       negative_tests = excluded.negative_tests,
       status = excluded.status`,
    [
      planned.port.portId,
      planned.port.componentId,
      planned.port.portName,
      planned.port.portKind,
      planned.port.direction,
      planned.port.inputContractId,
      planned.port.outputContractId,
      planned.port.negativeTests,
      planned.port.status,
      planned.port.createdAt,
    ]
  );

  await writeArchitectureScopedAudit(client, planned.audit);
}

async function writePlannedArchitectureStorageIoRecordOperation(client, planned) {
  const result = await client.query(
    `update architecture.component_storage_io
     set storage_object = $2,
         direction = $3,
         access_pattern = $4,
         contract_id = $5
     where storage_io_id = $1
       and component_id = $6
       and storage_object = $7`,
    [
      planned.storageIo.storageIoId,
      planned.storageIo.storageObject,
      planned.storageIo.direction,
      planned.storageIo.accessPattern,
      planned.storageIo.contractId,
      planned.storageIo.componentId,
      planned.expectedStorageObject,
    ]
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `ARCH-STORAGE-IO-CONCURRENT-UPDATE: ${planned.storageIo.storageIoId} no longer writes ${planned.expectedStorageObject}.`
    );
  }

  await writeArchitectureScopedAudit(client, planned.audit);
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

async function writePlannedComponentCreateOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.governance_component_local_definitions
      (component_id, source_path, source_content_sha256, revision, name, level, parent_id,
       root_unit, domain_unit, status, children_required, owned_concern, ddd_owner,
       cq_rails, created_by, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
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
      planned.definition.ownedConcern,
      planned.definition.dddOwner,
      planned.definition.cqRails,
      planned.definition.createdBy,
      planned.definition.createdAt,
    ]
  );

  for (const pattern of planned.ownershipPatterns) {
    await client.query(
      `insert into ${schemaName}.governance_component_local_ownership_patterns
        (component_id, pattern_kind, pattern, pattern_order)
       values ($1, $2, $3, $4)
       on conflict (component_id, pattern_kind, pattern) do update set
         pattern_order = excluded.pattern_order`,
      [pattern.componentId, pattern.patternKind, pattern.pattern, pattern.patternOrder]
    );
  }

  for (const item of planned.semanticItems) {
    await client.query(
      `insert into ${schemaName}.governance_component_local_semantic_items
        (component_id, item_kind, item_value, item_order)
       values ($1, $2, $3, $4)
       on conflict (component_id, item_kind, item_value) do update set
         item_order = excluded.item_order`,
      [item.componentId, item.itemKind, item.itemValue, item.itemOrder]
    );
  }

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

async function refreshComponentEngineeringReadProjections(client) {
  for (const projection of [
    'component_engineering_component_tree_projection',
    'component_engineering_file_ownership_projection',
    'component_engineering_rule_evaluation_projection',
  ]) {
    await client.query(`refresh materialized view ${schemaName}.${projection}`);
  }
}

async function writePlannedComponentReviseOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.governance_component_local_definitions
      (component_id, source_path, source_content_sha256, revision, name, level, parent_id,
       root_unit, domain_unit, status, children_required, owned_concern, ddd_owner,
       cq_rails, created_by, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     on conflict (component_id) do update set
       source_path = excluded.source_path,
       source_content_sha256 = excluded.source_content_sha256,
       revision = excluded.revision,
       name = excluded.name,
       level = excluded.level,
       parent_id = excluded.parent_id,
       root_unit = excluded.root_unit,
       domain_unit = excluded.domain_unit,
       status = excluded.status,
       children_required = excluded.children_required,
       owned_concern = excluded.owned_concern,
       ddd_owner = excluded.ddd_owner,
       cq_rails = excluded.cq_rails,
       created_by = excluded.created_by`,
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
      planned.definition.ownedConcern,
      planned.definition.dddOwner,
      planned.definition.cqRails,
      planned.definition.createdBy,
      planned.definition.createdAt,
    ]
  );

  await client.query(
    `delete from ${schemaName}.governance_component_local_ownership_patterns
     where component_id = $1`,
    [planned.definition.componentId]
  );
  await client.query(
    `delete from ${schemaName}.governance_component_local_semantic_items
     where component_id = $1`,
    [planned.definition.componentId]
  );

  for (const pattern of planned.ownershipPatterns) {
    await client.query(
      `insert into ${schemaName}.governance_component_local_ownership_patterns
        (component_id, pattern_kind, pattern, pattern_order)
       values ($1, $2, $3, $4)`,
      [pattern.componentId, pattern.patternKind, pattern.pattern, pattern.patternOrder]
    );
  }

  for (const item of planned.semanticItems) {
    await client.query(
      `insert into ${schemaName}.governance_component_local_semantic_items
        (component_id, item_kind, item_value, item_order)
       values ($1, $2, $3, $4)`,
      [item.componentId, item.itemKind, item.itemValue, item.itemOrder]
    );
  }

  await refreshComponentEngineeringReadProjections(client);

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

async function writePlannedComponentReparentOperation(client, planned) {
  if (planned.definition.sourceKind === 'local') {
    await client.query(
      `update ${schemaName}.governance_component_local_definitions
       set parent_id = $2,
           root_unit = $3,
           domain_unit = $4,
           source_path = $5,
           source_content_sha256 = $6,
           revision = $7
       where component_id = $1`,
      [
        planned.definition.componentId,
        planned.definition.parentComponentId,
        planned.definition.rootUnit,
        planned.definition.domainUnit,
        planned.definition.sourcePath,
        planned.definition.sourceContentSha256,
        planned.definition.revision,
      ]
    );
  } else {
    await client.query(
      `insert into ${schemaName}.governance_component_reparent_overrides
        (component_id, parent_id, root_unit, domain_unit, unit_path, raw_component,
         source_path, source_content_sha256, revision, updated_by, updated_at)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11)
       on conflict (component_id) do update set
         parent_id = excluded.parent_id,
         root_unit = excluded.root_unit,
         domain_unit = excluded.domain_unit,
         unit_path = excluded.unit_path,
         raw_component = excluded.raw_component,
         source_path = excluded.source_path,
         source_content_sha256 = excluded.source_content_sha256,
         revision = excluded.revision,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
      [
        planned.definition.componentId,
        planned.definition.parentComponentId,
        planned.definition.rootUnit,
        planned.definition.domainUnit,
        toJson(planned.definition.unitPath),
        toJson(planned.definition.rawComponent),
        planned.definition.sourcePath,
        planned.definition.sourceContentSha256,
        planned.definition.revision,
        planned.audit.actor,
        planned.audit.createdAt,
      ]
    );
  }

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

async function writePlannedDbSurfaceUpsertOperation(client, planned) {
  await client.query(
    `insert into ${schemaName}.db_governance_surfaces
      (surface_name, canonical_source, write_rail, write_rail_kind, read_query_rail,
       projection, validation, authority_mode, source_ref, source_content_sha256,
       revision, updated_by, updated_at, raw_surface)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
     on conflict (surface_name) do update set
       canonical_source = excluded.canonical_source,
       write_rail = excluded.write_rail,
       write_rail_kind = excluded.write_rail_kind,
       read_query_rail = excluded.read_query_rail,
       projection = excluded.projection,
       validation = excluded.validation,
       authority_mode = excluded.authority_mode,
       source_ref = excluded.source_ref,
       source_content_sha256 = excluded.source_content_sha256,
       revision = excluded.revision,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at,
       raw_surface = excluded.raw_surface`,
    [
      planned.surface.surfaceName,
      planned.surface.canonicalSource,
      planned.surface.writeRail,
      planned.surface.writeRailKind,
      planned.surface.readQueryRail,
      planned.surface.projection,
      planned.surface.validation,
      planned.surface.authorityMode,
      planned.surface.sourceRef,
      planned.surface.sourceContentSha256,
      planned.surface.revision,
      planned.surface.updatedBy,
      planned.surface.updatedAt,
      toJson(planned.surface.rawSurface),
    ]
  );

  await client.query(
    `insert into ${schemaName}.db_governance_surface_operations
      (operation_id, idempotency_key, operation_type, actor, surface_name,
       source_ref, source_content_sha256, previous_revision, resulting_revision,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.surfaceName,
      planned.audit.sourceRef,
      planned.audit.sourceContentSha256,
      planned.audit.previousRevision,
      planned.audit.resultingRevision,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
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

async function writePlannedFowlerAnalysisOperation(client, planned) {
  if (planned.disposition) {
    await client.query(
      `insert into ${schemaName}.fowler_analysis_dispositions
        (document_path, disposition_status, disposition_kind, canonical_target_path,
         reason, source_content_sha256, recorded_by, recorded_at, raw_disposition)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       on conflict (document_path) do update set
         disposition_status = excluded.disposition_status,
         disposition_kind = excluded.disposition_kind,
         canonical_target_path = excluded.canonical_target_path,
         reason = excluded.reason,
         source_content_sha256 = excluded.source_content_sha256,
         recorded_by = excluded.recorded_by,
         recorded_at = excluded.recorded_at,
         raw_disposition = excluded.raw_disposition`,
      [
        planned.disposition.documentPath,
        planned.disposition.dispositionStatus,
        planned.disposition.dispositionKind,
        planned.disposition.canonicalTargetPath,
        planned.disposition.reason,
        planned.disposition.sourceContentSha256,
        planned.disposition.recordedBy,
        planned.disposition.recordedAt,
        toJson(planned.disposition.rawDisposition),
      ]
    );
  }

  if (planned.target) {
    await client.query(
      `insert into ${schemaName}.fowler_analysis_canonical_targets
        (document_path, target_path, target_kind, target_status, reason,
         source_content_sha256, linked_by, linked_at, raw_target)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       on conflict (document_path, target_path) do update set
         target_kind = excluded.target_kind,
         target_status = excluded.target_status,
         reason = excluded.reason,
         source_content_sha256 = excluded.source_content_sha256,
         linked_by = excluded.linked_by,
         linked_at = excluded.linked_at,
         raw_target = excluded.raw_target`,
      [
        planned.target.documentPath,
        planned.target.targetPath,
        planned.target.targetKind,
        planned.target.targetStatus,
        planned.target.reason,
        planned.target.sourceContentSha256,
        planned.target.linkedBy,
        planned.target.linkedAt,
        toJson(planned.target.rawTarget),
      ]
    );
  }

  if (planned.referenceResolution) {
    await client.query(
      `insert into ${schemaName}.fowler_analysis_reference_resolutions
        (document_path, reference_path, relation_type, resolution_status,
         canonical_target_path, reason, source_content_sha256, resolved_by,
         resolved_at, raw_resolution)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       on conflict (document_path, reference_path, relation_type) do update set
         resolution_status = excluded.resolution_status,
         canonical_target_path = excluded.canonical_target_path,
         reason = excluded.reason,
         source_content_sha256 = excluded.source_content_sha256,
         resolved_by = excluded.resolved_by,
         resolved_at = excluded.resolved_at,
         raw_resolution = excluded.raw_resolution`,
      [
        planned.referenceResolution.documentPath,
        planned.referenceResolution.referencePath,
        planned.referenceResolution.relationType,
        planned.referenceResolution.resolutionStatus,
        planned.referenceResolution.canonicalTargetPath,
        planned.referenceResolution.reason,
        planned.referenceResolution.sourceContentSha256,
        planned.referenceResolution.resolvedBy,
        planned.referenceResolution.resolvedAt,
        toJson(planned.referenceResolution.rawResolution),
      ]
    );
  }

  if (planned.retirementDecision) {
    await client.query(
      `insert into ${schemaName}.fowler_analysis_retirement_decisions
        (document_path, decision_status, reason, source_content_sha256,
         decided_by, decided_at, raw_decision)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)
       on conflict (document_path) do update set
         decision_status = excluded.decision_status,
         reason = excluded.reason,
         source_content_sha256 = excluded.source_content_sha256,
         decided_by = excluded.decided_by,
         decided_at = excluded.decided_at,
         raw_decision = excluded.raw_decision`,
      [
        planned.retirementDecision.documentPath,
        planned.retirementDecision.decisionStatus,
        planned.retirementDecision.reason,
        planned.retirementDecision.sourceContentSha256,
        planned.retirementDecision.decidedBy,
        planned.retirementDecision.decidedAt,
        toJson(planned.retirementDecision.rawDecision),
      ]
    );
  }

  await client.query(
    `insert into ${schemaName}.fowler_analysis_operations
      (operation_id, idempotency_key, operation_type, actor, document_path,
       target_path, reference_path, relation_type, source_content_sha256,
       payload, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.documentPath,
      planned.audit.targetPath,
      planned.audit.referencePath,
      planned.audit.relationType,
      planned.audit.sourceContentSha256,
      toJson(planned.audit.payload),
      planned.audit.createdAt,
    ]
  );
}

async function writePlannedDocsResolutionOperation(client, planned) {
  await client.query(
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
       raw_resolution = excluded.raw_resolution`,
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
    ]
  );

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
    await client.query('begin');

    const sourceRow = await readDocsDispositionAction(client, command);
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
      operationId: options.operationId || randomUuidV4(),
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
    await assertPlanningDbCurrentSchemaReady(client);
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
      operationId: options.operationId || randomUuidV4(),
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

async function applyArchitectureDesignTransitionOperation(command, options = {}) {
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
      assertArchitectureDesignIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const existingDesign = await readArchitectureDesign(client, command.designId);
    const implementationViolations =
      command.toStatus === 'implemented'
        ? await readArchitectureImplementationViolations(client, command.designId)
        : [];
    const planned = planArchitectureDesignTransitionOperation({
      command,
      existingDesign,
      implementationViolations,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureDesignTransitionOperation(client, planned);
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
      operationId: options.operationId || randomUuidV4(),
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

async function applyArchitectureComponentResponsibilityRetireOperation(command, options = {}) {
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
    const [design, designScopes, existingResponsibility] = await Promise.all([
      readArchitectureDesign(client, command.designId),
      readArchitectureDesignScopes(client, command.designId),
      readArchitectureComponentResponsibility(client, command.responsibilityId),
    ]);
    const planned = planArchitectureComponentResponsibilityRetireOperation({
      command,
      design,
      designScopes,
      existingResponsibility,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });
    await writePlannedArchitectureComponentResponsibilityRetireOperation(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) await client.end();
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
      operationId: options.operationId || randomUuidV4(),
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

async function applyArchitectureContractRecordOperation(command, options = {}) {
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
    const ownerComponent = await readArchitectureComponent(client, command.ownerComponentId);
    const existingContract = await readArchitectureContract(client, command.contractId);
    const planned = planArchitectureContractRecordOperation({
      command,
      design,
      designScopes,
      ownerComponent,
      existingContract,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureContractRecordOperation(client, planned);
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

async function applyArchitecturePortRecordOperation(command, options = {}) {
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
    const inputContract = command.inputContractId
      ? await readArchitectureContract(client, command.inputContractId)
      : null;
    const outputContract = command.outputContractId
      ? await readArchitectureContract(client, command.outputContractId)
      : null;
    const existingPort = await readArchitecturePort(client, command.portId);
    const planned = planArchitecturePortRecordOperation({
      command,
      design,
      designScopes,
      component,
      inputContract,
      outputContract,
      existingPort,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitecturePortRecordOperation(client, planned);
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

async function applyArchitectureStorageIoRecordOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const replay = await readExistingArchitectureDesignOperation(client, command.idempotencyKey);
    if (replay) {
      assertArchitectureScopedOperationIdempotentReplayMatches(replay, command);
      await client.query('commit');
      return { idempotent: true, audit: replay };
    }

    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const component = await readArchitectureComponent(client, command.componentId);
    const contract = command.contractId
      ? await readArchitectureContract(client, command.contractId)
      : null;
    const existingStorageIo = await readArchitectureStorageIo(client, command.storageIoId);
    const planned = planArchitectureStorageIoRecordOperation({
      command,
      design,
      designScopes,
      component,
      contract,
      existingStorageIo,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedArchitectureStorageIoRecordOperation(client, planned);
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

async function applyComponentCreateOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
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
      operationId: options.operationId || randomUuidV4(),
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

async function applyComponentReviseOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingComponentOperation(client, command.idempotencyKey);
    if (existing) {
      assertComponentIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    await client.query('select pg_advisory_xact_lock(hashtext($1))', [command.componentId]);
    const design = await readArchitectureDesign(client, command.designId);
    const designScopes = await readArchitectureDesignScopes(client, command.designId);
    const existingComponent = await readEffectiveComponentDefinition(client, command.componentId);
    const latestOperation = await readLatestComponentOperation(client, command.componentId);
    const planned = planComponentReviseOperation({
      command,
      design,
      designScopes,
      existingComponent,
      latestOperation,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedComponentReviseOperation(client, planned);
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

async function applyComponentReparentOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingComponentOperation(client, command.idempotencyKey);
    if (existing) {
      assertComponentIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const parentUnit = await readGovernanceUnit(client, command.parentComponentId);
    const parentPathRows = await readGovernanceUnitPath(client, command.parentComponentId);
    const existingComponent =
      (await readImportedGovernanceComponent(client, command.componentId, true)) ||
      (await readLocalGovernanceComponent(client, command.componentId, true));
    const latestOperation = await readLatestComponentOperation(client, command.componentId);
    const planned = planComponentReparentOperation({
      command,
      parentUnit,
      existingComponent,
      parentPathRows,
      latestOperation,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedComponentReparentOperation(client, planned);
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

async function applyDbSurfaceUpsertOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existingOperation = await readExistingDbSurfaceOperation(client, command.idempotencyKey);
    if (existingOperation) {
      assertDbSurfaceIdempotentReplayMatches(existingOperation, command);
      await client.query('commit');
      return { idempotent: true, audit: existingOperation };
    }

    const existingSurface = await readDbSurface(client, command.surfaceName, true);
    const planned = planDbSurfaceUpsertOperation({
      command,
      existingSurface,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedDbSurfaceUpsertOperation(client, planned);
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

async function applyFeatureMechanizationRailRecordOperation(command, options = {}) {
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

async function applyFowlerAnalysisOperation(command, options = {}) {
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');

    const existing = await readExistingFowlerAnalysisOperation(client, command.idempotencyKey);
    if (existing) {
      assertFowlerAnalysisIdempotentReplayMatches(existing, command);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const planned = planFowlerAnalysisOperation({
      command,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });

    await writePlannedFowlerAnalysisOperation(client, planned);
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

function printOperationResult(result) {
  if (result.idempotent) {
    if (result.audit.source_commit_sha && result.audit.paths) {
      console.log(
        `[planning:db:operate] idempotent operation=${result.audit.operation_id} paths=${result.audit.paths.length} sourceCommit=${result.audit.source_commit_sha}`
      );
      return;
    }

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

    if (result.audit.rail_id) {
      console.log(
        `[planning:db:operate] idempotent operation=${result.audit.operation_id} rail=${result.audit.rail_id}`
      );
      return;
    }

    if (result.audit.surface_name) {
      console.log(
        `[planning:db:operate] idempotent operation=${result.audit.operation_id} surface=${result.audit.surface_name}`
      );
      return;
    }

    if (result.audit.document_path) {
      console.log(
        `[planning:db:operate] idempotent operation=${result.audit.operation_id} document=${result.audit.document_path}`
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

  if (result.transition) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.transition.designId} ${result.transition.fromStatus}->${result.transition.toStatus}`
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

  if (result.contract) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.contract.contractId} component=${result.contract.ownerComponentId}`
    );
    return;
  }

  if (result.port) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.port.portId} component=${result.port.componentId}`
    );
    return;
  }

  if (result.storageIo) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.storageIo.storageIoId} object=${result.storageIo.storageObject}`
    );
    return;
  }

  if (result.scan) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.scan.scanId} observations=${result.observations.length} evaluations=${result.evaluations.length}`
    );
    return;
  }

  if (result.testEvidence) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.testEvidence.testId} component=${result.testEvidence.componentId}`
    );
    return;
  }

  if (result.observability) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.observability.observabilityId} component=${result.observability.componentId}`
    );
    return;
  }

  if (result.evidence) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.evidence.evidenceId} subject=${result.evidence.subjectKind}:${result.evidence.subjectId} origin=${result.evidence.evidenceOrigin} result=${result.evidence.resultState}`
    );
    return;
  }

  if (result.retirement) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} retired=${result.retirement.responsibilityId || result.retirement.testId || result.retirement.evidenceId || result.retirement.railId}`
    );
    return;
  }

  if (result.definition) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.definition.componentId} revision=${result.audit.resultingRevision}`
    );
    return;
  }

  if (result.rail) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.rail.railId} revision=${result.audit.resultingRevision}`
    );
    return;
  }

  if (result.surface) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.surface.surfaceName} revision=${result.audit.resultingRevision}`
    );
    return;
  }

  if (result.disposition) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.disposition.documentPath} status=${result.disposition.dispositionStatus}`
    );
    return;
  }

  if (result.target) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.target.documentPath}->${result.target.targetPath} status=${result.target.targetStatus}`
    );
    return;
  }

  if (result.referenceResolution) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.referenceResolution.documentPath}<-${result.referenceResolution.referencePath} status=${result.referenceResolution.resolutionStatus}`
    );
    return;
  }

  if (result.retirementDecision) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.retirementDecision.documentPath} decision=${result.retirementDecision.decisionStatus}`
    );
    return;
  }

  if (result.run) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} ${result.run.runId} state=${result.run.runState} revision=${result.audit.resultingRevision}`
    );
    return;
  }

  if (result.sources) {
    console.log(
      `[planning:db:operate] ${result.audit.operationType} paths=${result.sources.length} sourceCommit=${result.audit.sourceCommitSha}`
    );
    return;
  }

  throw new Error(
    `Unsupported planning DB operation result "${result.audit.operationType || 'unknown'}".`
  );
}

async function main() {
  const command = parseArgs();
  if (command.kind === 'help') {
    console.log(command.helpText);
    return;
  }

  const result =
    command.kind === 'docs_disposition_resolve'
      ? await applyDocsResolutionOperation(command)
      : command.kind === 'architecture_design_create'
        ? await applyArchitectureDesignCreateOperation(command)
        : command.kind === 'architecture_design_transition'
          ? await applyArchitectureDesignTransitionOperation(command)
          : command.kind === 'architecture_component_record'
            ? await applyArchitectureComponentRecordOperation(command)
            : command.kind === 'architecture_component_responsibility_retire'
              ? await applyArchitectureComponentResponsibilityRetireOperation(command)
              : command.kind === 'architecture_relation_record'
                ? await applyArchitectureRelationRecordOperation(command)
                : command.kind === 'architecture_contract_record'
                  ? await applyArchitectureContractRecordOperation(command)
                  : command.kind === 'architecture_port_record'
                    ? await applyArchitecturePortRecordOperation(command)
                    : command.kind === 'architecture_storage_io_record'
                      ? await applyArchitectureStorageIoRecordOperation(command)
                      : command.kind === 'architecture_fitness_scan'
                        ? await applyArchitectureFitnessScanOperation(command)
                        : command.kind === 'architecture_test_record'
                          ? await applyArchitectureTestRecordOperation(command)
                          : command.kind === 'architecture_test_retire'
                            ? await applyArchitectureTestRetireOperation(command)
                            : command.kind === 'architecture_observability_record'
                              ? await applyArchitectureObservabilityRecordOperation(command)
                              : command.kind === 'architecture_evidence_record'
                                ? await applyArchitectureEvidenceRecordOperation(command)
                                : command.kind === 'architecture_evidence_retire'
                                  ? await applyArchitectureEvidenceRetireOperation(command)
                                  : command.kind === 'component_create'
                                    ? await applyComponentCreateOperation(command)
                                    : command.kind === 'component_revise'
                                      ? await applyComponentReviseOperation(command)
                                      : command.kind === 'component_reparent'
                                        ? await applyComponentReparentOperation(command)
                                        : command.kind === 'db_surface_upsert'
                                          ? await applyDbSurfaceUpsertOperation(command)
                                          : command.kind === 'feature_mechanization_rail_record'
                                            ? await applyFeatureMechanizationRailRecordOperation(
                                                command
                                              )
                                            : command.kind === 'feature_mechanization_rail_retire'
                                              ? await applyFeatureMechanizationRailRetireOperation(
                                                  command
                                                )
                                              : command.kind === 'governance_refresh_run_record'
                                                ? await applyGovernanceRefreshRunRecordOperation(
                                                    command
                                                  )
                                                : command.kind === 'governed_source_content_refresh'
                                                  ? await applyGovernedSourceRefreshOperation(
                                                      command
                                                    )
                                                  : command.kind.startsWith('fowler_analysis_')
                                                    ? await applyFowlerAnalysisOperation(command)
                                                    : (() => {
                                                        throw new Error(
                                                          `Unsupported planning DB operation "${command.kind}".`
                                                        );
                                                      })();
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
  applyArchitectureComponentResponsibilityRetireOperation,
  applyArchitectureContractRecordOperation,
  applyArchitectureDesignCreateOperation,
  applyArchitectureDesignTransitionOperation,
  applyArchitectureFitnessScanOperation,
  applyArchitecturePortRecordOperation,
  applyArchitectureStorageIoRecordOperation,
  applyArchitectureTestRecordOperation,
  applyArchitectureTestRetireOperation,
  applyArchitectureObservabilityRecordOperation,
  applyArchitectureEvidenceRecordOperation,
  applyArchitectureEvidenceRetireOperation,
  applyArchitectureRelationRecordOperation,
  applyComponentCreateOperation,
  applyComponentReviseOperation,
  applyComponentReparentOperation,
  applyDbSurfaceUpsertOperation,
  applyDocsResolutionOperation,
  applyFowlerAnalysisOperation,
  applyFeatureMechanizationRailRecordOperation,
  applyFeatureMechanizationRailRetireOperation,
  applyGovernanceRefreshRunRecordOperation,
  applyGovernedSourceRefreshOperation,
  assertArchitectureDesignIdempotentReplayMatches,
  assertArchitectureEvidenceOriginAuthenticity,
  assertArchitectureScopedOperationIdempotentReplayMatches,
  assertComponentIdempotentReplayMatches,
  assertDbSurfaceIdempotentReplayMatches,
  assertDocsResolutionIdempotentReplayMatches,
  assertFeatureMechanizationRailIdempotentReplayMatches,
  assertFowlerAnalysisIdempotentReplayMatches,
  buildDocsResolutionAuditRows,
  buildPlanningDbOperateHelpText,
  databaseUrl,
  materializeDocsResolutionCommand,
  parseArgs,
  planArchitectureComponentRecordOperation,
  planArchitectureComponentResponsibilityRetireOperation,
  planArchitectureContractRecordOperation,
  planArchitectureDesignCreateOperation,
  planArchitectureDesignTransitionOperation,
  planArchitectureFitnessScanOperation,
  planArchitecturePortRecordOperation,
  planArchitectureStorageIoRecordOperation,
  planArchitectureTestRecordOperation,
  planArchitectureTestRetireOperation,
  planArchitectureObservabilityRecordOperation,
  planArchitectureEvidenceRecordOperation,
  planArchitectureEvidenceRetireOperation,
  planArchitectureRelationRecordOperation,
  planComponentCreateOperation,
  planComponentReviseOperation,
  planComponentReparentOperation,
  planDbSurfaceUpsertOperation,
  planFeatureMechanizationRailRecordOperation,
  planFeatureMechanizationRailRetireOperation,
  planFowlerAnalysisOperation,
  planGovernanceRefreshRunRecordOperation,
  planDocsResolutionOperation,
  validateArchitectureDesignStatus,
  validateComponentStatus,
  validateDbSurfaceAuthorityMode,
  validateDbSurfaceWriteRailKind,
  validateGovernanceRefreshRunState,
  resolveOperateHelpRequest,
  writePlannedComponentCreateOperation,
  writePlannedComponentReviseOperation,
  writePlannedComponentReparentOperation,
  writePlannedDbSurfaceUpsertOperation,
  writePlannedArchitectureContractRecordOperation,
  writePlannedArchitectureComponentRecordOperation,
  writePlannedArchitectureComponentResponsibilityRetireOperation,
  writePlannedArchitectureDesignTransitionOperation,
  writePlannedArchitectureFitnessScanOperation,
  writePlannedArchitecturePortRecordOperation,
  writePlannedArchitectureStorageIoRecordOperation,
  writePlannedArchitectureTestRecordOperation,
  writePlannedArchitectureTestRetireOperation,
  writePlannedArchitectureObservabilityRecordOperation,
  writePlannedArchitectureEvidenceRecordOperation,
  writePlannedArchitectureEvidenceRetireOperation,
  writePlannedFeatureMechanizationRailRecordOperation,
  writePlannedFeatureMechanizationRailRetireOperation,
  writePlannedFowlerAnalysisOperation,
  writePlannedGovernanceRefreshRunRecordOperation,
};
