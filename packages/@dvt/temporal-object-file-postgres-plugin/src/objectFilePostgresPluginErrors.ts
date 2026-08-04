export class ObjectFileIngestionRejectedError extends Error {
  public readonly name = 'ObjectFileIngestionRejectedError';

  public constructor(
    public readonly code: string,
    message = code
  ) {
    super(message);
  }
}
