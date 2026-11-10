import { describe, expect, it } from 'vitest';

import NodePropertiesTabsSource from './NodePropertiesTabs.tsx?raw';

describe('NodePropertiesTabs architecture', () => {
  it('leaves standard section copy in the existing read model', () => {
    // A renderer-owned Source label catalog caused Source/Model naming divergence.
    expect(NodePropertiesTabsSource).toContain('sections: model.sections');
    expect(NodePropertiesTabsSource).not.toContain('SOURCE_OVERVIEW_LABEL');
    expect(NodePropertiesTabsSource).not.toContain('resolvePresentedSection');
    expect(NodePropertiesTabsSource).not.toContain('source.overviewLabel');
  });

  it('delegates section body markup to the node property section presentation view', () => {
    expect(NodePropertiesTabsSource).toContain('NodePropertySectionView');
    expect(NodePropertiesTabsSource).not.toContain('function renderSectionBody');
    expect(NodePropertiesTabsSource).not.toContain('<table');
    expect(NodePropertiesTabsSource).not.toContain('<dl');
    expect(NodePropertiesTabsSource).not.toContain('<pre');
  });
});
