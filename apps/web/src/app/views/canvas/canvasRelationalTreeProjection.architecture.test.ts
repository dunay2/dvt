import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(import.meta.dirname, 'canvasRelationalTreeProjection.ts'), 'utf8');

describe('Canvas relational tree projection architecture', () => {
  it('stays independent from presentation, layout and semantic writes', () => {
    expect(SOURCE).not.toContain("from 'react'");
    expect(SOURCE).not.toContain("from '@xyflow/react'");
    expect(SOURCE).not.toContain('canvasGraphUtils');
    expect(SOURCE).not.toContain('encodeDvtSubstraitSemanticDocument');
  });

  it('remains one bounded read-model module', () => {
    expect(SOURCE.split('\n').length).toBeLessThan(400);
    expect(SOURCE).toContain('export function projectCanvasRelationalTree');
  });
});
