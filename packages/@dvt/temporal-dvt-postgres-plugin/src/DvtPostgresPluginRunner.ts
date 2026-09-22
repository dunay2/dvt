/**
 * Owned concern: execute one verified DVT SQL artifact and construct authoritative evidence.
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Resolve credentials at execution, delegate publication, and retain immutable identities.
 * @consequence Temporal receives one result while PostgreSQL remains owner of physical execution.
 * @version 1.0.0
 */
import { TextDecoder } from 'node:util';

import {
  PostgresDvtPublicationCapability,
  PostgresDvtPublicationRejectedError,
  type IPostgresCredentialBindingResolver,
  type PostgresDvtStableTablePublishResult,
} from '@dvt/adapter-postgres';
import type { StepResult } from '@dvt/adapter-temporal';
import {
  ArtifactReadError,
  readVerifiedArtifactBytes,
  type ArtifactReadRuntimeOptions,
} from '@dvt/artifacts';
import { ArtifactStoreError, DvtPostgresPublicationEvidenceSchema } from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import { DvtPostgresExecutionRejectedError } from './dvtPostgresPluginErrors.js';
import type {
  DvtPostgresPluginExecutionInput,
  DvtPostgresPluginRunnerPort,
  DvtPostgresPublicationCapabilityFactory,
  DvtSqlArtifactReader,
} from './dvtPostgresPluginTypes.js';

export interface DvtPostgresPluginRunnerOptions {
  readonly credentialResolver: IPostgresCredentialBindingResolver;
  readonly artifactReadOptions?: ArtifactReadRuntimeOptions;
  readonly sqlArtifactReader?: DvtSqlArtifactReader;
  readonly publicationCapabilityFactory?: DvtPostgresPublicationCapabilityFactory;
  readonly getCancellationSignal?: () => globalThis.AbortSignal | undefined;
  readonly now?: () => Date;
  readonly onCleanupFailure?: (error: unknown) => void;
}

export class DvtPostgresPluginRunner implements DvtPostgresPluginRunnerPort {
  private readonly sqlArtifactReader: DvtSqlArtifactReader;
  private readonly publicationCapabilityFactory: DvtPostgresPublicationCapabilityFactory;
  private readonly getCancellationSignal: () => globalThis.AbortSignal | undefined;
  private readonly now: () => Date;

  public constructor(private readonly options: DvtPostgresPluginRunnerOptions) {
    this.sqlArtifactReader = options.sqlArtifactReader ?? createArtifactReader(options);
    this.publicationCapabilityFactory =
      options.publicationCapabilityFactory ??
      ((connectionString) => new PostgresDvtPublicationCapability({ connectionString }));
    this.getCancellationSignal = options.getCancellationSignal ?? (() => undefined);
    this.now = options.now ?? (() => new Date());
  }

  public async execute(input: DvtPostgresPluginExecutionInput): Promise<StepResult> {
    const signal = this.getCancellationSignal();
    assertNotAborted(signal);
    const startedAt = this.now();
    const artifact = input.config.targetProjection.artifact;
    const sql = decodeSql(await readSqlArtifact(this.sqlArtifactReader, artifact, signal));
    const connectionString = await this.options.credentialResolver.resolveCredential(
      input.pluginContext.credentialRef
    );
    if (connectionString === null) reject('DVT_POSTGRES_CREDENTIAL_UNAVAILABLE');
    assertNotAborted(signal);

    const capability = this.publicationCapabilityFactory(connectionString);
    let published: PostgresDvtStableTablePublishResult;
    try {
      published = await capability.publish({
        sql,
        target: input.config.output.target,
        expectedSchemaDigestSha256: input.config.targetProjection.schemaDigestSha256,
        publicationToken: input.pluginContext.publicationToken,
        expectedPredecessorToken:
          input.pluginContext.expectedPredecessorToken === 'absent'
            ? null
            : input.pluginContext.expectedPredecessorToken,
        ...(signal === undefined ? {} : { signal }),
      });
    } catch (error) {
      if (error instanceof PostgresDvtPublicationRejectedError) reject(error.code);
      throw error;
    } finally {
      try {
        await capability.close();
      } catch (cleanupError) {
        this.options.onCleanupFailure?.(cleanupError);
      }
    }
    const completedAt = this.now();
    const semantic = input.config.semantics[0];
    if (semantic === undefined) reject('DVT_SEMANTIC_REFERENCE_REQUIRED');

    return {
      stepId: input.step.stepId,
      status: 'COMPLETED',
      resultEvidence: DvtPostgresPublicationEvidenceSchema.parse({
        evidenceType: 'dvt-postgres-publication',
        environmentId: input.runContext.environmentId,
        plan: {
          planId: input.runExecutionContext.planId,
          planVersion: input.runExecutionContext.planVersion,
          sha256: input.runExecutionContext.planSha256,
        },
        workloadSha256: sha256HexUtf8(jcsCanonicalize(input.config)),
        semanticPlanSha256: semantic.semanticPlanSha256,
        projection: {
          profileId: input.config.targetProjection.profileId,
          toolIdentity: input.config.targetProjection.toolIdentity,
          schemaDigestSha256: input.config.targetProjection.schemaDigestSha256,
          sqlArtifact: {
            storageUri: artifact.storageUri,
            sha256: artifact.sha256,
            sizeBytes: artifact.sizeBytes,
          },
        },
        target: {
          connectionRef: input.config.output.target.connectionRef,
          schema: published.targetSchema,
          relation: published.targetRelation,
        },
        publication: {
          token: published.publicationToken,
          predecessorToken: published.predecessorToken,
          outcome: published.publicationOutcome,
        },
        rowsWritten: published.rowsWritten,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
      }),
    };
  }
}

function createArtifactReader(options: DvtPostgresPluginRunnerOptions): DvtSqlArtifactReader {
  return {
    read: (input) =>
      readVerifiedArtifactBytes(input, {
        artifactLabel: 'DVT compiled SQL',
        uriLabel: 'targetProjection.artifact.storageUri',
        ...options.artifactReadOptions,
        ...(input.signal === undefined ? {} : { abortSignal: input.signal }),
      }),
  };
}

async function readSqlArtifact(
  reader: DvtSqlArtifactReader,
  artifact: DvtPostgresPluginExecutionInput['config']['targetProjection']['artifact'],
  signal: globalThis.AbortSignal | undefined
): Promise<Uint8Array> {
  try {
    return await reader.read({
      storageUri: artifact.storageUri,
      sha256: artifact.sha256,
      sizeBytes: artifact.sizeBytes,
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error) {
    if (error instanceof ArtifactReadError || error instanceof ArtifactStoreError) {
      reject('DVT_SQL_ARTIFACT_INVALID');
    }
    throw error;
  }
}

function decodeSql(bytes: Uint8Array): string {
  try {
    const sql = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (sql.trim().length === 0) reject('DVT_SQL_ARTIFACT_INVALID');
    return sql;
  } catch (error) {
    if (error instanceof DvtPostgresExecutionRejectedError) throw error;
    reject('DVT_SQL_ARTIFACT_INVALID');
  }
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) throw signal.reason ?? new Error('DVT execution cancelled.');
}

function reject(code: string): never {
  throw new DvtPostgresExecutionRejectedError(code);
}
