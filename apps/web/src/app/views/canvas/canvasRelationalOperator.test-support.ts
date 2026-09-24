import type { DvtSubstraitUnionAllSource } from './canvasDvtSubstraitSetComposition';
export const source = (table: string): DvtSubstraitUnionAllSource => ({
  nodeId: table,
  schema: 'public',
  table,
  fields: [
    { name: 'customer_id', type: 'string' as const },
    { name: 'name', type: 'string' as const },
  ],
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef: {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse',
      provider: 'postgres' as const,
    },
    sourceObjectId: `public.${table}`,
  },
});
