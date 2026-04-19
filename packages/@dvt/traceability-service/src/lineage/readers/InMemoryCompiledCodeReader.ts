import type { CompiledCodeRef } from '@dvt/contracts';

import { sha256HexUtf8 } from '../compiledCodeRef.js';
import type { ICompiledCodeReader } from '../contracts.js';
import { CompiledCodeNotFoundError } from '../errors.js';
import type { CompiledCodeBlob } from '../types.js';

export class InMemoryCompiledCodeReader implements ICompiledCodeReader {
  constructor(private readonly storageByUri: ReadonlyMap<string, string>) {}

  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    const sqlText = this.storageByUri.get(ref.storageUri);
    if (sqlText === undefined) {
      throw new CompiledCodeNotFoundError({ storageUri: ref.storageUri });
    }

    const sizeBytes = Buffer.byteLength(sqlText, 'utf8');

    return {
      sourceUri: ref.storageUri,
      sqlText,
      sha256: sha256HexUtf8(sqlText),
      sizeBytes,
      encoding: 'utf-8',
    };
  }
}
