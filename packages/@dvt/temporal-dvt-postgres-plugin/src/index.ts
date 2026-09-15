/**
 * @ownedConcern Expose the bounded DVT PostgreSQL Temporal plugin surface.
 * @baseline ADR-0066: Stable PostgreSQL table publication
 */
export {
  createDvtPostgresPluginProfile,
  DVT_POSTGRES_PLUGIN_ID,
  DvtPostgresStepActivity,
} from './DvtPostgresStepActivity.js';
export {
  DvtPostgresPluginRunner,
  type DvtPostgresPluginRunnerOptions,
} from './DvtPostgresPluginRunner.js';
export { DvtPostgresExecutionRejectedError } from './dvtPostgresPluginErrors.js';
export type {
  DvtPostgresPluginExecutionInput,
  DvtPostgresPluginRunnerPort,
  DvtPostgresPublicationCapability,
  DvtPostgresPublicationCapabilityFactory,
  DvtPostgresStepActivityDeps,
  DvtSqlArtifactReader,
} from './dvtPostgresPluginTypes.js';
