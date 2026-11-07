import { describe, expect, it } from 'vitest';

import { sameSqlColumns, type SqlColumnShape } from './oracle.js';

const column: SqlColumnShape = {
  name: 'id',
  dataTypeID: 25,
  dataTypeSize: -1,
  dataTypeModifier: -1,
};

describe('SQL differential output contract', () => {
  it('compares column count and ordinal order', () => {
    const other = { ...column, name: 'country' };
    expect(sameSqlColumns([column, other], [column, other])).toBe(true);
    expect(sameSqlColumns([column], [])).toBe(false);
    expect(sameSqlColumns([column, other], [other, column])).toBe(false);
  });
  it.each([{ name: 'renamed' }, { dataTypeID: 23 }, { dataTypeSize: 4 }, { dataTypeModifier: 12 }])(
    'detects changes to names, native type or typmod: %o',
    (change) => {
      expect(sameSqlColumns([column], [{ ...column, ...change }])).toBe(false);
    }
  );
});
