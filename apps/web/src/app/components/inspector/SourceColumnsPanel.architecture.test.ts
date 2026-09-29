/** Owned concern: keep Source column facts, interaction and visual rendering separate. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Source Columns responsibility boundaries', () => {
  it('keeps contract interpretation in the pure projection, not the coordinator', () => {
    const model = readFileSync(new URL('./sourceColumnFacts.ts', import.meta.url), 'utf8');
    const panel = readFileSync(new URL('./SourceColumnsPanel.tsx', import.meta.url), 'utf8');
    expect(model).not.toMatch(/from ['"]react|stores\/|fetch\(/);
    expect(panel).not.toMatch(
      /@dvt\/contracts|safeParse|resolveSourceObjectColumnConstraintSemantics/
    );
    expect(panel).toContain('writeGraphColumnTransfer');
    expect(panel).toContain('useCanvasInspectorListOrder');
  });

  it('keeps visual components passive and reuses the existing tab and transfer rails', () => {
    for (const filename of ['SourceColumnRow.tsx', 'SourceColumnDetail.tsx']) {
      const view = readFileSync(new URL(filename, import.meta.url), 'utf8');
      expect(view).not.toMatch(
        /@dvt\/contracts|stores\/|useEffect|useState|fetch\(|writeGraphColumnTransfer/
      );
    }
    const tabs = readFileSync(new URL('./NodePropertiesTabs.tsx', import.meta.url), 'utf8');
    expect(tabs).toContain('<SourceColumnsPanel');
    expect(tabs).toContain('<NodePropertySectionView');
  });
});
