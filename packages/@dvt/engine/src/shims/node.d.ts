declare module 'node:crypto' {
  export interface Hash {
    update(data: Uint8Array | string): Hash;
    digest(encoding: 'hex'): string;
  }

  export function createHash(algorithm: 'sha256'): Hash;
}

declare module 'node:url' {
  export class URL {
    constructor(url: string);
    readonly protocol: string;
    readonly hostname: string;
  }
}
