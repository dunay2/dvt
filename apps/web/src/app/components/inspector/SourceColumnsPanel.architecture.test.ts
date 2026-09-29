/** Owned concern: keep Source column facts, interaction and visual rendering separate. */
import { describe, expect, it } from 'vitest';
import model from './sourceColumnFacts.ts?raw';
import panel from './SourceColumnsPanel.tsx?raw';
import row from './SourceColumnRow.tsx?raw';
import detail from './SourceColumnDetail.tsx?raw';
import tabs from './NodePropertiesTabs.tsx?raw';

describe('Source Columns responsibility boundaries', () => {
  it('keeps contract interpretation in the pure projection, not the coordinator', () => {
    expect(model).not.toMatch(/from ['"]react|stores\/|fetch\(/);
    expect(panel).not.toMatch(
      /@dvt\/contracts|safeParse|resolveSourceObjectColumnConstraintSemantics/
    );
    expect(panel).toContain('writeGraphColumnTransfer');
    expect(panel).toContain('useCanvasInspectorListOrder');
  });

  it('keeps visual components passive and reuses the existing tab and transfer rails', () => {
    for (const view of [row, detail]) {
      expect(view).not.toMatch(
        /@dvt\/contracts|stores\/|useEffect|useState|fetch\(|writeGraphColumnTransfer/
      );
    }
    expect(tabs).toContain('<SourceColumnsPanel');
    expect(tabs).toContain('<NodePropertySectionView');
  });
});
