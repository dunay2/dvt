import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import {
  DvtOperationalWorkloadContractV2,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { DvtOperationalWorkloadProjector } from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import { DvtPostgresTargetProjectionPublisher } from '../../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
import { projectDvtPostgresTransform } from '../../../src/application/services/dvtPostgresTransformProjection.js';
import {
  resolveDvtTerminalTransformClosure,
  type DvtTerminalTransformClosure,
} from '../../../src/application/services/resolveDvtTerminalTransformClosure.js';
import { buildDvtSortFetchPreviewDraft } from '../../fixtures/dvtSortFetchFixture.js';

function closure(draft: WorkspaceGraphAuthoringDraft): DvtTerminalTransformClosure {
  return resolveDvtTerminalTransformClosure({
    draft,
    selectedNodeIds: draft.nodeIds,
    selectedEdgeIds: draft.edges.map((edge) => edge.id),
  });
}

describe('protected SortRel/FetchRel projection', () => {
  it('projects Model Preview and each selected operation through one recursive dispatcher', async () => {
    const { draft, sortRelationId, fetchRelationId } = buildDvtSortFetchPreviewDraft();

    const model = await projectDvtPostgresTransform(closure(draft));
    const selectedSort = await projectDvtPostgresTransform(
      closure(draft),
      undefined,
      sortRelationId
    );
    const selectedFetch = await projectDvtPostgresTransform(
      closure(draft),
      undefined,
      fetchRelationId
    );

    expect(model.sql).toMatch(/ORDER BY\s+customer_id\s+DESC\s+NULLS\s+LAST/);
    expect(model.sql).toMatch(/LIMIT\s+3\s+OFFSET\s+2/);
    expect(selectedSort.sql).toMatch(/ORDER BY\s+customer_id\s+DESC\s+NULLS\s+LAST/);
    expect(selectedSort.sql).not.toMatch(/LIMIT\s+3/);
    expect(selectedFetch.sql).toBe(model.sql);
    expect(model.orderBy).toEqual([{ name: 'customer_id', direction: 'DESC', nulls: 'LAST' }]);
  });

  it('publishes the same canonical Sort/Fetch semantics for Run', async () => {
    const { draft } = buildDvtSortFetchPreviewDraft(true);
    const publish = vi.fn<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>(
      async (request) => ({ ...request, disposition: 'created' })
    );
    const publisher = new DvtPostgresTargetProjectionPublisher({
      artifactStore: { publish },
      locateArtifact: ({ sha256 }) => `memory://sort-fetch/${sha256}`,
    });
    const input = {
      scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      draft,
      selectedNodeIds: draft.nodeIds,
      selectedEdgeIds: draft.edges.map((edge) => edge.id),
    };

    const binding = await publisher.publish(input);
    const result = new DvtOperationalWorkloadProjector().project({
      ...input,
      draftRevision: 'revision-sort-fetch-run',
      canvasId: draft.canvas.id!,
      targetProjection: binding,
    });

    if (!result.ok) throw new Error(result.reason);
    expect(
      DvtOperationalWorkloadContractV2.schema.parse(result.graphSource.nodes[0]?.stepTypeConfig)
        .executionIntent
    ).toBe('run');
    const sql = Buffer.from(publish.mock.calls[0]![0].bytes).toString('utf8');
    expect(sql).toMatch(/ORDER BY\s+customer_id\s+DESC\s+NULLS\s+LAST/);
    expect(sql).toMatch(/LIMIT\s+3\s+OFFSET\s+2/);
  });
});
