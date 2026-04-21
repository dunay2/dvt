import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const GRAPH_CONTRACTS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasGraphHandlerContracts.ts'
);
const GRAPH_BUILDERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasGraphHandlerContractBuilders.ts'
);
const MUTATION_CONTRACTS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasMutationHandlerContracts.ts'
);
const MUTATION_BUILDERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasMutationHandlerContractBuilders.ts'
);

describe('canvas handler contracts architecture', () => {
  it('defines graph and mutation handler seams as semantic contract components', () => {
    expect(GRAPH_CONTRACTS_SOURCE).toContain('Owned concern: semantic contracts');
    expect(MUTATION_CONTRACTS_SOURCE).toContain('Owned concern: semantic contracts');
    expect(GRAPH_CONTRACTS_SOURCE).not.toContain('Pick<');
    expect(MUTATION_CONTRACTS_SOURCE).not.toContain('Pick<');
  });

  it('keeps builder components namespaced and free of hook or domain-policy ownership', () => {
    expect(GRAPH_BUILDERS_SOURCE).toContain('export const canvasGraphHandlerContractBuilders');
    expect(GRAPH_BUILDERS_SOURCE).toContain('edgeAuthoring');
    expect(GRAPH_BUILDERS_SOURCE).toContain('selection');
    expect(GRAPH_BUILDERS_SOURCE).toContain('layout');
    expect(GRAPH_BUILDERS_SOURCE).toContain('nodeAuthoring');
    expect(GRAPH_BUILDERS_SOURCE).not.toContain('useCallback(');
    expect(GRAPH_BUILDERS_SOURCE).not.toContain('useState(');
    expect(GRAPH_BUILDERS_SOURCE).not.toContain('toast.');
    expect(GRAPH_BUILDERS_SOURCE).not.toContain('canvasGraphLifecycle');

    expect(MUTATION_BUILDERS_SOURCE).toContain(
      'export const canvasMutationHandlerContractBuilders'
    );
    expect(MUTATION_BUILDERS_SOURCE).toContain('graphChange');
    expect(MUTATION_BUILDERS_SOURCE).toContain('sourceImport');
    expect(MUTATION_BUILDERS_SOURCE).not.toContain('useCallback(');
    expect(MUTATION_BUILDERS_SOURCE).not.toContain('useState(');
    expect(MUTATION_BUILDERS_SOURCE).not.toContain('toast.');
    expect(MUTATION_BUILDERS_SOURCE).not.toContain('canvasGraphLifecycle');
  });
});
