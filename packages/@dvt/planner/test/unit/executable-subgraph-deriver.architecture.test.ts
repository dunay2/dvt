/**
 * Owned concern: guard semantic architecture rules for the planner-owned
 * executable-subgraph derivation component.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../../../docs/architecture/components/planner/executable-subgraph-derivation-component.md'
);
const FACADE_PATH = join(import.meta.dirname, '../../src/application/PlannerFacade.ts');
const DERIVER_PATH = join(
  import.meta.dirname,
  '../../src/application/ExecutableSubgraphDeriver.ts'
);

describe('Executable subgraph derivation component architecture', () => {
  it('ships a local component guide with API, invariants, transitions, component map, and consumers', () => {
    expect(existsSync(DOC_PATH)).toBe(true);

    const docText = readFileSync(DOC_PATH, 'utf8');
    for (const section of [
      '## Owned concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Component map',
      '## Consumers',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
    expect(docText).toContain('PlannerFacade#deriveExecutableSubgraph');
    expect(docText).toContain('ExecutableSubgraphDeriver');
    expect(docText).toContain('never widens from selected scope to whole-draft scope');
  });

  it('states owned concern docblocks on the facade and derivation modules', () => {
    for (const path of [FACADE_PATH, DERIVER_PATH]) {
      expect(readFileSync(path, 'utf8')).toContain('Owned concern:');
    }
  });

  it('keeps derivation inside the planner facade and local derivation service', () => {
    const facadeSource = readFileSync(FACADE_PATH, 'utf8');
    const deriverSource = readFileSync(DERIVER_PATH, 'utf8');

    expect(facadeSource).toContain('private readonly executableSubgraphDeriver');
    expect(facadeSource).toContain(
      'deriveExecutableSubgraph(input: DeriveExecutableSubgraphInput)'
    );
    expect(facadeSource).toContain('this.executableSubgraphDeriver.derive');

    expect(deriverSource).toContain('parseExecutableSubgraph');
    expect(deriverSource).toContain('new BuildGraphCommand');
    expect(deriverSource).toContain('topoSort(graph, selectedNodeIds)');
    expect(deriverSource).toContain('EXECUTION_SELECTION_MODE.connectedComponent');
    expect(deriverSource).not.toContain('apps/api');
    expect(deriverSource).not.toContain('apps/web');
  });
});
