import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../../views/architecture.test.support';

describe('OperationalDrawerPanels architecture', () => {
  it('keeps route drawer panels composed from presentation primitives', () => {
    const panelsSource = readArchitectureSiblingSource(__dirname, 'OperationalDrawerPanels.tsx');
    const primitivesSource = readArchitectureSiblingSource(
      __dirname,
      'OperationalDrawerPanelPrimitives.tsx'
    );

    expect(panelsSource).toContain("from './OperationalDrawerPanelPrimitives'");
    expect(panelsSource).toContain('OperationalDrawerPanelSurface');
    expect(panelsSource).toContain('OperationalDrawerProblemItem');
    expect(panelsSource).toContain('OperationalDrawerPreviewLayout');
    expect(panelsSource).toContain('OperationalDrawerRunActiveSummary');
    expect(panelsSource).not.toContain('className=');
    expect(panelsSource).not.toContain('border-amber-400/40');
    expect(panelsSource).not.toContain('text-[11px]');
    expect(panelsSource).not.toContain('role="tablist"');

    expect(primitivesSource).toContain('export function OperationalDrawerPanelSurface');
    expect(primitivesSource).toContain('export function OperationalDrawerProblemItem');
    expect(primitivesSource).toContain('export function OperationalDrawerPreviewLayout');
    expect(primitivesSource).toContain('export function OperationalDrawerTabs');
  });
});
