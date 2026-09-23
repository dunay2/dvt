import { CONNECTION_REF_SCHEMA_VERSION, CONNECTED_SOURCE_REF_SCHEMA_VERSION } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { indexSubstraitRelations, selectDvtSubstraitRelation } from '../src/index.js';

import { relationsFixture } from './relationsFixture.js';

describe('provider-independent structural analysis', () => {
  it.each(['postgres', 'snowflake', 'local-file'])(
    'preserves %s provenance without deciding execution readiness',
    (provider) => {
      const f = relationsFixture();
      const document = f.document(f.unary('project', f.read()), true);
      const source = document.sidecar.relations[0]!;
      source.sourceRef = {
        schemaVersion: CONNECTED_SOURCE_REF_SCHEMA_VERSION,
        connectionRef: {
          schemaVersion: CONNECTION_REF_SCHEMA_VERSION,
          provider,
          connectionId: 'connection',
        },
        sourceObjectId: 'physical-object',
      };
      const selected = selectDvtSubstraitRelation(document, source.relationId);
      const result = indexSubstraitRelations(selected);
      expect(result.ok).toBe(true);
      if (!result.ok) throw result.error;
      expect(result.index.relations.get(source.relationId)?.binding.sourceRef).toEqual(
        source.sourceRef
      );
      expect(result.index.fields.get('f1')?.relationId).toBe(source.relationId);
      expect(result.index.postorder).toEqual([source.relationId]);
    }
  );
});
