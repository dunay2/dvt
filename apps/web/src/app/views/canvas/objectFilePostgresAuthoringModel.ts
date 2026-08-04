/** Owned concern: validate Canvas authoring metadata against the bounded object-file load contract. */
import {
  LoadObjectFileToPostgresStepTypeConfigSchema,
  type LoadObjectFileToPostgresStepTypeConfig,
} from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';

export const OBJECT_FILE_POSTGRES_PLUGIN_ID = 'dvt.object-file-postgres';
export const OBJECT_FILE_POSTGRES_NODE_KIND = 'dvt:object_file_load';

export type ObjectFilePostgresExecutionScope = LoadObjectFileToPostgresStepTypeConfig['scope'];
export type ObjectFilePostgresAuthoringMetadata = Omit<
  LoadObjectFileToPostgresStepTypeConfig,
  'scope'
>;

export type ObjectFilePostgresStepProjection =
  | Readonly<{
      ok: true;
      stepTypeConfig: LoadObjectFileToPostgresStepTypeConfig;
    }>
  | Readonly<{
      ok: false;
      message: string;
    }>;

export function isObjectFilePostgresNode(node: Pick<CanonicalNode, 'pluginId' | 'kind'>): boolean {
  return (
    node.pluginId === OBJECT_FILE_POSTGRES_PLUGIN_ID && node.kind === OBJECT_FILE_POSTGRES_NODE_KIND
  );
}

export function projectObjectFilePostgresStepTypeConfig(args: {
  node: CanonicalNode;
  executionScope: ObjectFilePostgresExecutionScope | undefined;
}): ObjectFilePostgresStepProjection {
  if (!isObjectFilePostgresNode(args.node)) {
    return {
      ok: false,
      message: `Node ${args.node.id} is not an object-file PostgreSQL load node.`,
    };
  }
  if (args.executionScope === undefined) {
    return {
      ok: false,
      message: `Object-file load ${args.node.name} requires an authorized execution scope.`,
    };
  }

  const metadata = args.node.metadata?.objectFilePostgres;
  const parsed = LoadObjectFileToPostgresStepTypeConfigSchema.safeParse({
    ...(isRecord(metadata) ? metadata : {}),
    scope: args.executionScope,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: `Object-file load ${args.node.name} is not fully configured.`,
    };
  }

  return {
    ok: true,
    stepTypeConfig: parsed.data,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
