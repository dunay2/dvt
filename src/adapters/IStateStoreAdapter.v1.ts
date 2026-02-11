import { TenantId, IdempotencyKey } from '../contracts/types';

export interface IStateStoreAdapter {
  read<T>(tenantId: TenantId, key: string): Promise<T | undefined>;
  write<T>(tenantId: TenantId, key: string, value: T, idempotencyKey?: IdempotencyKey): Promise<void>;
  health(): Promise<boolean>;
  close(): Promise<void>;
}
