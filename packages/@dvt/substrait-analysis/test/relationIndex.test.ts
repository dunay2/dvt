import { describe, expect, it } from 'vitest';

import type { SubstraitDocument } from '../src/document.js';
import { indexSubstraitRelations as inspect } from '../src/relationIndex.js';
import type { SubstraitRelationIndex } from '../src/relationIndex.js';

import { relationsFixture } from './relationsFixture.js';

function indexSubstraitRelations(document: SubstraitDocument): SubstraitRelationIndex {
  const result = inspect(document);
  if (!result.ok) throw result.error;
  return result.index;
}

describe('canonical relation index', () => {
  it.each(['join', 'cross', 'set'] as const)(
    'indexes transformed inputs in every %s port in semantic order',
    (kind) => {
      const f = relationsFixture();
      const left = f.unary('filter', f.read());
      const right = f.unary('project', f.read());
      const root = f.combine(kind, [left, right]);
      const document = f.document(root);
      document.sidecar.relations.reverse();
      const index = indexSubstraitRelations(document);
      expect(index.rootId).toBe('r5');
      expect(index.relations.get('r5')?.inputs).toEqual(['r2', 'r4']);
      expect(index.relations.get('r2')?.consumers).toEqual(['r5']);
      expect(index.relations.get('r4')?.relation).toBe(right);
      expect(index.postorder).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
      expect(index.byAnchor.get(4)).toBe('r4');
      expect(index.fields.get('f4')?.relationId).toBe('r4');
    }
  );

  it('keeps repeated physical inputs distinct and SET operand order', () => {
    const f = relationsFixture();
    const root = f.combine('set', [f.read(), f.read(), f.read()]);
    const index = indexSubstraitRelations(f.document(root));
    expect(index.relations.get('r4')?.inputs).toEqual(['r1', 'r2', 'r3']);
    expect(index.fields.size).toBe(4);
    expect(index.relations.size).toBe(4);
  });

  it('preserves the order of a wide SET without collapsing occurrences', () => {
    const f = relationsFixture();
    const inputs = Array.from({ length: 4096 }, () => f.read());
    const index = indexSubstraitRelations(f.document(f.combine('set', inputs)));
    expect(index.relations.get(index.rootId)?.inputs).toEqual(
      inputs.map((_, ordinal) => `r${ordinal + 1}`)
    );
    expect(index.postorder).toHaveLength(inputs.length + 1);
  });

  it('indexes deep plans without recursive traversal or subtree copies', () => {
    const f = relationsFixture();
    let root = f.read();
    for (let depth = 0; depth < 12000; depth++) root = f.unary('project', root);
    const index = indexSubstraitRelations(f.document(root));
    expect(index.relations.size).toBe(12001);
    expect(index.postorder[0]).toBe('r1');
    expect(index.postorder.at(-1)).toBe('r12001');
    expect(index.relations.get(index.rootId)?.relation).toBe(root);
  });

  it.each(['project', 'filter', 'aggregate', 'sort', 'fetch'] as const)(
    'retains the exact %s input',
    (kind) => {
      const f = relationsFixture();
      const index = indexSubstraitRelations(f.document(f.unary(kind, f.read())));
      expect(index.relations.get('r2')?.inputs).toEqual(['r1']);
    }
  );

  it.each([
    'missing binding',
    'duplicate anchor',
    'duplicate identity',
    'foreign field',
    'duplicate field',
    'missing input',
    'cycle',
    'unsupported operator',
  ])('rejects %s rather than silently losing a branch', (fault) => {
    const f = relationsFixture();
    const root = f.unary('project', f.read());
    const document = f.document(root);
    if (fault === 'missing binding') document.sidecar.relations.pop();
    if (fault === 'duplicate anchor') document.sidecar.relations[1]!.relAnchor = 1;
    if (fault === 'duplicate identity') document.sidecar.relations[1]!.relationId = 'r1';
    if (fault === 'foreign field') document.sidecar.fields[0]!.relationId = 'foreign';
    if (fault === 'duplicate field') document.sidecar.fields[1]!.fieldId = 'f1';
    if (root.relType.case !== 'project') throw new Error('Expected ProjectRel');
    if (fault === 'missing input') root.relType.value.input = undefined;
    if (fault === 'cycle') root.relType.value.input = root;
    if (fault === 'unsupported operator') root.relType = { case: undefined };
    const result = inspect(document);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected rejected structure');
    expect(result.error.code).toBe(
      fault === 'unsupported operator'
        ? 'unsupported_relation'
        : fault === 'missing input'
          ? 'invalid_structure'
          : 'invalid_binding'
    );
  });
});
