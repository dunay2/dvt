/** Owned concern: select the supported copy catalog without acquiring runtime state. */
export function resolveCopyLanguage(locale?: string): 'en' | 'es' {
  return locale?.trim().toLowerCase().startsWith('es') ? 'es' : 'en';
}
