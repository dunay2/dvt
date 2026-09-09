import { describe, expect, it } from 'vitest';

import {
  CANVAS_AUTHORING_FIELD_LIMITS_V1,
  CanvasDescriptionV1Schema,
  CanvasHumanNameV1Schema,
  CanvasTagV1Schema,
  CanvasTagsV1Schema,
  DvtStringLiteralV1Schema,
  DvtSubstraitFieldBindingV1Schema,
  DvtSubstraitRelationBindingV1Schema,
  DvtTimestampLiteralV1Schema,
  PostgresIdentifierV1Schema,
  WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE,
  WorkspaceGraphAuthoringCommandSchema,
  WorkspaceGraphAuthoringCanvasDocumentSchema,
  WorkspaceGraphAuthoringNodeSchema,
  countUnicodeCodePoints,
  countUtf8Bytes,
} from '../src/index.js';

const baseNode = {
  id: 'node-1',
  name: 'Node',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input' as const,
  status: 'idle' as const,
  tags: [],
};

function expectBoundary(
  schema: { safeParse(value: unknown): { success: boolean } },
  values: string[]
): void {
  expect(values.map((value) => schema.safeParse(value).success)).toEqual([true, true, false]);
}

describe('Canvas authoring field policy v1', () => {
  it('counts Unicode code points and UTF-8 bytes without splitting astral characters', () => {
    expect(countUnicodeCodePoints('a😀')).toBe(2);
    expect(countUtf8Bytes('a😀')).toBe(5);
  });

  it('rejects NUL and malformed UTF-16 at the shared boundary', () => {
    expect(CanvasHumanNameV1Schema.safeParse(`name${String.fromCharCode(0)}tail`).success).toBe(
      false
    );
    expect(CanvasHumanNameV1Schema.safeParse(String.fromCharCode(0xd800)).success).toBe(false);
  });

  it('normalizes human names and tags before enforcing their canonical budget', () => {
    expect(CanvasHumanNameV1Schema.parse('  Node  ')).toBe('Node');
    expect(CanvasTagsV1Schema.parse([' finance ', ' critical '])).toEqual(['finance', 'critical']);
  });

  it('enforces human text L-1, L and L+1 in Unicode code points', () => {
    expectBoundary(CanvasHumanNameV1Schema, [
      'a'.repeat(255),
      'a'.repeat(255) + '😀',
      'a'.repeat(256) + '😀',
    ]);
    expectBoundary(CanvasDescriptionV1Schema, [
      'a'.repeat(4095),
      'a'.repeat(4095) + '😀',
      'a'.repeat(4096) + '😀',
    ]);
    expectBoundary(CanvasTagV1Schema, [
      'a'.repeat(31),
      'a'.repeat(31) + '😀',
      'a'.repeat(32) + '😀',
    ]);
  });

  it('enforces PostgreSQL identifiers and literals in UTF-8 bytes', () => {
    expectBoundary(PostgresIdentifierV1Schema, [
      'a'.repeat(62),
      'a'.repeat(59) + '😀',
      'a'.repeat(60) + '😀',
    ]);
    expectBoundary(DvtStringLiteralV1Schema, [
      'a'.repeat(4095),
      'a'.repeat(4092) + '😀',
      'a'.repeat(4093) + '😀',
    ]);
  });

  it('rejects exterior whitespace in PostgreSQL identifiers without normalizing it', () => {
    expect(PostgresIdentifierV1Schema.safeParse('\torders').success).toBe(false);
    expect(PostgresIdentifierV1Schema.safeParse('orders\t').success).toBe(false);
    expect(PostgresIdentifierV1Schema.safeParse('\u00a0orders').success).toBe(false);
    expect(PostgresIdentifierV1Schema.safeParse('orders\u00a0').success).toBe(false);
  });

  it('accepts only canonical RFC 3339 UTC timestamp literals', () => {
    expect(DvtTimestampLiteralV1Schema.safeParse('2026-09-08T12:00:00.000Z').success).toBe(true);
    expect(DvtTimestampLiteralV1Schema.safeParse('2026-09-08 12:00:00').success).toBe(false);
  });

  it('enforces Canvas titles at the shared human-name boundary', () => {
    expect(
      WorkspaceGraphAuthoringCanvasDocumentSchema.safeParse({
        kind: 'transformation',
        title: 'a'.repeat(CANVAS_AUTHORING_FIELD_LIMITS_V1.humanNameCodePoints) + 'a',
      }).success
    ).toBe(false);
  });

  it('enforces the node name, description, tag and tag-count budgets', () => {
    expect(WorkspaceGraphAuthoringNodeSchema.safeParse(baseNode).success).toBe(true);
    expect(
      WorkspaceGraphAuthoringNodeSchema.safeParse({
        ...baseNode,
        name: 'a'.repeat(CANVAS_AUTHORING_FIELD_LIMITS_V1.humanNameCodePoints) + '😀',
      }).success
    ).toBe(false);
    expect(
      WorkspaceGraphAuthoringNodeSchema.safeParse({
        ...baseNode,
        description: 'a'.repeat(CANVAS_AUTHORING_FIELD_LIMITS_V1.descriptionCodePoints) + '😀',
      }).success
    ).toBe(false);
    expect(
      WorkspaceGraphAuthoringNodeSchema.safeParse({
        ...baseNode,
        tags: Array.from(
          { length: CANVAS_AUTHORING_FIELD_LIMITS_V1.tagsPerNode + 1 },
          (_, index) => `tag-${index}`
        ),
      }).success
    ).toBe(false);
    expect(
      CanvasTagsV1Schema.safeParse(Array.from({ length: 32 }, (_, index) => `tag-${index}-😀`))
        .success
    ).toBe(true);
    expect(CanvasTagsV1Schema.safeParse(['finance', ' finance ']).success).toBe(false);
  });

  it.each([
    ['source config alias', { ...baseNode, metadata: { config: { alias: 'a'.repeat(64) } } }],
    [
      'imported source schema',
      {
        ...baseNode,
        pluginId: 'dvt.warehouse-source',
        metadata: { schema: 'é'.repeat(32) },
      },
    ],
    [
      'sink destination table',
      {
        ...baseNode,
        kind: 'dvt:sink',
        role: 'output' as const,
        metadata: { config: { schema: 'public', table: 'a'.repeat(64) } },
      },
    ],
  ])('rejects an oversized recognized DVT %s', (_label, node) => {
    expect(WorkspaceGraphAuthoringNodeSchema.safeParse(node).success).toBe(false);
  });

  it('keeps relation labels human-readable while bounding them', () => {
    const base = { relationId: 'relation:1', relAnchor: 1 };
    expect(
      DvtSubstraitRelationBindingV1Schema.safeParse({ ...base, displayName: 'a'.repeat(256) })
        .success
    ).toBe(true);
    expect(
      DvtSubstraitRelationBindingV1Schema.safeParse({ ...base, displayName: 'a'.repeat(257) })
        .success
    ).toBe(false);
  });

  it('rejects invalid persisted DVT materialization values', () => {
    expect(
      WorkspaceGraphAuthoringNodeSchema.safeParse({
        ...baseNode,
        kind: 'dvt:transform',
        role: 'transform',
        metadata: { config: { materialized: 'incremental' } },
      }).success
    ).toBe(false);
    expect(
      WorkspaceGraphAuthoringNodeSchema.safeParse({
        ...baseNode,
        kind: 'dvt:sink',
        role: 'output',
        metadata: {
          config: {
            schema: 'public',
            table: 'orders',
            materialization: 'table',
            writeMode: 'merge',
          },
        },
      }).success
    ).toBe(false);
  });

  it.each([
    [
      'oversized source alias',
      {
        pluginId: 'dvt',
        kind: 'dvt:source',
        metadata: { config: { alias: 'a'.repeat(64) } },
      },
    ],
    [
      'unknown sink write mode',
      {
        pluginId: 'dvt',
        kind: 'dvt:sink',
        metadata: { config: { writeMode: 'merge' } },
      },
    ],
  ])('rejects update-node patches with invalid DVT metadata: %s', (_label, patch) => {
    expect(
      WorkspaceGraphAuthoringCommandSchema.safeParse({
        type: WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.updateNode,
        nodeId: baseNode.id,
        patch,
      }).success
    ).toBe(false);
  });

  it.each([
    ['pluginId', { pluginId: 'dvt', metadata: { config: { alias: 'orders' } } }],
    ['kind', { kind: 'dvt:source', metadata: { config: { alias: 'orders' } } }],
  ])(
    'requires both DVT discriminators when update-node patches metadata: %s only',
    (_label, patch) => {
      expect(
        WorkspaceGraphAuthoringCommandSchema.safeParse({
          type: WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.updateNode,
          nodeId: baseNode.id,
          patch,
        }).success
      ).toBe(false);
    }
  );

  it('does not apply PCV1 text limits recursively to opaque plugin metadata', () => {
    expect(
      WorkspaceGraphAuthoringCommandSchema.safeParse({
        type: WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.updateNode,
        nodeId: baseNode.id,
        patch: {
          pluginId: 'external.plugin',
          kind: 'external:node',
          metadata: { opaqueDocument: 'x'.repeat(8_192) },
        },
      }).success
    ).toBe(true);
  });

  it('applies output-name and description budgets to the semantic sidecar', () => {
    const base = {
      fieldId: 'field:1',
      relationId: 'relation:1',
      outputOrdinal: 0,
    };
    expect(
      DvtSubstraitFieldBindingV1Schema.safeParse({
        ...base,
        displayName: 'a'.repeat(59) + '😀',
        description: 'a'.repeat(4095) + '😀',
      }).success
    ).toBe(true);
    expect(
      DvtSubstraitFieldBindingV1Schema.safeParse({ ...base, displayName: 'a'.repeat(60) + '😀' })
        .success
    ).toBe(false);
    expect(
      DvtSubstraitFieldBindingV1Schema.safeParse({
        ...base,
        description: 'a'.repeat(4096) + '😀',
      }).success
    ).toBe(false);
  });
});
