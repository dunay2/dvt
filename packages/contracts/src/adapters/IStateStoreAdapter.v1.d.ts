import { TenantId, IdempotencyKey } from '../types/contracts';
export interface IStateStoreAdapter {
  read<T>(tenantId: TenantId, key: string): Promise<T | undefined>;
  write<T>(
    tenantId: TenantId,
    key: string,
    value: T,
    idempotencyKey?: IdempotencyKey
  ): Promise<void>;
  health(): Promise<boolean>;
  close(): Promise<void>;
}
//# sourceMappingURL=IStateStoreAdapter.v1.d.ts.map
