import { beforeEach, describe, expect, it } from 'vitest';

import {
  type OperationalDrawerContribution,
  useOperationalDrawerContributionStore,
} from './operationalDrawerContributionStore';

const contribution = {
  tabs: [
    { id: 'log', label: 'Registro', count: null },
    { id: 'problems', label: 'Problemas', count: 1 },
    { id: 'runs', label: 'Ejecuciones', count: 1 },
  ],
} as unknown as OperationalDrawerContribution;

describe('operational drawer tab visibility', () => {
  beforeEach(() => {
    useOperationalDrawerContributionStore.setState({
      contribution,
      activeTab: 'problems',
      hiddenTabs: [],
    });
  });

  it('hides the active tab without deleting its contribution and selects its next neighbor', () => {
    useOperationalDrawerContributionStore.getState().setOperationalDrawerTabVisibility({
      tab: 'problems',
      visible: false,
    });

    const state = useOperationalDrawerContributionStore.getState();
    expect(state.hiddenTabs).toEqual(['problems']);
    expect(state.activeTab).toBe('runs');
    expect(state.contribution?.tabs.map((tab) => tab.id)).toEqual(['log', 'problems', 'runs']);
  });

  it('keeps the active tab when another tab closes and allows every tab to be hidden', () => {
    const command =
      useOperationalDrawerContributionStore.getState().setOperationalDrawerTabVisibility;
    command({ tab: 'log', visible: false });
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('problems');

    command({ tab: 'problems', visible: false });
    command({ tab: 'runs', visible: false });

    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: null,
      hiddenTabs: ['log', 'problems', 'runs'],
    });
  });

  it('restores a hidden tab when it is shown or explicitly selected', () => {
    const command =
      useOperationalDrawerContributionStore.getState().setOperationalDrawerTabVisibility;
    command({ tab: 'log', visible: false });
    command({ tab: 'problems', visible: false });

    command({ tab: 'log', visible: true });
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: 'log',
      hiddenTabs: ['problems'],
    });

    useOperationalDrawerContributionStore.getState().selectOperationalDrawerTab('problems');
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: 'problems',
      hiddenTabs: [],
    });
  });
});
