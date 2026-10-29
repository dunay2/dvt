/**
 * @file scripts/planning-db-operate.cjs
 * @ownedConcern Execute database architecture and governance command rails with idempotent audit.
 * @baseline ADR-0055: Planning DB canonical operational source
 * @decision Keep operational writes behind explicit command rails instead of direct generated-file edits.
 * @consequence Architecture, docs resolutions, and governance component definitions share
 *   validation, idempotency, and audit semantics before projections consume them.
 * @version 1.2.0
 */

const {
  buildPlanningDbOperateHelpText,
  parseArgs,
  printOperationResult,
  resolveOperateHelpRequest,
} = require('./planning-db/operate/cli.cjs');

const {
  applyDocsResolutionOperation,
  assertDocsResolutionIdempotentReplayMatches,
  materializeDocsResolutionCommand,
  planDocsResolutionOperation,
} = require('./planning-db/operate/docs.cjs');

const {
  applyArchitectureDesignCreateOperation,
  applyArchitectureDesignTransitionOperation,
  assertArchitectureDesignIdempotentReplayMatches,
  planArchitectureDesignCreateOperation,
  planArchitectureDesignTransitionOperation,
  writePlannedArchitectureDesignTransitionOperation,
} = require('./planning-db/operate/architecture-design-operations.cjs');

const {
  applyArchitectureComponentRecordOperation,
  applyArchitectureComponentResponsibilityRetireOperation,
  planArchitectureComponentRecordOperation,
  planArchitectureComponentResponsibilityRetireOperation,
  writePlannedArchitectureComponentRecordOperation,
  writePlannedArchitectureComponentResponsibilityRetireOperation,
} = require('./planning-db/operate/architecture-component-profile.cjs');

const {
  applyArchitectureRelationRecordOperation,
  planArchitectureRelationRecordOperation,
} = require('./planning-db/operate/architecture-relations.cjs');

const {
  applyArchitectureContractRecordOperation,
  applyArchitecturePortRecordOperation,
  applyArchitectureStorageIoRecordOperation,
  planArchitectureContractRecordOperation,
  planArchitecturePortRecordOperation,
  planArchitectureStorageIoRecordOperation,
  writePlannedArchitectureContractRecordOperation,
  writePlannedArchitecturePortRecordOperation,
  writePlannedArchitectureStorageIoRecordOperation,
} = require('./planning-db/operate/architecture-contracts-io.cjs');

const {
  applyArchitectureFitnessScanOperation,
  planArchitectureFitnessScanOperation,
  writePlannedArchitectureFitnessScanOperation,
} = require('./planning-db/operate/architecture-fitness.cjs');

const {
  applyArchitectureEvidenceRecordOperation,
  applyArchitectureEvidenceRetireOperation,
  applyArchitectureObservabilityRecordOperation,
  applyArchitectureTestRecordOperation,
  applyArchitectureTestRetireOperation,
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
} = require('./planning-db/operate/architecture-evidence.cjs');

const {
  applyComponentCreateOperation,
  applyComponentReparentOperation,
  applyComponentReviseOperation,
  assertComponentIdempotentReplayMatches,
  writePlannedComponentCreateOperation,
  writePlannedComponentReparentOperation,
  writePlannedComponentReviseOperation,
} = require('./planning-db/operate/component-operations.cjs');

const {
  applyDbSurfaceUpsertOperation,
  assertDbSurfaceIdempotentReplayMatches,
  planDbSurfaceUpsertOperation,
  validateDbSurfaceAuthorityMode,
  validateDbSurfaceWriteRailKind,
  writePlannedDbSurfaceUpsertOperation,
} = require('./planning-db/operate/db-surface.cjs');

const {
  applyFeatureMechanizationRailRecordOperation,
  applyFeatureMechanizationRailRetireOperation,
  assertFeatureMechanizationRailIdempotentReplayMatches,
  assertFeatureMechanizationReferenceAuthority,
  planFeatureMechanizationRailRecordOperation,
  planFeatureMechanizationRailRetireOperation,
  writePlannedFeatureMechanizationRailRecordOperation,
  writePlannedFeatureMechanizationRailRetireOperation,
} = require('./planning-db/operate/feature-mechanization.cjs');

const {
  applyGovernanceRefreshRunRecordOperation,
  planGovernanceRefreshRunRecordOperation,
  writePlannedGovernanceRefreshRunRecordOperation,
} = require('./planning-db/governance-refresh-write-rail.cjs');

const {
  applyGovernedSourceRefreshOperation,
} = require('./planning-db/governed-source-refresh-write-rail.cjs');

const {
  applyFowlerAnalysisOperation,
  assertFowlerAnalysisIdempotentReplayMatches,
  planFowlerAnalysisOperation,
  writePlannedFowlerAnalysisOperation,
} = require('./planning-db/operate/fowler.cjs');

const {
  assertArchitectureEvidenceOriginAuthenticity,
} = require('./planning-db/operate/evidence-origin.cjs');

const {
  assertArchitectureScopedOperationIdempotentReplayMatches,
} = require('./planning-db/operate/architecture-audit.cjs');

const { databaseUrl } = require('./planning-db-schema.cjs');

const {
  planComponentCreateOperation,
  planComponentReparentOperation,
  planComponentReviseOperation,
  validateComponentStatus,
} = require('./planning-db/operate/component-definition.cjs');

const {
  validateArchitectureDesignStatus,
} = require('./planning-db/operate/architecture-design-authority.cjs');

const {
  validateGovernanceRefreshRunState,
} = require('./planning-db/commands/governance-refresh-command.cjs');

async function main() {
  const command = parseArgs();
  if (command.kind === 'help') {
    console.log(command.helpText);
    return;
  }

  const operations = new Map([
    ['docs_disposition_resolve', applyDocsResolutionOperation],
    ['architecture_design_create', applyArchitectureDesignCreateOperation],
    ['architecture_design_transition', applyArchitectureDesignTransitionOperation],
    ['architecture_component_record', applyArchitectureComponentRecordOperation],
    [
      'architecture_component_responsibility_retire',
      applyArchitectureComponentResponsibilityRetireOperation,
    ],
    ['architecture_relation_record', applyArchitectureRelationRecordOperation],
    ['architecture_contract_record', applyArchitectureContractRecordOperation],
    ['architecture_port_record', applyArchitecturePortRecordOperation],
    ['architecture_storage_io_record', applyArchitectureStorageIoRecordOperation],
    ['architecture_fitness_scan', applyArchitectureFitnessScanOperation],
    ['architecture_test_record', applyArchitectureTestRecordOperation],
    ['architecture_test_retire', applyArchitectureTestRetireOperation],
    ['architecture_observability_record', applyArchitectureObservabilityRecordOperation],
    ['architecture_evidence_record', applyArchitectureEvidenceRecordOperation],
    ['architecture_evidence_retire', applyArchitectureEvidenceRetireOperation],
    ['component_create', applyComponentCreateOperation],
    ['component_revise', applyComponentReviseOperation],
    ['component_reparent', applyComponentReparentOperation],
    ['db_surface_upsert', applyDbSurfaceUpsertOperation],
    ['feature_mechanization_rail_record', applyFeatureMechanizationRailRecordOperation],
    ['feature_mechanization_rail_retire', applyFeatureMechanizationRailRetireOperation],
    ['governance_refresh_run_record', applyGovernanceRefreshRunRecordOperation],
    ['governed_source_content_refresh', applyGovernedSourceRefreshOperation],
  ]);
  const apply =
    operations.get(command.kind) ??
    (command.kind.startsWith('fowler_analysis_') ? applyFowlerAnalysisOperation : null);
  if (apply == null) {
    throw new Error(`Unsupported planning DB operation "${command.kind}".`);
  }
  printOperationResult(await apply(command));
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
  assertFeatureMechanizationReferenceAuthority,
  assertFowlerAnalysisIdempotentReplayMatches,
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
