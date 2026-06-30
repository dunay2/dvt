import { describe, expect, it } from 'vitest';

import NodePropertiesTabsSource from './NodePropertiesTabs.tsx?raw';

describe('NodePropertiesTabs architecture', () => {
  it('delegates section body markup to the node property section presentation view', () => {
    expect(NodePropertiesTabsSource).toContain('NodePropertySectionView');
    expect(NodePropertiesTabsSource).not.toContain('function renderSectionBody');
    expect(NodePropertiesTabsSource).not.toContain('<table');
    expect(NodePropertiesTabsSource).not.toContain('<dl');
    expect(NodePropertiesTabsSource).not.toContain('<pre');
  });
});
