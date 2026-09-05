// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import type { FrontendOperabilitySink } from '../../ports/frontendOperability';
import { createApiWorkspacePortHarness } from './workspacePortsApi.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from './workspaceScope.test.harness';

describe('warehouse source-object contract operability', () => {
  installWorkspaceScopeHarness();

  it('records an allowlisted contract event when the typed response parser rejects', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const { warehouseSourceImport } = createApiWorkspacePortHarness(
      { getJson: async <TResponse>() => [] as TResponse },
      { record }
    );

    await expect(warehouseSourceImport.listSourceObjects('warehouse-prod')).rejects.toThrow();
    expect(record).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith({
      type: 'frontend.contract.failed',
      operation: 'ListWarehouseConnectionSourceObjects',
      reasonCode: 'response-contract-rejected',
    });
  });

  it('does not misclassify transport failures as contract failures', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const record = vi.fn<FrontendOperabilitySink['record']>();
    const transportFailure = new Error('network unavailable');
    const { warehouseSourceImport } = createApiWorkspacePortHarness(
      {
        getJson: async () => {
          throw transportFailure;
        },
      },
      { record }
    );

    await expect(warehouseSourceImport.listSourceObjects('warehouse-prod')).rejects.toBe(
      transportFailure
    );
    expect(record).not.toHaveBeenCalled();
  });
});
