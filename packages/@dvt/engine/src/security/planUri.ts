import { URL } from 'node:url';

export class PlanUri {
  private constructor(
    readonly raw: string,
    readonly lowerRaw: string,
    readonly scheme: string | null
  ) {}

  static from(raw: string): PlanUri {
    const lowerRaw = raw.toLowerCase();
    return new PlanUri(raw, lowerRaw, readUriScheme(lowerRaw));
  }

  isHttpLike(): boolean {
    return this.lowerRaw.startsWith('http://') || this.lowerRaw.startsWith('https://');
  }

  toHttpUrl(): URL {
    return new URL(this.raw);
  }
}

function readUriScheme(uriLower: string): string | null {
  const match = uriLower.match(/^([a-z][a-z0-9+.-]*):/);
  const scheme = match?.[1];
  return typeof scheme === 'string' ? scheme : null;
}
