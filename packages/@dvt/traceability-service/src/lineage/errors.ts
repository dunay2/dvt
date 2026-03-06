export class CompiledCodeReaderError extends Error {
  readonly code = 'COMPILED_CODE_READER_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'CompiledCodeReaderError';
  }
}

export class CompiledCodeNotFoundError extends Error {
  readonly code = 'COMPILED_CODE_NOT_FOUND';

  constructor(message: string) {
    super(message);
    this.name = 'CompiledCodeNotFoundError';
  }
}

export class CompiledCodeIntegrityError extends Error {
  readonly code = 'COMPILED_CODE_INTEGRITY_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'CompiledCodeIntegrityError';
  }
}

export class CompiledCodeUnsupportedSchemeError extends Error {
  readonly code = 'COMPILED_CODE_UNSUPPORTED_SCHEME';

  constructor(message: string) {
    super(message);
    this.name = 'CompiledCodeUnsupportedSchemeError';
  }
}
