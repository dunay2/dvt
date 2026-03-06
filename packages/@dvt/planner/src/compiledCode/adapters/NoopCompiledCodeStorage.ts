import type { ICompiledCodeStorage } from '../../ports/ICompiledCodeStorage.js';

export class NoopCompiledCodeStorage implements ICompiledCodeStorage {
  async upload(sha256: string): Promise<string> {
    return `noop://${sha256}`;
  }
}
