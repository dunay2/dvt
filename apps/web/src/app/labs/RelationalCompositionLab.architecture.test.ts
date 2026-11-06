import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const LAB_COMPONENT_PATH = join(import.meta.dirname, 'RelationalCompositionLab.tsx');
const POLICY_PATH = resolve(import.meta.dirname, '../views/canvas/canvasViewportInteraction.ts');
const STYLE_PATH = resolve(
  import.meta.dirname,
  '../views/canvas/canvasViewportInteraction.module.css'
);
const MARKER_PATH = resolve(
  import.meta.dirname,
  '../components/canvas/canvasNodeInteractionBoundary.ts'
);

describe('RelationalCompositionLab architecture', () => {
  it('keeps its complete local dependency closure within the declared pure UI boundary', () => {
    const allowed = new Set([POLICY_PATH, STYLE_PATH, MARKER_PATH]);
    const visited = new Set<string>();
    const pending = [LAB_COMPONENT_PATH];
    while (pending.length > 0) {
      const path = pending.pop()!;
      if (visited.has(path)) continue;
      visited.add(path);
      for (const imported of ts.preProcessFile(readFileSync(path, 'utf8'), true, true)
        .importedFiles) {
        const dependency = imported.fileName;
        if (!dependency.startsWith('.')) {
          expect(['react', '@xyflow/react']).toContain(dependency);
          continue;
        }
        const target = resolve(
          path,
          '..',
          dependency.endsWith('.css') ? dependency : dependency + '.ts'
        );
        expect(allowed.has(target), `Unadmitted laboratory dependency: ${dependency}`).toBe(true);
        if (!target.endsWith('.css')) pending.push(target);
      }
    }
  });
});
