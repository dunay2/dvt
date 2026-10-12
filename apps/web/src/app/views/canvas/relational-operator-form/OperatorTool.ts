/** Disposable properties presented by an admitted operation form. */
import type { DvtSubstraitSortKey } from '@dvt/postgres-projection';
import type { resolveDvtSubstraitFilterCapabilities } from '../canvasFilterCapabilities';

export type CanvasRelationalOperatorTool = Readonly<{
  id: 'filter' | 'aggregate' | 'window' | 'sort' | 'fetch';
  enabled: boolean;
  active: boolean;
  fields: readonly Readonly<{ fieldId: string; name: string; dataType?: string }>[];
  alias?: string;
  fieldId?: string;
  aggregateFunction?: 'count' | 'sum';
  measureFieldId?: string;
  measureFields?: readonly Readonly<{ fieldId: string; name: string }>[];
  partitionFieldIds?: readonly string[];
  value?: string;
  capabilityId?: string;
  comparisons?: ReturnType<typeof resolveDvtSubstraitFilterCapabilities>;
  sortKeys?: readonly DvtSubstraitSortKey[];
  offset?: bigint | null;
  count?: bigint | null;
}>;
