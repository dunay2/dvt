import { describe, expect, it } from 'vitest';

import {
  EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE,
  EXECUTION_SELECTION_MODE,
  ExecutableSubgraphSchema,
  ExecutionSelectionSchema,
} from '../src/index.js';

describe('ExecutionSelection contract', () => {
  it('accepts explicit selection over one node id', () => {
    const result = ExecutionSelectionSchema.safeParse({
      mode: EXECUTION_SELECTION_MODE.explicit,
      nodeIds: ['sql_1'],
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty node selections', () => {
    const result = ExecutionSelectionSchema.safeParse({
      mode: EXECUTION_SELECTION_MODE.explicit,
      nodeIds: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects duplicate selected node ids', () => {
    const result = ExecutionSelectionSchema.safeParse({
      mode: EXECUTION_SELECTION_MODE.downstream,
      nodeIds: ['sql_1', 'sql_1'],
    });

    expect(result.success).toBe(false);
  });
});

describe('ExecutableSubgraph contract', () => {
  it('accepts an executable selected closure with no diagnostics', () => {
    const result = ExecutableSubgraphSchema.safeParse({
      selection: {
        mode: EXECUTION_SELECTION_MODE.connectedComponent,
        nodeIds: ['sql_1'],
      },
      nodeIds: ['sql_1', 'source_1'],
      edgeIds: ['edge_1'],
      executable: true,
      diagnostics: [],
    });

    expect(result.success).toBe(true);
  });

  it('accepts a non-executable selected closure with dependency diagnostics', () => {
    const result = ExecutableSubgraphSchema.safeParse({
      selection: {
        mode: EXECUTION_SELECTION_MODE.upstream,
        nodeIds: ['sql_1'],
      },
      nodeIds: ['sql_1'],
      edgeIds: [],
      executable: false,
      diagnostics: [
        {
          code: EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.dependencyGap,
          message: 'Selection is missing required upstream dependency source_1.',
          nodeIds: ['sql_1', 'source_1'],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects executable closures that still carry blocking diagnostics', () => {
    const result = ExecutableSubgraphSchema.safeParse({
      selection: {
        mode: EXECUTION_SELECTION_MODE.explicit,
        nodeIds: ['sql_1'],
      },
      nodeIds: ['sql_1'],
      edgeIds: [],
      executable: true,
      diagnostics: [
        {
          code: EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.selectedNodeMissing,
          message: 'Selected node sql_1 is missing.',
          nodeIds: ['sql_1'],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects non-executable closures that omit diagnostics', () => {
    const result = ExecutableSubgraphSchema.safeParse({
      selection: {
        mode: EXECUTION_SELECTION_MODE.explicit,
        nodeIds: ['sql_1'],
      },
      nodeIds: [],
      edgeIds: [],
      executable: false,
      diagnostics: [],
    });

    expect(result.success).toBe(false);
  });
});
