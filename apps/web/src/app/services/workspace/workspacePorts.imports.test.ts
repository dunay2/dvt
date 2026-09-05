// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  createMockWorkspacePorts,
  createMockWorkspaceState,
} from '../../../testing/workspacePortDoubles';
import {
  buildGraphDraftSourceImportResult,
  buildSourceImportCommandInput,
} from '../../../testing/sourceImportTestFixtures';
import { createApiClientHarness } from './workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  clearGrantedWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from './workspaceScope.test.harness';
import { createWorkspacePorts } from './workspacePorts';

const TEST_OPERABILITY_SINK = { record: () => undefined } as const;

describe('workspace ports source import', () => {
  installWorkspaceScopeHarness();

  it('imports selected warehouse tables into the mock workspace graph', async () => {
    const ports = createMockWorkspacePorts();
    const before = await ports.workspaceGraphSnapshotQuery.getGraphSnapshot();
    const events = (await ports.warehouseSourceImport.listSourceObjects('conn-1')).find(
      (sourceObject) =>
        sourceObject.locator.kind === 'relation' &&
        sourceObject.locator.catalog === 'RAW' &&
        sourceObject.locator.schema === 'MARKETING' &&
        sourceObject.locator.name === 'EVENTS'
    );
    expect(events).toBeDefined();

    const result = await ports.warehouseSourceImport.importSources(
      buildSourceImportCommandInput({
        canvasId: 'canvas-marketing',
        idempotencyKey: 'source-import:marketing-events',
        connectionId: 'conn-1',
        objects: [{ objectId: events!.objectId }],
      })
    );

    const after = await ports.workspaceGraphSnapshotQuery.getGraphSnapshot();
    const importedNode = after.nodes.find((node) => node.id === 'src_marketing_events');

    expect(result.success).toBe(true);
    expect(result.sourcesCreated).toBe(1);
    expect(result.objectsImported).toBe(1);
    expect(result.yamlFiles).toEqual(['models/sources/src_marketing.yml']);
    expect(result.outcome).toMatchObject({
      kind: 'graph-draft',
      importedNodeIds: ['src_marketing_events'],
    });
    expect(after.nodes).toHaveLength(before.nodes.length + 1);
    expect(importedNode).toMatchObject({
      id: 'src_marketing_events',
      type: 'SOURCE',
      path: 'models/sources/src_marketing.yml',
      metadata: {
        sourceMetricEvidence: expect.objectContaining({
          rowCount: expect.objectContaining({ value: 45000 }),
          byteSize: expect.objectContaining({ value: 6_800_000 }),
        }),
      },
    });
    expect(importedNode?.columns).toEqual([
      { name: 'event_id', type: 'INTEGER', nullable: false },
      { name: 'campaign_id', type: 'INTEGER', nullable: false },
      { name: 'occurred_at', type: 'TIMESTAMP', nullable: false },
    ]);
  });

  it('isolates graph mutations between default mock service instances', async () => {
    const firstPorts = createMockWorkspacePorts();
    const secondPorts = createMockWorkspacePorts();
    const secondBefore = await secondPorts.workspaceGraphSnapshotQuery.getGraphSnapshot();
    const campaigns = (await firstPorts.warehouseSourceImport.listSourceObjects('conn-1')).find(
      (sourceObject) =>
        sourceObject.locator.kind === 'relation' &&
        sourceObject.locator.schema === 'MARKETING' &&
        sourceObject.locator.name === 'CAMPAIGNS'
    );
    expect(campaigns).toBeDefined();

    await firstPorts.warehouseSourceImport.importSources(
      buildSourceImportCommandInput({
        canvasId: 'canvas-marketing',
        idempotencyKey: 'source-import:marketing-campaigns',
        connectionId: 'conn-1',
        objects: [{ objectId: campaigns!.objectId }],
      })
    );

    const firstAfter = await firstPorts.workspaceGraphSnapshotQuery.getGraphSnapshot();
    const secondAfter = await secondPorts.workspaceGraphSnapshotQuery.getGraphSnapshot();

    expect(firstAfter.nodes.some((node) => node.id === 'src_marketing_campaigns')).toBe(true);
    expect(secondAfter.nodes.some((node) => node.id === 'src_marketing_campaigns')).toBe(false);
    expect(secondAfter.nodes).toHaveLength(secondBefore.nodes.length);
  });

  it('shares mutable mock workspace state only when explicitly requested', async () => {
    const sharedState = createMockWorkspaceState();
    const firstPorts = createMockWorkspacePorts(sharedState);
    const secondPorts = createMockWorkspacePorts(sharedState);
    const contacts = (await firstPorts.warehouseSourceImport.listSourceObjects('conn-1')).find(
      (sourceObject) =>
        sourceObject.locator.kind === 'relation' &&
        sourceObject.locator.schema === 'CRM' &&
        sourceObject.locator.name === 'CONTACTS'
    );
    expect(contacts).toBeDefined();

    await firstPorts.warehouseSourceImport.importSources(
      buildSourceImportCommandInput({
        canvasId: 'canvas-crm',
        idempotencyKey: 'source-import:crm-contacts',
        connectionId: 'conn-1',
        objects: [{ objectId: contacts!.objectId }],
      })
    );

    const secondAfter = await secondPorts.workspaceGraphSnapshotQuery.getGraphSnapshot();

    expect(secondAfter.nodes.some((node) => node.id === 'src_crm_contacts')).toBe(true);
  });

  it('uses protected warehouse endpoints when source import is available', async () => {
    const scope = buildWorkspaceScope();
    setWorkspaceScope(scope);
    const { apiClient, getJson, postJson } = createApiClientHarness({
      getJson: async <TResponse>() =>
        [
          {
            id: 'warehouse-prod',
            name: 'Production warehouse',
            type: 'postgres',
            database: 'analytics',
          },
        ] as TResponse,
      postJson: async <_TRequest, TResponse>() => buildGraphDraftSourceImportResult() as TResponse,
    });
    const ports = createWorkspacePorts(apiClient, TEST_OPERABILITY_SINK);

    await expect(ports.warehouseSourceImport.listWarehouseConnections()).resolves.toHaveLength(1);
    await expect(
      ports.warehouseSourceImport.importSources(
        buildSourceImportCommandInput({
          connectionId: 'conn-1',
        })
      )
    ).resolves.toMatchObject({ success: true });
    expect(getJson).toHaveBeenCalledWith(
      `/workspace/warehouse/connections?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`
    );
    expect(postJson).toHaveBeenCalledWith(
      `/workspace/sources/import?tenantId=${scope.tenantId}&projectId=${scope.projectId}&environmentId=${scope.environmentId}`,
      expect.objectContaining({ connectionId: 'conn-1' })
    );
  });

  it('does not import source objects before server-granted scope resolves', async () => {
    clearGrantedWorkspaceScope();
    const { apiClient, postJson } = createApiClientHarness({
      postJson: async <_TRequest, TResponse>() => ({}) as TResponse,
    });
    const ports = createWorkspacePorts(apiClient, TEST_OPERABILITY_SINK);

    await expect(
      ports.warehouseSourceImport.importSources(
        buildSourceImportCommandInput({
          connectionId: 'conn-1',
        })
      )
    ).rejects.toThrow('workspace_scope_unresolved');
    expect(postJson).not.toHaveBeenCalled();
  });
});
