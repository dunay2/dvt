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
const SUBSTRAIT_AGGREGATION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDvtSubstraitAggregation.ts'
);
const SUBSTRAIT_AUTHORING_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DvtSubstraitPilotAuthoringSection.tsx'
);

describe('VTX2 Substrait Preview cutover architecture', () => {
  it('derives Preview SQL from Substrait while retaining the bounded VTX1 compatibility path', () => {
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('DVT_TRANSFORM_AUTHORING_MODE.substrait');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('decodeDvtSubstraitPilotDocument(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('projectDvtSubstraitPilotToPostgresSql(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain(
      'projectDvtSubstraitPilotAggregationToPostgresSql('
    );
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('decodeDvtSubstraitInnerJoinDocument(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('projectDvtSubstraitInnerJoinToPostgresSql(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('compileDvtVisualTransformNodeToPostgresSql(');
    expect(SUBSTRAIT_POSTGRES_PROJECTION_SOURCE).toContain(
      'project only the admitted pilot, grouping/count, and INNER JOIN shapes to PostgreSQL'
    );
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('SubstraitPreviewService');
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('localStorage');
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('dbt');
  });

  it('resolves grouping semantics from the admitted catalog without a Web function registry', () => {
    expect(SUBSTRAIT_AGGREGATION_SOURCE).toContain('DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1');
    expect(SUBSTRAIT_AGGREGATION_SOURCE).toContain("message: 'substrait.AggregateRel'");
    expect(SUBSTRAIT_AGGREGATION_SOURCE).toContain(
      "const COUNT_URN = 'extension:io.substrait:functions_aggregate_generic'"
    );
    expect(SUBSTRAIT_AGGREGATION_SOURCE).toContain('urn: COUNT_URN');
    expect(SUBSTRAIT_AGGREGATION_SOURCE).toContain("selector: 'kind.i64'");
    expect(SUBSTRAIT_AUTHORING_SOURCE).toContain(
      'aggregateInspection.projection.measure.capabilityId'
    );
    expect(SUBSTRAIT_AUTHORING_SOURCE).not.toMatch(/enum\s+.*(?:Aggregate|Function)/);
    expect(SUBSTRAIT_AGGREGATION_SOURCE).not.toContain('DvtAggregateRel');
  });
});
