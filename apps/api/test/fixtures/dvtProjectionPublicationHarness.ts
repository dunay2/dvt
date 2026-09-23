import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import {
  ConnectedSourceRefSchema,
  DvtOperationalWorkloadContractV1,
  DvtOperationalWorkloadContractV2,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { vi } from 'vitest';

import { DvtOperationalWorkloadProjector } from '../../src/application/services/dvtOperationalWorkloadProjector.js';
import { DvtPostgresTargetProjectionPublisher } from '../../src/application/services/dvtPostgresTargetProjectionPublisher.js';

export function publicationHarness(source: WorkspaceGraphAuthoringDraft, run = false) {
  const draft = globalThis.structuredClone(source);
  if (run) {
    const connectionRef = ConnectedSourceRefSchema.parse(
      draft.nodes.find((node) => node.metadata?.['connectedSourceRef'])?.metadata?.[
        'connectedSourceRef'
      ]
    ).connectionRef;
    const transform = draft.nodes.at(-1)!;
    transform.metadata = {
      ...transform.metadata,
      config: {
        materialized: 'table',
        resultTarget: {
          schemaVersion: 'dvt-transform-result-target.v1',
          connectionRef,
          schema: 'analytics',
          relation: 'result',
        },
      },
    };
  }
  const publish = vi.fn<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>(
    async (request) => ({ ...request, disposition: 'created' })
  );
  const publisher = new DvtPostgresTargetProjectionPublisher({
    artifactStore: { publish },
    locateArtifact: ({ sha256 }) => 's3://artifacts/tenants/tenant-a/' + sha256,
  });
  const input = {
    scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    draft,
    selectedNodeIds: draft.nodeIds,
    selectedEdgeIds: draft.edges.map((edge) => edge.id),
  };
  async function execute() {
    const binding = await publisher.publish(input);
    const result = new DvtOperationalWorkloadProjector().project({
      ...input,
      draftRevision: 'revision-1',
      canvasId: draft.canvas.id!,
      targetProjection: binding,
    });
    if (!result.ok) throw new Error(result.reason);
    const contract = run ? DvtOperationalWorkloadContractV2 : DvtOperationalWorkloadContractV1;
    return {
      binding,
      graph: result.graphSource,
      workload: contract.schema.parse(result.graphSource.nodes[0]?.stepTypeConfig),
    };
  }
  return { input, publisher, publish, execute };
}
