/** Owns DVT metadata field policy shared by graph nodes and node commands. */
import type { z } from 'zod';

import { PostgresIdentifierV1Schema } from './CanvasAuthoringFieldPolicy.v1.js';
import { DvtTransformResultTargetV1Schema } from './DvtTransformResultTarget.v1.js';
import type { WorkspaceGraphAuthoringNode } from './WorkspaceGraphAuthoringDraft.v1.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addPostgresIdentifierMetadataIssue(
  record: Record<string, unknown>,
  key: string,
  path: string[],
  context: z.RefinementCtx
): void {
  if (Object.hasOwn(record, key) && !PostgresIdentifierV1Schema.safeParse(record[key]).success) {
    context.addIssue({
      code: 'custom',
      message: `DVT metadata ${key} violates the PostgreSQL identifier policy.`,
      path: [...path, key],
    });
  }
}

function addStringEnumMetadataIssue(
  record: Record<string, unknown>,
  key: string,
  allowed: readonly string[],
  path: string[],
  context: z.RefinementCtx
): void {
  if (
    Object.hasOwn(record, key) &&
    (typeof record[key] !== 'string' || !allowed.includes(record[key]))
  ) {
    context.addIssue({
      code: 'custom',
      message: `DVT metadata ${key} is not an admitted value.`,
      path: [...path, key],
    });
  }
}

export function addDvtNodeFieldPolicyIssues(
  node: Pick<WorkspaceGraphAuthoringNode, 'pluginId' | 'kind' | 'metadata'>,
  context: z.RefinementCtx
): void {
  const isSource =
    node.kind === 'dvt:source' &&
    (node.pluginId === 'dvt' || node.pluginId === 'dvt.warehouse-source');
  const isSink = node.kind === 'dvt:sink' && node.pluginId === 'dvt';
  const isTransform =
    node.pluginId === 'dvt' && (node.kind === 'transform' || node.kind === 'dvt:transform');
  if (!isSource && !isSink && !isTransform) return;

  const metadata = node.metadata ?? {};
  const config = metadata['config'];
  if (config !== undefined && !isRecord(config)) {
    context.addIssue({
      code: 'custom',
      message: 'DVT node metadata config must be an object.',
      path: ['metadata', 'config'],
    });
    return;
  }
  if (isRecord(config)) {
    if (isSource || isSink) {
      for (const key of isSource ? ['schema', 'table', 'alias'] : ['schema', 'table']) {
        addPostgresIdentifierMetadataIssue(config, key, ['metadata', 'config'], context);
      }
    }
    if (isSink) {
      addStringEnumMetadataIssue(
        config,
        'materialization',
        ['table', 'view'],
        ['metadata', 'config'],
        context
      );
      addStringEnumMetadataIssue(
        config,
        'writeMode',
        ['replace', 'append'],
        ['metadata', 'config'],
        context
      );
    }
    if (isTransform) {
      if (Object.hasOwn(config, 'resultTarget')) {
        const target = DvtTransformResultTargetV1Schema.safeParse(config['resultTarget']);
        if (!target.success) {
          for (const issue of target.error.issues) {
            context.addIssue({
              ...issue,
              path: ['metadata', 'config', 'resultTarget', ...issue.path],
            });
          }
        }
      }
      addStringEnumMetadataIssue(
        config,
        'materialized',
        ['table', 'view'],
        ['metadata', 'config'],
        context
      );
    }
  }
  if (isSource) {
    for (const key of ['schema', 'tableName', 'sourceName']) {
      addPostgresIdentifierMetadataIssue(metadata, key, ['metadata'], context);
    }
  }
}
