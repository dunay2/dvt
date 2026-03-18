import { describe, expect, it } from 'vitest';

import { PlannerErrorCode } from '../../src/domain/errors.js';
import { InputEnvelopeValidator } from '../../src/domain/InputEnvelopeValidator.js';

const validator = new InputEnvelopeValidator();

const BASE_SELECTION = { selectedNodeIds: ['model.a'] };
const BASE_NODES = [{ nodeId: 'model.a', resourceType: 'model', dependsOn: [] }];
const BASE_MANIFEST = { nodes: {} };

describe('InputEnvelopeValidator — one-active-source rule', () => {
  it('accepts nodes as sole graph source', () => {
    expect(() =>
      validator.validate({ nodes: BASE_NODES, selection: BASE_SELECTION })
    ).not.toThrow();
  });

  it('accepts manifest as sole graph source', () => {
    expect(() =>
      validator.validate({ manifest: BASE_MANIFEST, selection: BASE_SELECTION })
    ).not.toThrow();
  });

  it('rejects dual-source: manifest + nodes', () => {
    expect(() =>
      validator.validate({ manifest: BASE_MANIFEST, nodes: BASE_NODES, selection: BASE_SELECTION })
    ).toThrow(
      expect.objectContaining({
        code: PlannerErrorCode.INVALID_INPUT,
        message: expect.stringContaining('One-active-source rule violation'),
      })
    );
  });

  it('rejects zero-source: neither manifest nor nodes', () => {
    expect(() => validator.validate({ selection: BASE_SELECTION } as never)).toThrow(
      expect.objectContaining({
        code: PlannerErrorCode.INVALID_INPUT,
        message: expect.stringContaining('No graph source provided'),
      })
    );
  });
});

describe('InputEnvelopeValidator — selection shape', () => {
  it('rejects missing selection', () => {
    expect(() => validator.validate({ nodes: BASE_NODES } as never)).toThrow(
      expect.objectContaining({ code: PlannerErrorCode.INVALID_INPUT })
    );
  });

  it('rejects non-array selectedNodeIds', () => {
    expect(() =>
      validator.validate({
        nodes: BASE_NODES,
        selection: { selectedNodeIds: 'not-array' },
      } as never)
    ).toThrow(expect.objectContaining({ code: PlannerErrorCode.INVALID_INPUT }));
  });

  it('rejects non-string entry in selectedNodeIds', () => {
    expect(() =>
      validator.validate({ nodes: BASE_NODES, selection: { selectedNodeIds: [42] } } as never)
    ).toThrow(expect.objectContaining({ code: PlannerErrorCode.INVALID_INPUT }));
  });

  it('accepts empty selectedNodeIds array', () => {
    expect(() =>
      validator.validate({ nodes: BASE_NODES, selection: { selectedNodeIds: [] } })
    ).not.toThrow();
  });
});
