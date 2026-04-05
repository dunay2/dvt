import { describe, expect, it } from 'vitest';

import { PlannerErrorCode } from '../../src/domain/errors.js';
import { InputEnvelopeValidator } from '../../src/domain/InputEnvelopeValidator.js';

const validator = new InputEnvelopeValidator();

const BASE_SELECTION = { selectedNodeIds: ['model.a'] };
const BASE_NODES = [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }];
const BASE_GRAPH_SOURCE = { kind: 'normalized-graph-v1' as const, nodes: BASE_NODES };

describe('InputEnvelopeValidator - source rule', () => {
  it('accepts graphSource as sole graph source', () => {
    expect(() =>
      validator.validate({ graphSource: BASE_GRAPH_SOURCE, selection: BASE_SELECTION })
    ).not.toThrow();
  });

  it('rejects missing graphSource', () => {
    expect(() => validator.validate({ selection: BASE_SELECTION } as never)).toThrow(
      expect.objectContaining({
        code: PlannerErrorCode.INVALID_INPUT,
        message: expect.stringContaining('graphSource is required'),
      })
    );
  });
});

describe('InputEnvelopeValidator - selection shape', () => {
  it('rejects missing selection', () => {
    expect(() => validator.validate({ graphSource: BASE_GRAPH_SOURCE } as never)).toThrow(
      expect.objectContaining({ code: PlannerErrorCode.INVALID_INPUT })
    );
  });

  it('rejects non-array selectedNodeIds', () => {
    expect(() =>
      validator.validate({
        graphSource: BASE_GRAPH_SOURCE,
        selection: { selectedNodeIds: 'not-array' },
      } as never)
    ).toThrow(expect.objectContaining({ code: PlannerErrorCode.INVALID_INPUT }));
  });

  it('rejects non-string entry in selectedNodeIds', () => {
    expect(() =>
      validator.validate({
        graphSource: BASE_GRAPH_SOURCE,
        selection: { selectedNodeIds: [42] },
      } as never)
    ).toThrow(expect.objectContaining({ code: PlannerErrorCode.INVALID_INPUT }));
  });

  it('accepts empty selectedNodeIds array', () => {
    expect(() =>
      validator.validate({ graphSource: BASE_GRAPH_SOURCE, selection: { selectedNodeIds: [] } })
    ).not.toThrow();
  });
});
