import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const TOKEN_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'lineageChromeTokens.ts');
const COLUMN_PANEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'LineageColumnPanel.tsx'
);
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

const PANEL_SOURCES = [COLUMN_PANEL_SOURCE, GRAPH_PANEL_SOURCE, IMPACT_SUMMARY_SOURCE];

describe('lineage panel token convergence architecture', () => {
  it('keeps Lineage panel chrome behind a named token component', () => {
    expect(TOKEN_SOURCE).toContain('Owned concern: own Lineage panel chrome visual tokens');
    expect(TOKEN_SOURCE).toContain('lineageChromeClasses');
    expect(TOKEN_SOURCE).toContain('resolveLineageNodeKindClassName');

    for (const source of PANEL_SOURCES) {
      expect(source).toContain("from './lineageChromeTokens'");
      expect(source).not.toMatch(/\b(?:slate|gray|zinc)-\d{2,3}\b/);
      expect(source).not.toMatch(/\b(?:blue|green)-\d{2,3}\b/);
    }
  });

  it('documents the Lineage panel token API, invariants, transitions, and consumers', () => {
    for (const expected of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '```mermaid',
      'lineageChromeClasses',
      'resolveLineageNodeKindClassName',
    ]) {
      expect(COMPONENT_GUIDE).toContain(expected);
    }

    for (const storyId of [
      'US-F24-LINEAGE-TOKEN-01',
      'US-F24-LINEAGE-TOKEN-02',
      'US-F24-LINEAGE-TOKEN-03',
    ]) {
      expect(USER_STORIES).toContain(storyId);
    }
  });
});
