/**
 * Owned concern: render one protected terminal Transform to PostgreSQL and
 * publish its exact SQL bytes through the generic content-addressed store.
 */
import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import {
  decodeDvtSubstraitPlanV1,
  type DvtSubstraitSemanticDocumentV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import {
  projectDvtConnectedFieldDraftToPostgresSql,
  type ProjectedDvtConnectedFieldSql,
} from '@dvt/postgres-projection';

import type { DvtTerminalTransformProjectionBinding } from './dvtOperationalWorkloadProjector.js';
import {
  resolveDvtTerminalTransformClosure,
  sameConnection,
} from './resolveDvtTerminalTransformClosure.js';

const SQL_MEDIA_TYPE = 'application/sql; charset=utf-8';

type ProjectSemanticDocument = (
  document: DvtSubstraitSemanticDocumentV1,
  nodeBinding: { readonly sourceNodeId: string; readonly targetNodeId: string }
) => Promise<ProjectedDvtConnectedFieldSql>;

export type DvtPostgresTargetProjectionPublishInput = {
  readonly scope: {
    readonly tenantId: string;
    readonly projectId: string;
    readonly environmentId: string;
  };
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly selectedNodeIds: readonly string[];
  readonly selectedEdgeIds: readonly string[];
};

export class DvtPostgresTargetProjectionPublisher {
  public constructor(
    private readonly deps: {
      readonly artifactStore: Pick<IContentAddressedArtifactStore, 'publish'>;
      readonly locateArtifact: (identity: {
        readonly tenantId: string;
        readonly sha256: string;
      }) => string;
      readonly projectSemanticDocument?: ProjectSemanticDocument;
    }
  ) {}

  public async publish(
    input: DvtPostgresTargetProjectionPublishInput
  ): Promise<DvtTerminalTransformProjectionBinding> {
    const closure = resolveDvtTerminalTransformClosure(input);
    const semanticDocument = closure.authority.semanticDocument;
    const project = this.deps.projectSemanticDocument ?? projectCanonicalConnectedFieldDocument;
    const projected = await project(semanticDocument, {
      sourceNodeId: closure.source.id,
      targetNodeId: closure.transform.id,
    });
    if (
      projected.projection.targetNodeId !== closure.transform.id ||
      projected.projection.source.nodeId !== closure.source.id ||
      !sameConnection(
        projected.projection.source.sourceRef.connectionRef,
        closure.connectedSource.connectionRef
      ) ||
      projected.projection.source.sourceRef.sourceObjectId !==
        closure.connectedSource.sourceObjectId
    ) {
      throw new Error('PostgreSQL projection does not match the protected terminal closure.');
    }

    const bytes = Buffer.from(projected.sql, 'utf8');
    const sha256 = sha256Hex(bytes);
    const storageUri = this.deps.locateArtifact({
      tenantId: input.scope.tenantId,
      sha256,
    });
    const published = await this.deps.artifactStore.publish({
      tenantId: input.scope.tenantId,
      storageUri,
      sha256,
      sizeBytes: bytes.byteLength,
      mediaType: SQL_MEDIA_TYPE,
      bytes,
    });
    if (
      published.storageUri !== storageUri ||
      published.sha256 !== sha256 ||
      published.sizeBytes !== bytes.byteLength ||
      published.mediaType !== SQL_MEDIA_TYPE
    ) {
      throw new Error('Content-addressed artifact receipt does not match published SQL.');
    }

    return {
      outputNodeId: closure.transform.id,
      semanticPlanSha256: semanticDocument.semanticPlan.sha256,
      connectionRef: closure.connectedSource.connectionRef,
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: published.sha256,
        storageUri: published.storageUri,
        sizeBytes: published.sizeBytes,
        encoding: 'utf-8',
      },
    };
  }
}

function projectCanonicalConnectedFieldDocument(
  document: DvtSubstraitSemanticDocumentV1,
  nodeBinding: { readonly sourceNodeId: string; readonly targetNodeId: string }
): Promise<ProjectedDvtConnectedFieldSql> {
  return projectDvtConnectedFieldDraftToPostgresSql(
    {
      plan: decodeDvtSubstraitPlanV1(document),
      sidecar: document.sidecar,
    },
    nodeBinding
  );
}
