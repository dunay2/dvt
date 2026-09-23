import { encodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { selectDvtSubstraitRelation } from '../src/relationSelection.js';

import { relationsFixture } from './relationsFixture.js';

describe('exact relation selection', () => {
  it.each(['join', 'cross', 'set'] as const)(
    'selects either transformed %s input by identity without mutation',
    (kind) => {
      const f = relationsFixture();
      const left = f.unary('filter', f.read());
      const right = f.unary('project', f.read());
      const document = f.document(f.combine(kind, [left, right]), true);
      const before = globalThis.structuredClone(document);
      for (const [id, included, relation] of [
        ['r2', ['r1', 'r2'], left],
        ['r4', ['r3', 'r4'], right],
      ] as const) {
        const selected = selectDvtSubstraitRelation(document, id);
        expect(selected.sidecar.relations.map((binding) => binding.relationId)).toEqual(included);
        expect(selected.sidecar.fields.map((field) => field.relationId)).toEqual(included);
        const root = selected.plan.relations[0]!.relType;
        if (root.case !== 'root') throw new Error('Expected root');
        expect(root.value.input).toEqual(relation);
        expect(root.value.input).not.toBe(relation);
        expect(selected.sidecar.semanticPlanSha256).toBe(
          encodeDvtSubstraitPlanV1(selected.plan).sha256
        );
        selected.sidecar.relations[0]!.displayName = 'Edited preview';
        root.value.names[0] = 'changed';
      }
      expect(document).toEqual(before);
    }
  );

  it.each(['unknown identity', 'stale hash', 'missing output name'])(
    'rejects %s without fallback to root',
    (fault) => {
      const f = relationsFixture();
      const document = f.document(f.read(), true);
      if (fault === 'stale hash') document.sidecar.semanticPlanSha256 = 'a'.repeat(64);
      if (fault === 'missing output name') delete document.sidecar.fields[0]!.displayName;
      expect(() =>
        selectDvtSubstraitRelation(document, fault === 'unknown identity' ? 'foreign' : 'r1')
      ).toThrow();
    }
  );
});
