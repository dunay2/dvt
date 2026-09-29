/** Owned concern: prove inspection never invents physical Source column facts. */
import { describe, expect, it } from 'vitest';
import { matchesSourceColumn, readSourceColumnFacts, resolveTypeCue } from './sourceColumnFacts';

describe('Source column facts', () => {
  it('retains known names and types when a graph draft has no nullability evidence', () => {
    const node = {
      metadata: {
        columns: [
          { name: 'client_id', type: 'text' },
          { name: 'country', type: 'text' },
        ],
      },
    };
    const facts = readSourceColumnFacts(node);
    expect(facts.map((fact) => fact.column.name)).toEqual(['client_id', 'country']);
    expect(facts[0]?.column.nullable).toBeUndefined();
    expect(
      facts.every(
        (fact) =>
          !matchesSourceColumn(fact, '', 'not-null') && !matchesSourceColumn(fact, '', 'nullable')
      )
    ).toBe(true);
  });
  it('fails closed for unsupported column data instead of leaking ungoverned metadata', () => {
    const node = {
      metadata: { columns: [{ name: 'id', type: 'text', nullable: false, default: 'invented' }] },
    };
    expect(readSourceColumnFacts(node)).toEqual([]);
    expect(readSourceColumnFacts({ metadata: {} })).toEqual([]);
  });

  it('does not interpret a composite unique constraint as independent uniqueness', () => {
    const node = {
      metadata: {
        columns: [
          { name: 'part', type: 'text', nullable: false },
          { name: 'other', type: 'text', nullable: false },
        ],
        constraints: [{ kind: 'unique', columns: ['part', 'other'] }],
      },
    };
    expect(readSourceColumnFacts(node).every((facts) => !facts.independentlyUnique)).toBe(true);
  });

  it('combines normalized search with authoritative constraint filters', () => {
    const facts = {
      column: { name: 'Account', type: 'text', nullable: true },
      primaryKey: false,
      independentlyUnique: true,
    };
    expect(matchesSourceColumn(facts, ' ACC ', 'key')).toBe(true);
    expect(matchesSourceColumn(facts, '', 'nullable')).toBe(true);
    expect(matchesSourceColumn(facts, '', 'not-null')).toBe(false);
    expect(matchesSourceColumn(facts, 'id', 'all')).toBe(false);
  });

  it.each([
    ['text', 'T'],
    ['jsonb', '{}'],
    ['uuid', 'U'],
    ['timestamp', 'DT'],
    ['inet', 'IP'],
    ['numeric', '#'],
    ['boolean', 'B'],
    ['bytea', '01'],
    ['opaque', '·'],
  ])('uses a display-only cue for %s', (type, cue) => {
    expect(resolveTypeCue(type)).toBe(cue);
  });
});
