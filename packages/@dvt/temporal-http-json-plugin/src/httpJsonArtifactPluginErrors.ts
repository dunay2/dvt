export class HttpJsonArtifactAcquisitionRejectedError extends Error {
  public constructor(readonly code: string) {
    super(code);
    this.name = 'HttpJsonArtifactAcquisitionRejectedError';
  }
}

export class HttpJsonArtifactAcquisitionRuntimeError extends Error {
  public constructor(readonly code: string) {
    super(code);
    this.name = 'HttpJsonArtifactAcquisitionRuntimeError';
  }
}
