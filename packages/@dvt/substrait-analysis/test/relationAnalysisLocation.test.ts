import { describe, expect, it } from 'vitest';

import { RelationAnalysisSession } from '../src/relationAnalysisSession.js';
import { readRelationStructure } from '../src/relationStructure.js';

import { relationsFixture } from './relationsFixture.js';

describe('exact canonical edit location', () => {
  it.each(['join', 'cross', 'set'] as const)(
    'locates either %s operand without analyzing another branch',
    (kind) => {
      const fixture = relationsFixture();
      const left = fixture.unary('filter', fixture.read());
      const right = fixture.unary('project', fixture.read());
      const root = fixture.combine(kind, [left, right]);
      const document = fixture.document(root);
      const session = new RelationAnalysisSession({ document, scope: 'model' });
      const before = session.work;
      for (const [id, expectedPath] of [
        ['r1', [0, 0]],
        ['r3', [1, 0]],
        ['r5', []],
      ] as const) {
        const location = session.locate(id, session.revision);
        expect(location.path).toEqual(expectedPath);
        let selected = root;
        for (const port of location.path) selected = readRelationStructure(selected).inputs[port]!;
        expect(readRelationStructure(selected).common?.relAnchor).toBe(location.binding.relAnchor);
        expect(location.binding.relationId).toBe(id);
        expect(location.nextAnchor).toBe(6);
      }
      expect(session.work.analyzed).toBe(before.analyzed);
      expect(session.work.fingerprinted).toBe(before.fingerprinted);
      expect(() => session.locate('missing', session.revision)).toThrow();
      expect(() => session.locate('r1', session.revision + 1)).toThrow();
    }
  );

  it('returns owned value metadata and refuses reads after disposal', () => {
    const fixture = relationsFixture();
    const document = fixture.document(fixture.read());
    const session = new RelationAnalysisSession({ document, scope: 'model' });
    const location = session.locate('r1', 0);
    location.binding.displayName = 'Changed externally';
    location.fields[0]!.displayName = 'Changed externally';
    expect(session.locate('r1', 0).binding).toEqual(document.sidecar.relations[0]);
    expect(session.locate('r1', 0).fields).toEqual(document.sidecar.fields);
    session.dispose();
    expect(() => session.locate('r1', 0)).toThrow();
  });
});
