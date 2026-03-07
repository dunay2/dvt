import type { ICompiledCodeStorage } from '../../ports/ICompiledCodeStorage.js';

export class NoopCompiledCodeStorage implements ICompiledCodeStorage {
  async upload(tenantId: string, sha256: string): Promise<string> {
    return `noop://${tenantId}/${sha256}`;
  }

  async read(_tenantId: string, _sha256: string): Promise<Buffer> {
    return Buffer.alloc(0);
  }

  async exists(_tenantId: string, _sha256: string): Promise<boolean> {
    return false;
  }
}
