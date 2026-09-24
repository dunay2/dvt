/** Batched cache access owns no authority: misses and failures recompute from the captured snapshot. */
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { fromJson, toJson, type JsonValue } from '@bufbuild/protobuf';

import type { RelationAnalysisCache, RelationAnalysisCacheFailure } from './analysisCache.js';
import { awaitAnalysis } from './analysisCancellation.js';
import { deriveRelationSchema } from './relationSchema.js';
import type { RelationSnapshot } from './relationSnapshot.js';
import { requireSchemaType, type SchemaField } from './schemaTypes.js';

export function encodeSchema(fields: readonly SchemaField[]): string {
  const encode = (field: SchemaField): JsonValue => ({
    type: toJson(TypeSchema, field.type),
    sourceFieldIds: [...field.sourceFieldIds],
    ...(field.children == null ? {} : { children: field.children.map(encode) }),
  });
  return JSON.stringify(fields.map(encode));
}

export function decodeSchema(value: string): readonly SchemaField[] {
  const fields: unknown = JSON.parse(value);
  if (!Array.isArray(fields)) throw new Error('Cached schema is not an array.');
  const decode = (field: unknown): SchemaField => {
    if (
      field == null ||
      typeof field !== 'object' ||
      !('type' in field) ||
      !('sourceFieldIds' in field) ||
      !Array.isArray(field.sourceFieldIds) ||
      !field.sourceFieldIds.every((id: unknown) => typeof id === 'string')
    )
      throw new Error('Cached field is malformed.');
    const children = 'children' in field ? field.children : undefined;
    if (children !== undefined && !Array.isArray(children))
      throw new Error('Cached children are malformed.');
    return {
      type: requireSchemaType(fromJson(TypeSchema, field.type as JsonValue)),
      sourceFieldIds: field.sourceFieldIds as string[],
      ...(children === undefined ? {} : { children: children.map(decode) }),
    };
  };
  return fields.map(decode);
}

type SchemaQuery = Readonly<{
  snapshot: RelationSnapshot;
  relationId: string;
  scope: string;
  cache: RelationAnalysisCache;
  signal: globalThis.AbortSignal;
  assertCurrent: () => void;
  onFailure: (failure: RelationAnalysisCacheFailure) => void;
}>;

export async function queryRelationSchemas(args: SchemaQuery): Promise<string> {
  const { snapshot, cache, relationId } = args;
  const key = (id: string): string =>
    JSON.stringify(['substrait-schema-v2', args.scope, id, snapshot.fingerprints.get(id)]);
  async function read(ids: readonly string[]): Promise<readonly (string | null)[]> {
    try {
      const values = await awaitAnalysis(cache.getMany(ids.map(key), args.signal), args.signal);
      if (values.length !== ids.length) throw new Error('Cache batch size differs.');
      return values.map((value) => {
        if (value !== null) decodeSchema(value);
        return value;
      });
    } catch (error) {
      args.signal.throwIfAborted();
      args.onFailure({ operation: 'read', error });
      return ids.map(() => null);
    }
  }
  const [hot] = await read([relationId]);
  args.assertCurrent();
  if (hot != null) return hot;
  const initialOrder = snapshot.postorder(relationId, true);
  const initialValues = await read(initialOrder);
  args.assertCurrent();
  const initial = new Map(
    initialOrder.map((id, position) => [id, initialValues[position] ?? null])
  );
  // An evicted cut-point is expanded once, not one network call per node/depth.
  const expanded = initialOrder.flatMap((id) =>
    id !== relationId && snapshot.settled.has(id) && initial.get(id) == null
      ? snapshot.postorder(id)
      : [id]
  );
  const order = [...new Set(expanded)];
  const absent = order.filter((id) => !initial.has(id));
  const recovered = absent.length === 0 ? [] : await read(absent);
  absent.forEach((id, position) => initial.set(id, recovered[position] ?? null));
  args.assertCurrent();
  const schemas = new Map<string, readonly SchemaField[]>();
  const writes: { key: string; value: string }[] = [];
  for (const id of order) {
    const stored = initial.get(id);
    if (stored != null) schemas.set(id, decodeSchema(stored));
    else {
      const entry = snapshot.get(id);
      const fields = deriveRelationSchema(
        entry,
        entry.inputs.map((input) => schemas.get(input)!)
      );
      schemas.set(id, fields);
      writes.push({ key: key(id), value: encodeSchema(fields) });
      snapshot.work.analyzed += 1;
    }
  }
  args.assertCurrent();
  try {
    await awaitAnalysis(cache.putMany(writes, args.signal), args.signal);
  } catch (error) {
    args.signal.throwIfAborted();
    args.onFailure({ operation: 'write', error });
  }
  args.assertCurrent();
  for (const id of order) snapshot.settled.add(id);
  return encodeSchema(schemas.get(relationId)!);
}
