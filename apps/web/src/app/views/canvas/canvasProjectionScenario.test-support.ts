/** Connected, typed projection fixture built through the production source constructor. */
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';

export function projectionScenario(
  args: Readonly<{
    sourceNodeId: string;
    targetNodeId: string;
    fields?: readonly string[];
  }>
) {
  return createCanvasRelationalTreeProjectionDraft({
    targetNodeId: args.targetNodeId,
    input: {
      nodeId: args.sourceNodeId,
      schema: 'public',
      table: 'customers',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'warehouse-main',
        },
        sourceObjectId: 'public.customers',
      },
      fields: (args.fields ?? ['name', 'email', 'country']).map((name) => ({
        name,
        dataType: 'string',
        joinDataType: 'string',
        nullable: true,
      })),
    },
  });
}
