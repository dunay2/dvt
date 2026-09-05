import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const TOKEN_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'lineageChromeTokens.ts');
const GRAPH_PANEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'LineageGraphPanel.tsx'
);
const IMPACT_SUMMARY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'LineageImpactSummary.tsx'
);
const COMPONENT_GUIDE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/lineage/lineage-panel-token-component.md'
);
const USER_STORIES = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/lineage/lineage-panel-token-user-stories.md'
);

const PANEL_SOURCES = [GRAPH_PANEL_SOURCE, IMPACT_SUMMARY_SOURCE];

describe('lineage panel token convergence architecture', () => {
  it('keeps current Lineage route chrome behind a named token component', () => {
    expect(TOKEN_SOURCE).toContain('Owned concern: own Lineage route chrome visual tokens');
    expect(TOKEN_SOURCE).toContain('lineageChromeClasses');
    expect(TOKEN_SOURCE).toContain('resolveLineageNodeKindClassName');
    expect(TOKEN_SOURCE).not.toContain('sourceColumn:');
    expect(TOKEN_SOURCE).not.toContain('targetColumn:');

    for (const source of PANEL_SOURCES) {
      expect(source).toContain("from './lineageChromeTokens'");
      expect(source).not.toMatch(/\b(?:slate|gray|zinc)-\d{2,3}\b/);
      expect(source).not.toMatch(/\b(?:blue|green)-\d{2,3}\b/);
    }
  });

  it('documents only the surviving graph and impact consumers', () => {
    for (const expected of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '```mermaid',
      'lineageChromeClasses',
      'resolveLineageNodeKindClassName',
      'LineageGraphPanel',
      'LineageImpactSummary',
    ]) {
      expect(COMPONENT_GUIDE).toContain(expected);
    }
    expect(COMPONENT_GUIDE).not.toContain('LineageColumnPanel');

    for (const storyId of ['US-F24-LINEAGE-TOKEN-01', 'US-F24-LINEAGE-TOKEN-02']) {
      expect(USER_STORIES).toContain(storyId);
    }
    expect(USER_STORIES).not.toContain('US-F24-LINEAGE-TOKEN-03');
  });
});
