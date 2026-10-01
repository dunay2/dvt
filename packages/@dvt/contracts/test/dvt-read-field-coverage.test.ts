import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';

import { validateDvtSubstraitReadFieldCoverageV1 } from '../src/index.js';

describe('Read field coverage policy', () => {
  const scalar = create(TypeSchema, { kind: { case: 'string', value: {} } });
  const types = [
    create(TypeSchema, { kind: { case: 'struct', value: { types: [scalar, scalar] } } }),
    scalar,
  ];
  const fields = [
    { fieldId: 'opaque:record', relationId: 'read', outputOrdinal: 0 },
    { fieldId: 'opaque:leaf', relationId: 'read', outputOrdinal: 1 },
    {
      fieldId: 'opaque:first',
      relationId: 'read',
      parentFieldId: 'opaque:record',
      outputOrdinal: 0,
    },
    {
      fieldId: 'opaque:second',
      relationId: 'read',
      parentFieldId: 'opaque:record',
      outputOrdinal: 1,
    },
  ];

  it('accepts complete nested coverage independent of binding order without mutation', () => {
    const bindings = [...fields].reverse();
    const before = globalThis.structuredClone({ types, bindings });
    expect(validateDvtSubstraitReadFieldCoverageV1(types, bindings)).toBeNull();
    expect({ types, bindings }).toEqual(before);
  });

  it.each([
    'nested-hole',
    'root-hole',
    'duplicate-id',
    'duplicate-position',
    'out-of-range',
    'primitive-parent',
    'orphan',
    'cycle',
  ] as const)('rejects %s without constructing an identity', (fault) => {
    const bindings = globalThis.structuredClone(fields);
    if (fault === 'nested-hole') bindings.pop();
    if (fault === 'root-hole') bindings.splice(1, 1);
    if (fault === 'duplicate-id') bindings[3]!.fieldId = bindings[2]!.fieldId;
    if (fault === 'duplicate-position') bindings[3]!.outputOrdinal = 0;
    if (fault === 'out-of-range') bindings[3]!.outputOrdinal = 2;
    if (fault === 'primitive-parent') bindings[3]!.parentFieldId = 'opaque:leaf';
    if (fault === 'orphan') bindings[3]!.parentFieldId = 'missing';
    if (fault === 'cycle') bindings[0]!.parentFieldId = 'opaque:second';
    expect(validateDvtSubstraitReadFieldCoverageV1(types, bindings)).toMatch(
      /exactly one stable identity/
    );
  });

  it.each(['list', 'map'] as const)('does not invent element identities for a %s field', (kind) => {
    const collection = create(TypeSchema, {
      kind:
        kind === 'list'
          ? { case: 'list', value: { type: types[0] } }
          : { case: 'map', value: { key: scalar, value: types[0] } },
    });
    expect(validateDvtSubstraitReadFieldCoverageV1([collection], [fields[0]!])).toBeNull();
    expect(
      validateDvtSubstraitReadFieldCoverageV1([collection], [fields[0]!, fields[2]!])
    ).not.toBeNull();
  });

  it('handles deep struct nesting iteratively', () => {
    let type = scalar;
    const bindings = [
      { fieldId: 'leaf', relationId: 'read', parentFieldId: 'struct:0', outputOrdinal: 0 },
    ];
    for (let depth = 0; depth < 2000; depth += 1) {
      type = create(TypeSchema, { kind: { case: 'struct', value: { types: [type] } } });
      bindings.push({
        fieldId: `struct:${depth}`,
        relationId: 'read',
        parentFieldId: `struct:${depth + 1}`,
        outputOrdinal: 0,
      });
    }
    const root = bindings.pop()!;
    const { parentFieldId: _parent, ...rootBinding } = root;
    expect(validateDvtSubstraitReadFieldCoverageV1([type], [rootBinding, ...bindings])).toBeNull();
  });
});
