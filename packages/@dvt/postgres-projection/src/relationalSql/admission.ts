/** Preserve physical scope and profile integrity independently of relation shape. */
import type { ConnectedSourceRef } from '@dvt/contracts';
import type { SubstraitDocument, SubstraitSchemas } from '@dvt/substrait-analysis';

import { DvtSubstraitPostgresProjectionError } from '../dvtProjection.js';
import {
  hasCurrentJoinSemanticHash,
  hasPinnedPlanVersion,
  hasSameConnectionRef,
  namedTableIdentity,
} from '../substraitJoinInspectionGuards.js';

import { unsupported } from './scope.js';

export type SqlSource = Readonly<{
  relationId: string;
  sourceRef: ConnectedSourceRef;
  schema: string;
  table: string;
}>;
export function admitSqlSources(
  document: SubstraitDocument,
  analysis: SubstraitSchemas
): readonly SqlSource[] {
  if (!hasPinnedPlanVersion(document.plan) || !hasCurrentJoinSemanticHash(document))
    unsupported('A current pinned Substrait document is required.');
  if (document.plan.advancedExtensions != null || document.plan.expectedTypeUrls.length > 0)
    unsupported('Plan extensions are outside the PostgreSQL profile.');
  const declarations = document.plan.extensions.flatMap((entry) =>
    entry.mappingType.case === 'extensionFunction' ? [entry.mappingType.value] : []
  );
  if (
    declarations.length !== document.plan.extensions.length ||
    new Set(declarations.map((fn) => fn.functionAnchor)).size !== declarations.length ||
    new Set(document.plan.extensionUrns.map((urn) => urn.extensionUrnAnchor)).size !==
      document.plan.extensionUrns.length
  )
    unsupported('Extension identities must be unambiguous function declarations.');
  const sources: SqlSource[] = [];
  const physical = new Map<string, string>();
  for (const id of analysis.index.postorder) {
    const entry = analysis.index.relations.get(id)!;
    if (entry.relation.relType.case !== 'read') {
      if (entry.binding.sourceRef != null)
        unsupported('Only Read relations own physical source bindings.');
      continue;
    }
    const identity = namedTableIdentity(entry.relation);
    const sourceRef = entry.binding.sourceRef;
    const read = entry.relation.relType.value;
    const names = read.baseSchema!.names;
    for (const field of analysis.schemas.get(id)!) {
      const kind = field.type.kind;
      if (
        kind.case == null ||
        !['unbound', 'string', 'bool', 'i64', 'fp64', 'precisionTimestampTz'].includes(kind.case) ||
        ('typeVariationReference' in kind.value && kind.value.typeVariationReference !== 0)
      )
        unsupported('Read type is outside the admitted PostgreSQL profile.');
    }
    if (
      identity == null ||
      sourceRef?.connectionRef.provider !== 'postgres' ||
      (sources[0] != null &&
        !hasSameConnectionRef(sources[0].sourceRef.connectionRef, sourceRef.connectionRef)) ||
      names.some((name) => name.length === 0 || name !== name.trim()) ||
      new Set(names).size !== names.length ||
      entry.fields.length !== names.length ||
      entry.fields.some(
        (field, ordinal) => field.outputOrdinal !== ordinal || field.displayName !== names[ordinal]
      )
    ) {
      throw new DvtSubstraitPostgresProjectionError(
        'invalid_source_binding',
        'Read fields and physical source bindings must match the protected PostgreSQL source.'
      );
    }
    const signature = JSON.stringify([identity, names, read.baseSchema!.struct!.types]);
    const previous = physical.get(sourceRef.sourceObjectId);
    if (previous != null && previous !== signature)
      throw new DvtSubstraitPostgresProjectionError(
        'invalid_source_binding',
        'Repeated source occurrences have contradictory physical schemas.'
      );
    physical.set(sourceRef.sourceObjectId, signature);
    sources.push({ relationId: id, sourceRef, ...identity });
  }
  if (sources.length === 0) unsupported('A physical PostgreSQL source is required.');
  return sources;
}
