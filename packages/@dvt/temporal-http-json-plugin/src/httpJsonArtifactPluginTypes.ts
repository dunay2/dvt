import type {
  StepDefinition,
  StepExecutionIdentity,
  TemporalStepPluginRunner,
} from '@dvt/adapter-temporal';
import type {
  IContentAddressedArtifactStore,
  PublishedContentAddressedArtifact,
} from '@dvt/artifacts';
import type { HttpJsonArtifactStepTypeConfig, ResolvedRunContext } from '@dvt/contracts';

export interface HttpJsonAcquireInput {
  readonly endpointRef: string;
  readonly authCredentialRef?: string;
  readonly accept: 'application/json' | 'application/x-ndjson';
  readonly format: 'json' | 'jsonl';
  readonly acceptedStatus: 200;
  readonly maxBytes: number;
  readonly connectTimeoutMs: number;
  readonly requestTimeoutMs: number;
  readonly maxRedirects: number;
  readonly signal?: globalThis.AbortSignal;
}

export interface HttpJsonAcquireResult {
  readonly bytes: Uint8Array;
  readonly statusCode: number;
  readonly mediaType: string;
  readonly redirectCount: number;
}

export interface HttpJsonAcquisitionClient {
  acquire(input: HttpJsonAcquireInput): Promise<HttpJsonAcquireResult>;
}

export interface HttpJsonArtifactPluginExecutionInput {
  readonly step: StepDefinition;
  readonly config: HttpJsonArtifactStepTypeConfig;
  readonly executionIdentity: StepExecutionIdentity;
  readonly runContext: ResolvedRunContext;
}

export type HttpJsonArtifactPluginRunnerPort =
  TemporalStepPluginRunner<HttpJsonArtifactPluginExecutionInput>;

export type HttpJsonArtifactStore = Pick<IContentAddressedArtifactStore, 'publish'>;
export type HttpJsonArtifactPublication = PublishedContentAddressedArtifact;
