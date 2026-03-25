const DENIED_URI_SCHEME_LIST = ['file', 'ftp', 'gopher', 'data', 'javascript', 'mailto'] as const;

const DENIED_URI_SCHEMES = new Set<string>(DENIED_URI_SCHEME_LIST);

export function isDeniedUriScheme(scheme: string): boolean {
  return DENIED_URI_SCHEMES.has(scheme);
}
