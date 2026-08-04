import type {
  StepDefinition,
  StepExecutionIdentity,
  TemporalStepPluginRunner,
} from '@dvt/adapter-temporal';
import type { LoadObjectFileToPostgresStepTypeConfig, ResolvedRunContext } from '@dvt/contracts';

export type ObjectFilePostgresScalar = string | number | boolean | null;
export type ObjectFilePostgresRow = Readonly<Record<string, ObjectFilePostgresScalar>>;

export interface ContentAddressedObjectReadInput {
  readonly uri: string;
  readonly maxBytes: number;
  readonly signal?: globalThis.AbortSignal;
}

export interface ContentAddressedObjectReadResult {
  readonly bytes: Uint8Array;
  readonly contentLength?: number;
  readonly contentType?: string;
}

export interface ContentAddressedObjectReader {
  read(input: ContentAddressedObjectReadInput): Promise<ContentAddressedObjectReadResult>;
}

export interface ObjectFilePostgresLoadInput {
  readonly schema: 'staging';
  readonly relation: string;
  readonly columns: LoadObjectFileToPostgresStepTypeConfig['columns'];
  readonly rows: readonly ObjectFilePostgresRow[];
  readonly signal?: globalThis.AbortSignal;
}

export interface ObjectFilePostgresLoadResult {
  readonly rowsWritten: number;
  readonly publicationOutcome: 'created' | 'replaced';
}

export interface ObjectFilePostgresRelationalLoader {
  load(input: ObjectFilePostgresLoadInput): Promise<ObjectFilePostgresLoadResult>;
}

export interface ObjectFilePostgresPluginExecutionInput {
  readonly step: StepDefinition;
  readonly config: LoadObjectFileToPostgresStepTypeConfig;
  readonly executionIdentity: StepExecutionIdentity;
  readonly runContext: ResolvedRunContext;
}

export type ObjectFilePostgresPluginRunner =
  TemporalStepPluginRunner<ObjectFilePostgresPluginExecutionInput>;
