/** Adapt saved Source authority to the existing producer graph column-publication boundary. */
import {
  decodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

export function dvtSourcePublication(
  node: WorkspaceGraphAuthoringNode
): ReadonlySet<string> | undefined {
  if (node.metadata?.transformAuthoring == null) return undefined;
  const { semanticDocument } = DvtTransformAuthoringAuthorityV1Schema.parse(
    node.metadata.transformAuthoring
  );
  const { index, schemas } = deriveSubstraitSchemas({
    plan: decodeDvtSubstraitPlanV1(semanticDocument),
    sidecar: semanticDocument.sidecar,
  });
  const names = schemas.get(index.rootId)!.map((field) => {
    if (field.sourceFieldIds.length !== 1) throw new Error('Source must publish direct fields.');
    const binding = index.fields.get(field.sourceFieldIds[0]!);
    if (binding?.displayName == null) throw new Error('Source field identity is unavailable.');
    return binding.displayName;
  });
  return new Set(names);
}
