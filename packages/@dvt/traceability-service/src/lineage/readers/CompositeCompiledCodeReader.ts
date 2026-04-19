import type { CompiledCodeRef } from '@dvt/contracts';

import type { ICompiledCodeReader } from '../contracts.js';
import { CompiledCodeUnsupportedSchemeError } from '../errors.js';
import type { CompiledCodeBlob } from '../types.js';

export class CompositeCompiledCodeReader implements ICompiledCodeReader {
  constructor(private readonly readersByScheme: ReadonlyMap<string, ICompiledCodeReader>) {}

  async read(ref: CompiledCodeRef): Promise<CompiledCodeBlob> {
    const scheme = getUriScheme(ref.storageUri);
    const reader = this.readersByScheme.get(scheme);
    if (reader === undefined) {
      throw new CompiledCodeUnsupportedSchemeError({
        actualScheme: scheme,
        storageUri: ref.storageUri,
      });
    }
    return reader.read(ref);
  }
}

function getUriScheme(uri: string): string {
  const separator = uri.indexOf(':');
  if (separator <= 0) return 'unknown';
  return uri.slice(0, separator).toLowerCase();
}
