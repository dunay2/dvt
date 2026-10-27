/** Owned concern: expose connection-test state and its single command to presentation. */
import type { TestWarehouseConnectionResult } from '../../ports/workspace';
import type { SourceImportRequestState } from './sourceImportRequestState';

export interface SourceImportConnectionTestBinding {
  readonly model: SourceImportRequestState<TestWarehouseConnectionResult>;
  test(): Promise<void>;
}
