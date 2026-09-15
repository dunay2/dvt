/**
 * Owned concern: define DVT PostgreSQL activity ports outside Temporal core.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Keep SQL artifact reading and publication lifecycle behind injected runner ports.
 * @consequence The activity orchestrates one workload without owning provider resources.
 * @version 1.0.0
 */
import type {
  PostgresDvtStableTablePublishInput,
  PostgresDvtStableTablePublishResult,
} from '@dvt/adapter-postgres';
import type {
  StepDefinition,
  StepExecutionIdentity,
  TemporalStepPluginRunner,
} from '@dvt/adapter-temporal';
import type { IRunExecutionContextReader } from '@dvt/artifacts';
import type {
  DvtOperationalWorkloadV2,
  DvtPostgresPluginContext,
  ResolvedRunContext,
  RunExecutionContext,
} from '@dvt/contracts';

export interface DvtPostgresPluginExecutionInput {
  readonly step: StepDefinition;
  readonly config: DvtOperationalWorkloadV2;
  readonly executionIdentity: StepExecutionIdentity;
  readonly runContext: ResolvedRunContext;
  readonly runExecutionContext: RunExecutionContext;
  readonly pluginContext: DvtPostgresPluginContext;
}

export type DvtPostgresPluginRunnerPort = TemporalStepPluginRunner<DvtPostgresPluginExecutionInput>;

export interface DvtPostgresStepActivityDeps {
  readonly runExecutionContextReader: IRunExecutionContextReader;
  readonly runner: DvtPostgresPluginRunnerPort;
}

export interface DvtSqlArtifactReader {
  read(input: {
    readonly storageUri: string;
    readonly sha256: string;
    readonly sizeBytes: number;
    readonly signal?: globalThis.AbortSignal;
  }): Promise<Uint8Array>;
}

export interface DvtPostgresPublicationCapability {
  publish(input: PostgresDvtStableTablePublishInput): Promise<PostgresDvtStableTablePublishResult>;
  close(): Promise<void>;
}

export type DvtPostgresPublicationCapabilityFactory = (
  connectionString: string
) => DvtPostgresPublicationCapability;
