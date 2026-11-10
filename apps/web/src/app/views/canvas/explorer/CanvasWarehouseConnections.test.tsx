// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { createAppServicesTestOverrides } from '../../../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../../services/AppServicesContext';
import { CanvasWarehouseConnections } from './CanvasWarehouseConnections';

describe('Canvas warehouse connection query boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('presents unavailable without requiring providers or creating fallback services', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    act(() => root.render(<CanvasWarehouseConnections />));
    expect(container.textContent).not.toContain('0');
    expect(container.querySelector('[data-slot="canvas-explorer-connections"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('loads public metadata through the injected port and preserves the existing manage action', async () => {
    const overrides = createAppServicesTestOverrides();
    const listWarehouseConnections = vi.fn(async () => [
      { id: 'local', name: 'Local warehouse', type: 'postgres' as const, database: 'demo' },
    ]);
    const onManage = vi.fn();
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...overrides,
          warehouseSourceImport: { ...overrides.warehouseSourceImport!, listWarehouseConnections },
        }}
      >
        <CanvasWarehouseConnections onManage={onManage} />
      </AppServicesProvider>
    );
    try {
      await waitForReactQuery(
        () => listWarehouseConnections.mock.calls.length === 1 && !mounted.queryClient.isFetching()
      );
      const button = [...mounted.container.querySelectorAll('button')].find(
        (item) =>
          item.getAttribute('aria-label')?.toLowerCase().includes('connections') &&
          item !== mounted.container.querySelector('[aria-expanded]')
      );
      expect(button).toBeDefined();
      await act(async () => button!.click());
      expect(onManage).toHaveBeenCalledTimes(1);
      expect(mounted.container.textContent).not.toContain('healthy');
    } finally {
      await mounted.cleanup();
    }
  });
});
