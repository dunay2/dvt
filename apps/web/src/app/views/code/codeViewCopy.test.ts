/** Protect established Code copy plus regional translations and English fallback. */
import { describe, expect, it } from 'vitest';

import {
  resolveCodeFileCreationCopy,
  resolveCodeModelCommandCopy,
  resolveCodeViewCopy,
} from './codeViewCopy';

describe('resolveCodeViewCopy', () => {
  it('uses English fallback copy for unsupported locales', () => {
    expect(resolveCodeViewCopy('en-US')).toMatchObject({
      title: 'Code',
      explorerTitle: 'Explorer',
      editorLoadingMessage: 'Loading Monaco editor...',
      workingTreePersistedInvalidLabel: 'Invalid project',
      workingTreePersistedVerificationUnavailableLabel: 'Verification unavailable',
      routeEmptyTitle: 'No workspace files available',
      filePropertiesTitle: 'File properties',
      name: 'Name',
      path: 'Path',
      language: 'Language',
      loadedVersionModified: 'Loaded version modified',
    });
  });

  it('resolves Spanish copy only when the active locale is Spanish', () => {
    expect(resolveCodeViewCopy('es-ES')).toMatchObject({
      title: 'Código',
      explorerTitle: 'Explorador',
      editorLoadingMessage: 'Cargando editor Monaco...',
      workingTreePersistedInvalidLabel: 'Proyecto no válido',
      workingTreePersistedVerificationUnavailableLabel: 'Verificación no disponible',
      routeEmptyTitle: 'No hay archivos del workspace disponibles',
      filePropertiesTitle: 'Propiedades del archivo',
      name: 'Nombre',
      path: 'Ruta',
      language: 'Lenguaje',
      loadedVersionModified: 'Modificación de la versión cargada',
    });
  });
});

describe('Code message catalogs', () => {
  it.each([
    [
      'es-ES',
      'Código',
      'Solo lectura',
      'Compilar',
      'Ejecutar',
      'Nuevo archivo',
      'Importar archivo',
    ],
    ['en-GB', 'Code', 'Read only', 'Compile', 'Execute', 'New file', 'Import file'],
    ['fr-FR', 'Code', 'Read only', 'Compile', 'Execute', 'New file', 'Import file'],
  ])(
    'resolves regional locale %s through the shared fallback policy',
    (locale, title, readOnly, compile, execute, newFile, importFile) => {
      const view = resolveCodeViewCopy(locale);
      const commands = resolveCodeModelCommandCopy(locale);

      expect(view.title).toBe(title);
      expect(view.workingTreeReadOnlyLabel).toBe(readOnly);
      expect(commands.compile).toBe(compile);
      expect(commands.execute).toBe(execute);
      const files = resolveCodeFileCreationCopy(locale);
      expect(files.newFile).toBe(newFile);
      expect(files.importFile).toBe(importFile);
    }
  );
});
