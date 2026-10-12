/** Build a persisted Project(Filter(input)) through the real selected-relation command. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationFilter } from './canvasSelectedRelationFilter';

export async function filterProjectionInputFixture(
  document: SubstraitDocument,
  request: Readonly<{
    fieldId: string;
    dataType: string;
    capabilityId: string;
    value: string;
  }>
): Promise<SubstraitDocument> {
  const session = new CanvasRelationAnalysisSession('filter-fixture');
  session.receive(document);
  try {
    const root = session.locate(session.rootId, session.revision);
    const output = root.fields.find((field) => field.fieldId === request.fieldId);
    if (root.inputs.length !== 1 || output?.sourceFieldId == null)
      throw new Error('Expected a bound projection output');
    return await applySelectedRelationFilter(session, {
      intent: 'insert',
      expectedRevision: session.revision,
      relationId: root.inputs[0]!,
      fieldId: output.sourceFieldId,
      capabilityId: request.capabilityId,
      value: request.value,
    });
  } finally {
    session.dispose();
  }
}
