import { describe, expect, it } from 'vitest';

import { getClassConstructorParameterPropertyTypes } from './engineArchitectureTestSupport.js';

describe('engine architecture AST test support', () => {
  it('extracts constructor parameter properties by class and type', () => {
    const source = `
      export interface SampleDeps {}
      export class SampleFacade {
        constructor(private readonly deps: SampleDeps) {}
      }
    `;

    expect(getClassConstructorParameterPropertyTypes(source, 'SampleFacade')).toEqual({
      deps: 'SampleDeps',
    });
  });
});
