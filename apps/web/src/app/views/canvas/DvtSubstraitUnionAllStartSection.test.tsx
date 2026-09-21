// @vitest-environment jsdom
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { DvtSubstraitUnionAllStartSection } from './DvtSubstraitUnionAllStartSection';
import {
  sourceRef,
  setupWorkbenchTest,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { canvasRelationalOperationPresentation } from './canvasRelationalOperationPresentation';

describe('ordered Set confirmation', () => {
  setupWorkbenchTest();
  it.each([
    'union_all',
    'union_distinct',
    'intersect_distinct',
    'except_distinct',
    'intersect_all',
    'except_all',
  ] as const)('identifies ordered operands of %s without suggesting addition', (operation) => {
    const inputs = ['primary', 'subtract'].map((table) => ({
      nodeId: table,
      schema: 'public',
      table,
      sourceRef: sourceRef(table),
      fields: [],
    }));
    act(() =>
      root.render(
        <DvtSubstraitUnionAllStartSection
          disabled={false}
          operation={operation}
          inputs={inputs}
          onApply={() => {}}
          onCancel={() => {}}
        />
      )
    );
    const copy = resolveCanvasViewCopy('en');
    const label = copy[canvasRelationalOperationPresentation[operation].labelKey];
    expect(container.querySelector('p')?.textContent).toBe(
      `public.primary ${label} public.subtract`
    );
  });
});
