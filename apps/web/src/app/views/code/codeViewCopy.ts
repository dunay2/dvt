/**
 * Owned concern: resolve Code catalogs through the shared locale-aware string resolver.
 * @decision Locale catalogs provide data; region fallback belongs to resolveString.
 * @consequence Adding a translation does not add language branches to views or commands.
 */
import { detectBrowserLocale } from '../../browserLocale';
import { resolveString } from '../../plugins/contracts/PluginManifest';
import { CODE_VIEW_MESSAGES } from './codeViewMessages';
import { CODE_INLINE_MESSAGES } from './codeInlineMessages';
import { CODE_MODEL_COMMAND_MESSAGES } from './codeModelCommandMessages';
import { CODE_FILE_CREATION_MESSAGES } from './codeFileCreationMessages';

export type CodeViewLanguage = NonNullable<Parameters<typeof resolveString>[1]>;

export type CodeViewCopy = typeof CODE_VIEW_MESSAGES.en;
export type CodeInlineReferenceCopy = typeof CODE_INLINE_MESSAGES.en;

function resolveCodeCatalog<Key extends string>(
  namespace: string,
  catalog: Readonly<
    { en: Readonly<Record<Key, string>> } & Record<string, Readonly<Record<Key, string>>>
  >,
  locale: CodeViewLanguage
): Readonly<Record<Key, string>> {
  return Object.fromEntries(
    Object.entries<string>(catalog.en).map(([key, fallback]) => [
      key,
      resolveString(
        {
          key: namespace + '.' + key,
          fallback,
          translations: Object.fromEntries(
            Object.entries(catalog).map(([language, values]) => [language, values[key as Key]])
          ),
        },
        locale
      ),
    ])
  ) as Readonly<Record<Key, string>>;
}

export function resolveCodeViewCopy(
  locale: CodeViewLanguage = detectBrowserLocale()
): CodeViewCopy {
  return resolveCodeCatalog('code', CODE_VIEW_MESSAGES, locale);
}
export const codeViewCopy = resolveCodeViewCopy();

export function resolveCodeInlineReferenceCopy(locale: CodeViewLanguage): CodeInlineReferenceCopy {
  return resolveCodeCatalog('code.references', CODE_INLINE_MESSAGES, locale);
}

export function resolveCodeModelCommandCopy(locale: CodeViewLanguage) {
  return resolveCodeCatalog('code.modelCommands', CODE_MODEL_COMMAND_MESSAGES, locale);
}

export function resolveCodeFileCreationCopy(locale: CodeViewLanguage) {
  return resolveCodeCatalog('code.fileCreation', CODE_FILE_CREATION_MESSAGES, locale);
}
