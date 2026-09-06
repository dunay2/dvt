import { describe, expect, it } from 'vitest';

import { allocateDvtFieldId, allocateDvtRelationId } from '../src/substrait.js';

const UUID_V7 = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

describe('DVT Substrait authoring identity', () => {
  it('allocates opaque UUIDv7-backed relation and field identities from one public seam', () => {
    const relationA = allocateDvtRelationId();
    const relationB = allocateDvtRelationId();
    const fieldA = allocateDvtFieldId();
    const fieldB = allocateDvtFieldId();

    expect(relationA).toMatch(new RegExp(`^dvt_rel_${UUID_V7}$`, 'i'));
    expect(relationB).toMatch(new RegExp(`^dvt_rel_${UUID_V7}$`, 'i'));
    expect(fieldA).toMatch(new RegExp(`^dvt_fld_${UUID_V7}$`, 'i'));
    expect(fieldB).toMatch(new RegExp(`^dvt_fld_${UUID_V7}$`, 'i'));
    expect(new Set([relationA, relationB, fieldA, fieldB]).size).toBe(4);
  });
});
