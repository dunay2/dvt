import { describe, expect, it } from 'vitest';
import { fixture, node } from './canvasOutputExpression.test.fixtures';
import { projectCanvasOutputExpression } from './canvasOutputExpressionProjection';

describe('output expression canonical ownership', () => {
  it('preserves the plan revision and input identity independently of output alias', () => {
    const draft = fixture('buyer');
    const input = draft.sidecar.fields.find((field) => field.displayName === 'customer')!;
    const output = draft.sidecar.fields.find((field) => field.fieldId === 'output:customer')!;
    const result = projectCanvasOutputExpression(node(draft), output.fieldId);
    expect(result).toMatchObject({
      status: 'available',
      fieldId: output.fieldId,
      alias: 'buyer',
      semanticDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    if (result.status !== 'available') throw new Error(result.reason);
    expect(result.graph.nodes[0]?.data.fieldReference).toEqual({
      fieldId: input.fieldId,
      relationId: input.relationId,
    });
    expect(projectCanvasOutputExpression(node(draft), 'buyer').status).toBe('unavailable');
  });
});
