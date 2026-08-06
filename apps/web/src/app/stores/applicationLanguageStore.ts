/** Owned concern: implement ConfigureApplicationLanguage as one local presentation preference. */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const APPLICATION_LANGUAGE_STORAGE_KEY = 'dvt-web-application-language';

export type ApplicationLanguage = 'en' | 'es';

type ApplicationLanguageState = {
  language: ApplicationLanguage;
  configureApplicationLanguage: (language: ApplicationLanguage) => void;
};

export function normalizeApplicationLanguage(value: unknown): ApplicationLanguage | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'es' || normalized.startsWith('es-')) {
    return 'es';
  }
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }

  return null;
}

function detectInitialApplicationLanguage(): ApplicationLanguage {
  if (typeof navigator !== 'undefined') {
    const navigatorLanguage = normalizeApplicationLanguage(
      navigator.language || navigator.languages?.[0]
    );
    if (navigatorLanguage) {
      return navigatorLanguage;
    }
  }

  if (typeof document !== 'undefined') {
    const documentLanguage = normalizeApplicationLanguage(document.documentElement.lang);
    if (documentLanguage) {
      return documentLanguage;
    }
  }

  return 'en';
}

function publishDocumentLanguage(language: ApplicationLanguage): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

const initialLanguage = detectInitialApplicationLanguage();
publishDocumentLanguage(initialLanguage);

export const useApplicationLanguageStore = create<ApplicationLanguageState>()(
  persist(
    (set) => ({
      language: initialLanguage,
      configureApplicationLanguage: (language) => {
        publishDocumentLanguage(language);
        set({ language });
      },
    }),
    {
      name: APPLICATION_LANGUAGE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persistedLanguage = normalizeApplicationLanguage(
          (persistedState as Partial<ApplicationLanguageState> | null)?.language
        );
        const language = persistedLanguage ?? currentState.language;
        publishDocumentLanguage(language);
        return { ...currentState, language };
      },
    }
  )
);

export function getApplicationLanguage(): ApplicationLanguage {
  return useApplicationLanguageStore.getState().language;
}
