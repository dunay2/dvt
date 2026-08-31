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
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('compileDvtVisualTransformNodeToPostgresSql(');
    expect(SUBSTRAIT_POSTGRES_PROJECTION_SOURCE).toContain(
      'project only the #2598 typed Substrait pilot shape to PostgreSQL SQL'
    );
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('SubstraitPreviewService');
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('localStorage');
  });
});
