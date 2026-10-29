/**
 * @file scripts/planning-db/operate/cli.cjs
 * @ownedConcern CLI resource/action/help grammar and its public rejection behavior.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const {
  createGovernanceRefreshCommandParser,
} = require('../commands/governance-refresh-command.cjs');

const {
  normalizeOptionalText,
  parseBooleanOption,
  parseFlagOptions,
  parseIntegerOption,
  requireOption,
} = require('./command-values.cjs');

const {
  createGovernedSourceRefreshCommandParser,
} = require('../commands/governed-source-refresh-command.cjs');

const { parseComponentCommand } = require('./component-definition.cjs');

const { parseDbSurfaceCommand } = require('./db-surface.cjs');

const { parseArchitectureDesignCommand } = require('./architecture-design-operations.cjs');

const { parseArchitectureComponentCommand } = require('./architecture-component-profile.cjs');

const { parseArchitectureRelationCommand } = require('./architecture-relations.cjs');

const {
  parseArchitectureContractCommand,
  parseArchitecturePortCommand,
  parseArchitectureStorageIoCommand,
} = require('./architecture-contracts-io.cjs');

const { parseArchitectureFitnessCommand } = require('./architecture-fitness.cjs');

const { parseArchitectureEvidenceCommand } = require('./architecture-evidence.cjs');

const { parseFeatureMechanizationCommand } = require('./feature-mechanization.cjs');

const { parseFowlerAnalysisCommand } = require('./fowler.cjs');

const { parseDocsResolutionCommand } = require('./docs.cjs');

const operationHelp = Object.freeze({
  component: {
    operations: ['create', 'revise', 'reparent'],
    usage:
      'pnpm planning:db:operate component <create|revise|reparent> --component <SYS-ID> --actor <actor>',
    details: [
      'CreateGovernanceComponent records DB-authored governance component ownership.',
      'ReviseGovernanceComponent overlays imported ownership, status, and semantic metadata through a scoped, audited DB command.',
      'Revise accepts --cq-rails and --ddd-owner corrections, plus exact --remove-responsibility, --remove-reason-to-change, --remove-non-goal and --remove-public-api deltas with their existing add flags.',
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
      '--source-bindings <JSON-array> replaces the component association set with --expected-bindings-hash; omission preserves it.',
      'Optional paired --expected-responsibility-status and --responsibility-status promote only named existing owned responsibilities proposed→approved or approved→implemented atomically; omission preserves existing status.',
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
      '--red-green-cycle <existing-id> reconciles one cycle with --expected-revision and explicit admitted --patch-surface evidence.',
      '--replace-current true replaces the complete current declaration, requires --expected-revision on existing rails, and removes obsolete metadata.',
      'Requires --ddd-owner, --implementation-plan, --source-ref, --source-content-sha256, governance/doc/surface/validation fields, and at least one --implementation-ref in path#symbol form.',
      'Referenced rails require the exact pair --reference-only true and --authority-ref <canonical-source>.',
      'record --catalog-reconciliation <json-file> performs explicitly scoped, atomic metadata repair without rebuilding declarations; no other CLI flags may be mixed into this mode.',
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

function printOperationResult(result) {
  if (result.catalogReconciliation) {
    console.log(
      `[planning:db:operate] catalog reconciliation changed=${result.catalogReconciliation.changed} idempotent=${result.idempotent}`
    );
    return;
  }
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

module.exports = {
  buildPlanningDbOperateHelpText,
  parseArgs,
  printOperationResult,
  resolveOperateHelpRequest,
};
