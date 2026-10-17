import { parseExecutionPlan, parsePlanRef } from '@dvt/contracts';
import { describe, expect, it, vi, type MockedFunction } from 'vitest';

import type { RunExecutionContextPreparation } from '../../../src/application/ports/runExecutionContextPreparer.js';
import type { IWarehouseConnectionCatalog } from '../../../src/application/ports/warehouseSourceImport.js';
import {
  DvtPostgresRunExecutionContextPreparer,
  type DvtPostgresPublicationPredecessorReader,
} from '../../../src/application/services/postgres/DvtPostgresRunExecutionContextPreparer.js';
import { publicationHarness } from '../../fixtures/dvtProjectionPublicationHarness.js';
import { buildDvtSinkPublicationDraft } from '../../fixtures/dvtSinkPublicationFixture.js';

async function preparation(): Promise<RunExecutionContextPreparation> {
  const { graph, workload } = await publicationHarness(buildDvtSinkPublicationDraft()).execute();
  const planId = 'a'.repeat(64);
  const planRef = parsePlanRef({
    uri: 'dvt-plan://postgres/sink-plan',
    sha256: 'b'.repeat(64),
    schemaVersion: '1.0',
    planVersion: '1.0',
    planId,
  });
  const plan = parseExecutionPlan({
    metadata: {
      planId,
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: 'c'.repeat(64),
      createdAtIso: '2026-10-15T00:00:00.000Z',
      ownership: workload.scope,
    },
    steps: graph.nodes.map((node) => ({
      stepId: node.nodeId,
      kind: node.stepKind,
      dependsOn: node.dependsOn,
      stepTypeConfig: node.stepTypeConfig,
    })),
  });
  return { plan, planRef, runId: 'sink-run', targetAdapter: 'temporal', scope: workload.scope };
}

function harness(connectionId = 'local-postgres-proof'): {
  getConnection: MockedFunction<IWarehouseConnectionCatalog['getConnection']>;
  observe: MockedFunction<DvtPostgresPublicationPredecessorReader['observe']>;
  preparer: DvtPostgresRunExecutionContextPreparer;
} {
  const getConnection = vi.fn<IWarehouseConnectionCatalog['getConnection']>(async () => ({
    id: connectionId,
    name: 'Warehouse',
    type: 'postgres',
    database: 'analytics',
    credentialRef: 'postgres:warehouse',
    sourceObjects: [],
  }));
  const unexpected = vi.fn(async (): Promise<never> => {
    throw new Error('Unexpected catalog operation');
  });
  const observe = vi.fn<DvtPostgresPublicationPredecessorReader['observe']>(async () => ({
    ok: true,
    predecessorToken: null,
  }));
  const preparer = new DvtPostgresRunExecutionContextPreparer({
    catalog: {
      getConnection,
      listConnections: unexpected,
      listSourceObjects: unexpected,
      createConnection: unexpected,
      renameConnection: unexpected,
    },
    predecessorReader: { observe },
  });
  return { getConnection, observe, preparer };
}

describe('Explicit Sink Run context', () => {
  it('observes only the confirmed Sink destination in the authorized scope', async () => {
    const input = await preparation();
    const state = harness();
    const result = await state.preparer.prepare(input);
    expect(result).toMatchObject({
      ok: true,
      context: {
        expectedPredecessorToken: 'absent',
        publicationToken: expect.stringMatching(/^[a-f0-9]{64}$/u),
      },
    });
    expect(state.getConnection).toHaveBeenCalledWith(input.scope, 'local-postgres-proof');
    expect(state.observe).toHaveBeenCalledOnce();
    expect(state.observe).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ schema: 'analytics', relation: 'orders_sink' }),
      })
    );
    const again = await state.preparer.prepare({ ...input, runId: 'another-run' });
    expect(again.ok && again.context.publicationToken).not.toBe(
      result.ok && result.context.publicationToken
    );
  });
  it('does not observe a destination when the catalog resolves another connection', async () => {
    const input = await preparation();
    const state = harness('foreign');
    expect(await state.preparer.prepare(input)).toMatchObject({
      ok: false,
      cause: 'dvt_run_connection_unavailable',
    });
    expect(state.observe).not.toHaveBeenCalled();
  });
});
