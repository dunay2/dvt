export class ObjectFileIngestionRejectedError extends Error {
  public readonly name = 'ObjectFileIngestionRejectedError';

  public constructor(
    public readonly code: string,
    message = code
  ) {
    super(message);
  }
}

export class ObjectFileIngestionRuntimeError extends Error {
  public readonly name = 'ObjectFileIngestionRuntimeError';

  public constructor(public readonly code: string) {
    super(code);
  }
}
