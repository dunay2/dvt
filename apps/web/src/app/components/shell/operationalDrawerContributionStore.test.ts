import { beforeEach, describe, expect, it } from 'vitest';

import {
  type OperationalDrawerContribution,
  useOperationalDrawerContributionStore,
} from './operationalDrawerContributionStore';

const contribution = {
  tabs: [
    { id: 'preview', label: 'Vista previa', count: 1 },
    { id: 'data:orders', label: 'Pedidos', count: null },
  ],
} as unknown as OperationalDrawerContribution;

describe('operational drawer tab visibility', () => {
  beforeEach(() => {
    useOperationalDrawerContributionStore.setState({
      contribution,
      activeTab: 'preview',
      hiddenTabs: [],
    });
  });

  it('hides the active tab without deleting its contribution and selects its next neighbor', () => {
    useOperationalDrawerContributionStore.getState().setOperationalDrawerTabVisibility({
      tab: 'preview',
      visible: false,
    });

    const state = useOperationalDrawerContributionStore.getState();
    expect(state.hiddenTabs).toEqual(['preview']);
    expect(state.activeTab).toBe('data:orders');
    expect(state.contribution?.tabs.map((tab) => tab.id)).toEqual(['preview', 'data:orders']);
  });

  it('keeps selection when a neighbor closes and clears it when every tab is hidden', () => {
    const command =
      useOperationalDrawerContributionStore.getState().setOperationalDrawerTabVisibility;
    command({ tab: 'data:orders', visible: false });
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('preview');

    command({ tab: 'preview', visible: false });

    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: null,
      hiddenTabs: ['data:orders', 'preview'],
    });
  });

  it('restores a hidden tab when it is shown or explicitly selected', () => {
    const command =
      useOperationalDrawerContributionStore.getState().setOperationalDrawerTabVisibility;
    command({ tab: 'preview', visible: false });
    command({ tab: 'data:orders', visible: false });

    command({ tab: 'preview', visible: true });
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: 'preview',
      hiddenTabs: ['data:orders'],
    });

    useOperationalDrawerContributionStore.getState().selectOperationalDrawerTab('data:orders');
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: 'data:orders',
      hiddenTabs: [],
    });
  });
});
