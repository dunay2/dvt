import { describe, expect, it } from 'vitest';
import {
  expressionStageDraft,
  projectExpressionStage,
  withoutLastOutput,
  withScalarOutput,
  withWindowOutput,
} from './canvasRelationalExpressionStage.test-support';

describe('Canvas relational Expression/Derive stage projection', () => {
  it('keeps a direct ProjectRel as projection with only passthrough outputs', () => {
    const { projection } = projectExpressionStage(expressionStageDraft());

    expect(projection.root.operation).toBe('projection');
    expect(projection.root.projectionSummary).toEqual({
      passthroughFieldCount: 2,
      scalarFieldCount: 0,
      windowFieldCount: 0,
    });
  });

  it('classifies an emitted scalar output as an Expression stage', () => {
    const { projection } = projectExpressionStage(withScalarOutput());

    expect(projection.root.operation).toBe('expression');
    expect(projection.root.projectionSummary).toEqual({
      passthroughFieldCount: 2,
      scalarFieldCount: 1,
      windowFieldCount: 0,
    });
  });

  it('keeps an emitted Window output distinct from scalar derivation', () => {
    const { projection } = projectExpressionStage(withWindowOutput());

    expect(projection.root.operation).toBe('window');
    expect(projection.root.projectionSummary).toEqual({
      passthroughFieldCount: 2,
      scalarFieldCount: 0,
      windowFieldCount: 1,
    });
  });

  it('projects scalar and Window outputs in one field-transformation stage', () => {
    const { projection } = projectExpressionStage(withWindowOutput(withScalarOutput()));

    expect(projection.root.operation).toBe('field_transform');
    expect(projection.root.projectionSummary).toEqual({
      passthroughFieldCount: 2,
      scalarFieldCount: 1,
      windowFieldCount: 1,
    });
  });

  it('fails closed when an authored expression is not emitted', () => {
    expect(() => projectExpressionStage(withoutLastOutput(withScalarOutput()))).toThrow(
      'Substrait connected-source projection is invalid.'
    );
  });
});
