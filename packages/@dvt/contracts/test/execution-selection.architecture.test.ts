/**
 * Owned concern: guard semantic architecture rules for the execution
 * selection contract component.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE,
  EXECUTION_SELECTION_MODE,
  ExecutableSubgraphSchema,
  ExecutionSelectionSchema,
} from '../src/index.js';

const DOC_PATH = join(
  import.meta.dirname,
  '../../../../docs/architecture/components/planner/execution-selection-component.md'
);
const PLANNER_CONTRACTS_ROOT = join(import.meta.dirname, '../src/contracts/planner');
const SELECTION_PATH = join(PLANNER_CONTRACTS_ROOT, 'ExecutionSelection.v1.ts');
const SUBGRAPH_PATH = join(PLANNER_CONTRACTS_ROOT, 'ExecutableSubgraph.v1.ts');
const BARREL_PATH = join(PLANNER_CONTRACTS_ROOT, 'index.ts');

describe('ExecutionSelection contract component architecture', () => {
  it('ships a local component guide with API, invariants, transitions, diagnostics, and consumers', () => {
    expect(existsSync(DOC_PATH)).toBe(true);

    const docText = readFileSync(DOC_PATH, 'utf8');
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Diagnostic taxonomy',
      '## Consumers',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
    expect(docText).toContain('planner owns closure derivation');
    expect(docText).toContain('not a second persisted draft family');
  });

  it('states owned concern docblocks on selection, subgraph, and planner-local barrel modules', () => {
    for (const path of [SELECTION_PATH, SUBGRAPH_PATH, BARREL_PATH]) {
      expect(readFileSync(path, 'utf8')).toContain('Owned concern:');
    }
  });

  it('keeps the planner-local barrel narrow and execution-selection-specific', () => {
    const barrelSource = readFileSync(BARREL_PATH, 'utf8');

    expect(barrelSource).toContain('./ExecutionSelection.v1.js');
    expect(barrelSource).toContain('./ExecutableSubgraph.v1.js');
    expect(barrelSource).not.toContain('WorkspaceGraphDraft.v1');
    expect(barrelSource).not.toContain('ExecutionPlan.v1');
  });

  it('keeps selection intent free of persistence-envelope fields', () => {
    const selectionSource = readFileSync(SELECTION_PATH, 'utf8');

    expect(selectionSource).not.toContain('WorkspaceGraphAuthoringDraft');
    expect(selectionSource).not.toContain('WorkspaceGraphDraft');
    expect(selectionSource).not.toContain('expectedRevision');
    expect(selectionSource).not.toContain('idempotencyKey');

    const result = ExecutionSelectionSchema.safeParse({
      mode: EXECUTION_SELECTION_MODE.explicit,
      nodeIds: ['sql_1'],
      scope: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
      },
    });

    expect(result.success).toBe(false);
  });

  it('keeps executable subgraph as a derived read model instead of a persistence envelope', () => {
    const subgraphSource = readFileSync(SUBGRAPH_PATH, 'utf8');

    expect(subgraphSource).not.toContain('WorkspaceGraphDraft');
    expect(subgraphSource).not.toContain('updatedAt');
    expect(subgraphSource).not.toContain('revision');

    const result = ExecutableSubgraphSchema.safeParse({
      selection: {
        mode: EXECUTION_SELECTION_MODE.connectedComponent,
        nodeIds: ['sql_1'],
      },
      nodeIds: ['sql_1', 'source_1'],
      edgeIds: ['edge_1'],
      executable: false,
      diagnostics: [
        {
          code: EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.cycleDetected,
          message: 'Cycle detected in selected closure.',
          edgeIds: ['edge_1'],
        },
      ],
      revision: 'rev-1',
    });

    expect(result.success).toBe(false);
  });
});
