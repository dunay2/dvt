export interface PublishContentAddressedArtifactInput {
  readonly tenantId: string;
  readonly storageUri: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
  readonly abortSignal?: globalThis.AbortSignal;
}

export interface PublishedContentAddressedArtifact {
  readonly disposition: 'created' | 'verified-existing';
  readonly storageUri: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly mediaType: string;
}

export interface IContentAddressedArtifactStore {
  publish(input: PublishContentAddressedArtifactInput): Promise<PublishedContentAddressedArtifact>;
}
