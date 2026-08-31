import { readArchitectureSiblingSource } from '../architecture.test.support';
import { describe, expect, it } from 'vitest';

const PREVIEW_PROVENANCE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasPreviewProvenance.ts'
);
const SUBSTRAIT_POSTGRES_PROJECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDvtSubstraitPostgresProjection.ts'
);

describe('VTX2 Substrait Preview cutover architecture', () => {
  it('derives Preview SQL from Substrait while retaining the bounded VTX1 compatibility path', () => {
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('DVT_TRANSFORM_AUTHORING_MODE.substrait');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('decodeDvtSubstraitPilotDocument(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('projectDvtSubstraitPilotToPostgresSql(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('decodeDvtSubstraitInnerJoinDocument(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('projectDvtSubstraitInnerJoinToPostgresSql(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('compileDvtVisualTransformNodeToPostgresSql(');
    expect(SUBSTRAIT_POSTGRES_PROJECTION_SOURCE).toContain(
      'project only the admitted pilot and two-source INNER JOIN shapes to PostgreSQL'
    );
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('SubstraitPreviewService');
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('localStorage');
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('dbt');
  });
});
