/** Preserve output identity by provenance, and qualify collisions without changing physical inputs. */
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import { createRelationPassthroughFields } from './canvasRelationPassthroughFields';

type Fields = readonly DvtSubstraitFieldBindingV1[];
const origin = (field: DvtSubstraitFieldBindingV1) =>
  field.sourceFieldId ??
  (field.operandFieldIds == null ? null : JSON.stringify(field.operandFieldIds));

function ordinalPaths(fields: Fields) {
  const indexed = new Map(fields.map((field) => [field.fieldId, field]));
  const paths = new Map<string, string>();
  const path = (field: DvtSubstraitFieldBindingV1): string => {
    const cached = paths.get(field.fieldId);
    if (cached != null) return cached;
    const value =
      field.parentFieldId == null
        ? String(field.outputOrdinal)
        : `${path(indexed.get(field.parentFieldId)!)}.${field.outputOrdinal}`;
    paths.set(field.fieldId, value);
    return value;
  };
  return new Map(fields.map((field) => [path(field), field.fieldId]));
}

export function setCompositionOutputs(relationId: string, inputs: readonly Fields[]) {
  const paths = inputs.map(ordinalPaths);
  const firstPaths = new Map([...paths[0]!].map(([path, id]) => [id, path]));
  return createRelationPassthroughFields(relationId, inputs[0]!).map(
    ({ sourceFieldId, ...field }) => {
      const path = firstPaths.get(sourceFieldId!);
      const operandFieldIds = paths.map((input) => (path == null ? undefined : input.get(path)));
      if (operandFieldIds.some((id) => id == null))
        throw new SubstraitAnalysisError('invalid_binding', 'SET input field paths do not align.');
      return { ...field, operandFieldIds: operandFieldIds as string[] };
    }
  );
}

export function retainCompositionOutputs(fields: Fields, ordinals: readonly number[]) {
  const kept = new Set(
    fields
      .filter((field) => field.parentFieldId == null && ordinals.includes(field.outputOrdinal))
      .map((field) => field.fieldId)
  );
  const descendants = new Map<string, string[]>();
  for (const field of fields)
    if (field.parentFieldId != null) {
      const children = descendants.get(field.parentFieldId) ?? [];
      children.push(field.fieldId);
      descendants.set(field.parentFieldId, children);
    }
  for (const id of kept) for (const child of descendants.get(id) ?? []) kept.add(child);
  return fields
    .filter((field) => kept.has(field.fieldId))
    .map((field) =>
      field.parentFieldId == null
        ? { ...field, outputOrdinal: ordinals.indexOf(field.outputOrdinal) }
        : field
    );
}

export function nameCompositionOutputs(fields: Fields, previous: Fields = []) {
  const names = new Set<string>();
  const byOrigin = new Map<string, DvtSubstraitFieldBindingV1[]>();
  for (const field of previous) {
    const key = origin(field);
    if (key != null) byOrigin.set(key, [...(byOrigin.get(key) ?? []), field]);
  }
  const retained = new Set<string>();
  const identities = new Map(
    fields.flatMap((field) => {
      const candidates = byOrigin.get(origin(field) ?? '');
      const candidate = candidates?.length === 1 ? candidates[0] : undefined;
      if (candidate == null || retained.has(candidate.fieldId)) return [];
      retained.add(candidate.fieldId);
      return [[field.fieldId, candidate] as const];
    })
  );
  return fields.map((field) => {
    const prior = identities.get(field.fieldId);
    const base = prior?.displayName ?? field.displayName ?? field.fieldId;
    let displayName = base;
    if (field.parentFieldId == null) {
      let suffix = 2;
      while (names.has(displayName)) displayName = `${base}_${suffix++}`;
      names.add(displayName);
    }
    return {
      ...field,
      fieldId: prior?.fieldId ?? field.fieldId,
      displayName,
      ...(field.parentFieldId == null
        ? {}
        : {
            parentFieldId: identities.get(field.parentFieldId)?.fieldId ?? field.parentFieldId,
          }),
    };
  });
}
