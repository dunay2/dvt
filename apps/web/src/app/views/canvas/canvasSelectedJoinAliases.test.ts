/** Instance aliases are presentation; stable field identities remain command targets. */
import { expect, it } from 'vitest';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { querySelectedJoin } from './canvasSelectedJoin';
import { applySelectedRelationSortFetch } from './canvasSelectedRelationSortFetch';
import { repeatedOccurrenceDraft } from './relational-source-occurrence/occurrence.test.fixtures';
import { renameSourceOccurrence } from './relational-source-occurrence/renameSourceOccurrence';
import { createCanvasSemanticFieldNames } from './canvasSemanticFieldNames';
import { buildDvtSubstraitSemanticDocumentFixture } from '../../../../../../packages/@dvt/contracts/test/fixtures/dvtSubstraitSemanticDocument';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

it('uses canonical Read names when optional field aliases are absent', () => {
  const document = decodeDvtSubstraitSemanticDocument(buildDvtSubstraitSemanticDocumentFixture());
  const root = document.plan.relations[0]!.relType;
  const project = root.case === 'root' ? root.value.input?.relType : undefined;
  const read = project?.case === 'project' ? project.value.input : undefined;
  if (read?.relType.case !== 'read') throw new Error('Expected fixture Read');
  const names = createCanvasSemanticFieldNames(document);
  const schemaNames = read.relType.value.baseSchema!.names;
  expect(names(read)).toEqual(schemaNames);
  const anchor = read.relType.value.common!.relAnchor;
  const alias = document.sidecar.relations.find(
    (binding) => binding.relAnchor === anchor
  )!.displayName;
  expect(names(read, true)).toEqual(schemaNames.map((name) => `${alias}.${name}`));
});

it.each([0, 1])(
  'preserves occurrence aliases through a transformation on port %s',
  async (port) => {
    const document = repeatedOccurrenceDraft();
    const session = new CanvasRelationAnalysisSession('alias-inspection');
    session.receive(document);
    const reads = document.sidecar.relations.filter((binding) => binding.sourceRef != null);
    const aliases = ['domestic', 'international'];
    for (const [index, read] of reads.entries()) {
      await renameSourceOccurrence(session, {
        relationId: read.relationId,
        expectedRevision: session.revision,
        alias: aliases[index]!,
      });
    }
    await applySelectedRelationSortFetch(session, {
      relationId: reads[port]!.relationId,
      expectedRevision: session.revision,
      intent: 'insert',
      operation: 'fetch',
      count: 4n,
    });
    const selected = await querySelectedJoin(session, session.rootId, session.revision);
    expect(selected.fields.map((field) => field.label)).toEqual(
      aliases.flatMap((alias) => ['id', 'parent_id'].map((name) => `${alias}.${name}`))
    );
    const identities = selected.fields.map((field) => field.fieldId);
    const renamedDocument = await renameSourceOccurrence(session, {
      relationId: reads[port]!.relationId,
      expectedRevision: session.revision,
      alias: 'renamed',
    });
    const renamed = await querySelectedJoin(session, session.rootId, session.revision);
    expect(renamed.fields.map((field) => field.fieldId)).toEqual(identities);
    expect(
      renamed.fields.filter((field) => field.inputIndex === port).map((field) => field.label)
    ).toEqual(['renamed.id', 'renamed.parent_id']);
    expect(renamed.conditions).toEqual(selected.conditions);
    const appliedNames = createCanvasSemanticFieldNames(renamedDocument);
    expect(
      renamed.inputs.flatMap((input) =>
        appliedNames(session.locate(input.relationId, session.revision).relation, true)
      )
    ).toEqual(renamed.fields.map((field) => field.label));
  }
);
