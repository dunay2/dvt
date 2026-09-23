import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import {
  createDvtPostgresOutputSchemaDigestV1,
  decodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
  encodeDvtSubstraitPlanV1,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import { projectDvtPostgresOutputSchemaV1 } from '@dvt/postgres-projection';
import { describe, expect, it, vi, type Mock } from 'vitest';

import {
  DvtPostgresTargetProjectionPublisher,
  type DvtPostgresTargetProjectionPublishInput,
} from '../../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import { buildDvtTerminalTransformPreviewDraft } from '../../fixtures/workspaceGraphDraftFixture.js';

function input(typed: boolean): DvtPostgresTargetProjectionPublishInput {
  const draft = buildDvtTerminalTransformPreviewDraft();
  const transform = draft.nodes[1]!;
  const authority = DvtTransformAuthoringAuthorityV1Schema.parse(
    transform.metadata!.transformAuthoring
  );
  const document = authority.semanticDocument;
  if (typed) {
    const plan = decodeDvtSubstraitPlanV1(document);
    const root = plan.relations[0]!.relType;
    if (
      root.case !== 'root' ||
      root.value.input?.relType.case !== 'project' ||
      root.value.input.relType.value.input?.relType.case !== 'read'
    )
      throw new Error('Expected connected-field fixture');
    root.value.input.relType.value.input.relType.value.baseSchema!.struct!.types[0]!.kind = {
      case: 'i64',
      value: {
        $typeName: 'substrait.Type.I64',
        nullability: Type_Nullability.NULLABLE,
        typeVariationReference: 0,
      },
    };
    document.semanticPlan = encodeDvtSubstraitPlanV1(plan);
    document.sidecar.semanticPlanSha256 = document.semanticPlan.sha256;
  }
  transform.metadata!.transformAuthoring = authority;
  return {
    scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'environment-a' },
    draft,
    selectedNodeIds: draft.nodeIds,
    selectedEdgeIds: draft.edges.map((edge) => edge.id),
  };
}

function harness(): {
  publisher: DvtPostgresTargetProjectionPublisher;
  publish: Mock<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>;
} {
  const publish = vi.fn<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>(
    async (request) => ({ ...request, disposition: 'created' })
  );
  const publisher = new DvtPostgresTargetProjectionPublisher({
    artifactStore: { publish },
    locateArtifact: ({ sha256 }) => 's3://artifacts/tenants/tenant-a/' + sha256,
  });
  return { publisher, publish };
}

describe('DvtPostgresTargetProjectionPublisher with canonical documents', () => {
  it('publishes exact projected bytes and fingerprints the semantic output schema', async () => {
    const request = input(true);
    const { publisher, publish } = harness();
    const binding = await publisher.publish(request);
    expect(publish).toHaveBeenCalledOnce();
    const artifact = publish.mock.calls[0]![0];
    const schema = projectDvtPostgresOutputSchemaV1([
      { name: 'order_id', dataType: 'i64', outputOrdinal: 0, nullable: true },
    ])!;
    expect(artifact.bytes.byteLength).toBeGreaterThan(0);
    expect(artifact).toMatchObject({
      tenantId: 'tenant-a',
      sha256: sha256Hex(artifact.bytes),
      sizeBytes: artifact.bytes.byteLength,
      mediaType: 'application/sql; charset=utf-8',
    });
    expect(binding.outputNodeId).toBe(request.draft.nodes[1]!.id);
    expect(binding.schemaDigestSha256).toBe(createDvtPostgresOutputSchemaDigestV1(schema));
    expect(binding.artifact).toMatchObject({
      sha256: artifact.sha256,
      storageUri: artifact.storageUri,
      sizeBytes: artifact.sizeBytes,
    });
  });

  it('preserves SQL publication for an explicitly unbound semantic type without inventing a fingerprint', async () => {
    const { publisher, publish } = harness();
    const binding = await publisher.publish(input(false));
    expect(binding.schemaDigestSha256).toBeUndefined();
    expect(publish).toHaveBeenCalledOnce();
  });

  it.each(['closed gate', 'foreign source'] as const)(
    'rejects %s before artifact publication',
    async (corruption) => {
      const request = input(true);
      if (corruption === 'closed gate')
        request.draft.edges[0]!.metadata = { executionGate: 'closed' };
      else
        request.draft.nodes[0]!.metadata!.connectedSourceRef = {
          schemaVersion: 'connected-source-ref.v1',
          sourceObjectId: 'foreign',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'local-postgres-proof',
            provider: 'postgres',
          },
        };
      const { publisher, publish } = harness();
      await expect(publisher.publish(request)).rejects.toThrow();
      expect(publish).not.toHaveBeenCalled();
    }
  );
});
