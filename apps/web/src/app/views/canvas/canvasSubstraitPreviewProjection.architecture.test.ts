import { readArchitectureSiblingSource } from '../architecture.test.support';
import { describe, expect, it } from 'vitest';

const PREVIEW_PROVENANCE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasPreviewProvenance.ts'
);
const SUBSTRAIT_AGGREGATION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDvtSubstraitAggregation.ts'
);
const SUBSTRAIT_WINDOW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDvtSubstraitWindow.ts'
);
const SUBSTRAIT_AGGREGATE_WINDOW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDvtSubstraitAggregateWindow.ts'
);
const SUBSTRAIT_SET_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDvtSubstraitSetComposition.ts'
);
const SUBSTRAIT_AUTHORING_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DvtSubstraitPilotAuthoringSection.tsx'
);

describe('VTX2 Substrait Preview cutover architecture', () => {
  it('keeps Preview provenance free of a parallel Substrait decoder or planner', () => {
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain("from './canvasDvtSubstraitPilot'");
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain(
      "from './canvasDvtSubstraitPostgresProjection'"
    );
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('SubstraitPreviewService');
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('localStorage');
    expect(PREVIEW_PROVENANCE_SOURCE).not.toContain('dbt');
  });

  it('resolves UNION ALL from SetRel without a private relation or runtime taxonomy', () => {
    expect(SUBSTRAIT_SET_SOURCE).toContain('DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1');
    expect(SUBSTRAIT_SET_SOURCE).toContain("message: 'substrait.SetRel'");
    expect(SUBSTRAIT_SET_SOURCE).toContain("selector: 'SetOp.SET_OP_UNION_ALL'");
    expect(SUBSTRAIT_SET_SOURCE).toContain('SetRel_SetOp.UNION_ALL');
    expect(SUBSTRAIT_SET_SOURCE).not.toContain('UnionNode');
    expect(SUBSTRAIT_SET_SOURCE).not.toContain('UnionStep');
    expect(SUBSTRAIT_SET_SOURCE).not.toContain('DvtSetRel');
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

  it('resolves window semantics from the admitted catalog without a Web function registry', () => {
    expect(SUBSTRAIT_WINDOW_SOURCE).toContain('DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1');
    expect(SUBSTRAIT_WINDOW_SOURCE).toContain("selector: 'rex_type.window_function'");
    expect(SUBSTRAIT_WINDOW_SOURCE).toContain(
      "const ROW_NUMBER_URN = 'extension:io.substrait:functions_arithmetic'"
    );
    expect(SUBSTRAIT_WINDOW_SOURCE).toContain("name: 'row_number'");
    expect(SUBSTRAIT_AUTHORING_SOURCE).toContain('windowInspection.projection.result.capabilityId');
    expect(SUBSTRAIT_AUTHORING_SOURCE).not.toMatch(/enum\s+.*(?:Window|Function)/);
    expect(SUBSTRAIT_WINDOW_SOURCE).not.toContain('DvtWindow');
  });

  it('composes aggregate and window relations without a parallel semantic model', () => {
    expect(SUBSTRAIT_AGGREGATE_WINDOW_SOURCE).toContain('ProjectRelSchema');
    expect(SUBSTRAIT_AGGREGATE_WINDOW_SOURCE).toContain('inspectDvtSubstraitPilotAggregationDraft');
    expect(SUBSTRAIT_AGGREGATE_WINDOW_SOURCE).toContain('DVT_SUBSTRAIT_ROW_NUMBER_CAPABILITY_ID');
    expect(SUBSTRAIT_AGGREGATE_WINDOW_SOURCE).toContain('isDvtSubstraitRowNumberFunction');
    expect(SUBSTRAIT_AUTHORING_SOURCE).toContain(
      'aggregateWindowInspection.projection.result.capabilityId'
    );
    expect(SUBSTRAIT_AGGREGATE_WINDOW_SOURCE).not.toMatch(
      /(?:DvtAggregateWindow|AggregateWindowNode|AggregateWindowStep)/
    );
  });
});
