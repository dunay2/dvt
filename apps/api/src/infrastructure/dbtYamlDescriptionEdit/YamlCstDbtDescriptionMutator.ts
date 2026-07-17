/** Owned concern: mutate one dbt resource description without serializing unrelated YAML. */
import { isMap, isScalar, isSeq, parseDocument, stringify, type Pair, type YAMLMap } from 'yaml';

import {
  DbtYamlDescriptionDocumentInvalidError,
  DbtYamlDescriptionResourceAmbiguousError,
  DbtYamlDescriptionResourceNotFoundError,
  type DbtYamlDescriptionMutation,
  type DbtYamlDescriptionResourceIdentity,
  type IDbtYamlDescriptionMutator,
} from '../../application/ports/dbtYamlDescriptionEdit.js';

type LocatedResource = Readonly<{
  map: YAMLMap;
  namePair: Pair;
}>;

const RESOURCE_COLLECTION_BY_TYPE = {
  model: 'models',
  seed: 'seeds',
  snapshot: 'snapshots',
  exposure: 'exposures',
  metric: 'metrics',
} as const;

export class YamlCstDbtDescriptionMutator implements IDbtYamlDescriptionMutator {
  public mutate(
    input: Readonly<{
      content: string;
      resource: DbtYamlDescriptionResourceIdentity;
      nextDescription: string | null;
    }>
  ): DbtYamlDescriptionMutation {
    const document = parseDocument(input.content, {
      keepSourceTokens: true,
      strict: true,
      uniqueKeys: true,
    });
    if (document.errors.length > 0) {
      throw new DbtYamlDescriptionDocumentInvalidError(
        document.errors[0]?.message ?? 'Invalid YAML.'
      );
    }

    const resource = locateResource(document, input.resource);
    const descriptionPair = findPair(resource.map, 'description');
    const previousDescription = readDescription(descriptionPair, input.resource.uniqueId);
    if (previousDescription === input.nextDescription) {
      return {
        content: input.content,
        previousDescription,
        nextDescription: input.nextDescription,
      };
    }

    return {
      content: patchDescription({
        content: input.content,
        resource,
        descriptionPair,
        nextDescription: input.nextDescription,
      }),
      previousDescription,
      nextDescription: input.nextDescription,
    };
  }
}

function locateResource(
  document: ReturnType<typeof parseDocument>,
  identity: DbtYamlDescriptionResourceIdentity
): LocatedResource {
  const matches =
    identity.resourceType === 'source'
      ? locateSourceTables(document, identity)
      : locateTopLevelResources(document, identity);

  if (matches.length === 0) {
    throw new DbtYamlDescriptionResourceNotFoundError(identity.uniqueId);
  }
  if (matches.length !== 1) {
    throw new DbtYamlDescriptionResourceAmbiguousError(identity.uniqueId);
  }
  return matches[0] as LocatedResource;
}

function locateTopLevelResources(
  document: ReturnType<typeof parseDocument>,
  identity: DbtYamlDescriptionResourceIdentity
): LocatedResource[] {
  const resourceType = identity.resourceType;
  if (resourceType === 'source') return [];
  const collectionName = RESOURCE_COLLECTION_BY_TYPE[resourceType];
  return namedMaps(document.get(collectionName, true), identity.name);
}

function locateSourceTables(
  document: ReturnType<typeof parseDocument>,
  identity: DbtYamlDescriptionResourceIdentity
): LocatedResource[] {
  if (!identity.sourceName) {
    throw new DbtYamlDescriptionDocumentInvalidError(
      `Source identity is missing sourceName: ${identity.uniqueId}`
    );
  }
  const sources = namedMaps(document.get('sources', true), identity.sourceName);
  return sources.flatMap(({ map }) => namedMaps(readPairValue(map, 'tables'), identity.name));
}

function namedMaps(value: unknown, name: string): LocatedResource[] {
  if (!isSeq(value)) return [];
  return value.items.flatMap((item) => {
    if (!isMap(item)) return [];
    const namePair = findPair(item, 'name');
    return scalarString(namePair?.value) === name
      ? [{ map: item, namePair: namePair as Pair }]
      : [];
  });
}

function findPair(map: YAMLMap, key: string): Pair | undefined {
  return map.items.find((pair) => scalarString(pair.key) === key);
}

function readPairValue(map: YAMLMap, key: string): unknown {
  return findPair(map, key)?.value;
}

function readDescription(pair: Pair | undefined, resourceUniqueId: string): string | null {
  if (pair === undefined) return null;
  const value = scalarString(pair.value);
  if (value === undefined) {
    throw new DbtYamlDescriptionDocumentInvalidError(
      `Description is not a scalar string: ${resourceUniqueId}`
    );
  }
  return value;
}

function scalarString(value: unknown): string | undefined {
  return isScalar(value) && typeof value.value === 'string' ? value.value : undefined;
}

function patchDescription(
  input: Readonly<{
    content: string;
    resource: LocatedResource;
    descriptionPair: Pair | undefined;
    nextDescription: string | null;
  }>
): string {
  const lineEnding = input.content.includes('\r\n') ? '\r\n' : '\n';
  if (input.descriptionPair === undefined) {
    if (input.nextDescription === null) return input.content;
    return insertDescription(
      input.content,
      input.resource.namePair,
      input.nextDescription,
      lineEnding
    );
  }

  const pairRange = resolvePairLineRange(input.content, input.descriptionPair);
  if (input.nextDescription === null) {
    return input.content.slice(0, pairRange.start) + input.content.slice(pairRange.end);
  }
  const valueRange = requiredRange(input.descriptionPair.value);
  const previousToken = input.content.slice(valueRange[0], valueRange[1]);
  const replacement = formatScalar(input.nextDescription, previousToken);
  return input.content.slice(0, valueRange[0]) + replacement + input.content.slice(valueRange[1]);
}

function insertDescription(
  content: string,
  namePair: Pair,
  nextDescription: string,
  lineEnding: string
): string {
  const keyRange = requiredRange(namePair.key);
  const valueRange = requiredRange(namePair.value);
  const lineStart = findLineStart(content, keyRange[0]);
  const indent = ' '.repeat(keyRange[0] - lineStart);
  const insertionPoint = valueRange[2];
  const precedingValue = content.slice(lineStart, insertionPoint);
  const followsExistingLineEnding = precedingValue.endsWith('\n');
  const insertion = followsExistingLineEnding
    ? `${indent}description: ${formatScalar(nextDescription)}${lineEnding}`
    : `${lineEnding}${indent}description: ${formatScalar(nextDescription)}`;
  return content.slice(0, insertionPoint) + insertion + content.slice(insertionPoint);
}

function formatScalar(value: string, previousToken?: string): string {
  if (previousToken?.startsWith("'")) {
    return `'${value.replaceAll("'", "''")}'`;
  }
  if (previousToken?.startsWith('"')) {
    return JSON.stringify(value);
  }
  return stringify(value).trimEnd();
}

function resolvePairLineRange(
  content: string,
  pair: Pair
): Readonly<{ start: number; end: number; indent: string; hasLineEnding: boolean }> {
  const keyRange = requiredRange(pair.key);
  const valueRange = requiredRange(pair.value);
  const start = findLineStart(content, keyRange[0]);
  const end = valueRange[2];
  return {
    start,
    end,
    indent: content.slice(start, keyRange[0]),
    hasLineEnding: content.slice(start, end).endsWith('\n'),
  };
}

function findLineStart(content: string, offset: number): number {
  const previousLineEnding = content.lastIndexOf('\n', Math.max(0, offset - 1));
  return previousLineEnding < 0 ? 0 : previousLineEnding + 1;
}

function requiredRange(value: unknown): readonly [number, number, number] {
  if (
    value !== null &&
    typeof value === 'object' &&
    'range' in value &&
    Array.isArray(value.range) &&
    value.range.length === 3 &&
    value.range.every((offset) => typeof offset === 'number')
  ) {
    return value.range as [number, number, number];
  }
  throw new DbtYamlDescriptionDocumentInvalidError('YAML node does not expose a stable CST range.');
}
