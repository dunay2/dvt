/** ADR-0071: prove which operator inputs enter a single dbt invocation. */
import { describe, expect, it } from 'vitest';

import {
  DbtVariablesJsonSchema,
  mergeRunParameterDefinitions,
  projectDbtRunVariables,
  resolveRunParameters,
  type RunParameterDefinition,
} from '../src/index.js';

const minimum: RunParameterDefinition = {
  name: 'minimum',
  type: 'integer',
  enabledBy: 'apply_minimum',
  defaultValue: 1,
  projectDefault: 3,
  environmentDefaults: { dev: 7 },
};
const country: RunParameterDefinition = { name: 'country', type: 'text', choices: ['ES', 'FR'] };

describe('model execution parameters', () => {
  it('omits disabled values and their defaults from execution identity', () => {
    const rows = resolveRunParameters([minimum], [], 'dev');
    expect(projectDbtRunVariables(rows)).toEqual({ apply_minimum: false });
  });

  it('keeps zero and false, and resolves only the active environment', () => {
    const overrides = [{ name: 'minimum', enabled: true, value: 0 }];
    const rows = resolveRunParameters([minimum], overrides, 'dev');
    expect(rows[0]).toMatchObject({ source: 'run', value: 0 });
    expect(projectDbtRunVariables(rows)).toEqual({ apply_minimum: true, minimum: 0 });
    expect(
      resolveRunParameters([minimum], [{ name: 'minimum', enabled: true }], 'dev')[0]
    ).toMatchObject({ source: 'environment', value: 7 });
    expect(
      resolveRunParameters([minimum], [{ name: 'minimum', enabled: true }], 'prod')[0]
    ).toMatchObject({ source: 'project', value: 3 });
    expect(
      projectDbtRunVariables(
        resolveRunParameters([{ name: 'active', type: 'boolean', defaultValue: false }], [], 'dev')
      )
    ).toEqual({ active: false });
  });

  it('rejects missing required values, invalid scalar types, and unknown or duplicated inputs', () => {
    expect(() => resolveRunParameters([country], [], 'dev')).toThrow();
    for (const overrides of [
      [{ name: 'country', value: 'DE' }],
      [{ name: 'country', enabled: false }],
      [{ name: 'country', value: true }],
      [{ name: 'unknown', value: 0 }],
      [
        { name: 'country', value: 'ES' },
        { name: 'country', value: 'FR' },
      ],
    ])
      expect(() => resolveRunParameters([country], overrides, 'dev')).toThrow();
    expect(() =>
      resolveRunParameters(
        [{ name: 'cutoff', type: 'date' }],
        [{ name: 'cutoff', value: '2025-02-29' }],
        'dev'
      )
    ).toThrow();
  });

  it('unifies repeated definitions and rejects colliding variable names and enable flags', () => {
    expect(mergeRunParameterDefinitions([[minimum], [country, minimum]])).toEqual([
      country,
      minimum,
    ]);
    expect(() =>
      mergeRunParameterDefinitions([[minimum], [{ ...minimum, defaultValue: 2 }]])
    ).toThrow();
    expect(() =>
      mergeRunParameterDefinitions([[minimum], [{ name: 'apply_minimum', type: 'boolean' }]])
    ).toThrow();
  });

  it('rejects nested, executable and unbounded worker arguments', () => {
    for (const raw of [
      '[]',
      'null',
      '{}',
      '{"country":{}}',
      '{"country":"{{ var(1) }}"}',
      '{"__proto__":true}',
      '{"count":9007199254740992}',
    ]) {
      expect(DbtVariablesJsonSchema.safeParse(raw).success).toBe(false);
    }
    expect(DbtVariablesJsonSchema.parse('{"country":"ES","minimum":0,"apply_minimum":true}')).toBe(
      '{"country":"ES","minimum":0,"apply_minimum":true}'
    );
  });
});
