/**
 * Owned concern: test-local file catalog helpers for semantic module
 * architecture checks in `apps/api`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MODULES_ROOT = join(import.meta.dirname, '../../src/modules');
export const API_DOCS_ROOT = join(import.meta.dirname, '../../docs');

export class ArchitectureTextFile {
  public constructor(
    public readonly fileName: string,
    public readonly sourceText: string
  ) {}
}

class ArchitectureFileCatalog {
  public constructor(private readonly rootPath: string) {}

  public exists(fileName: string): boolean {
    return existsSync(join(this.rootPath, fileName));
  }

  public read(fileName: string): ArchitectureTextFile {
    return new ArchitectureTextFile(
      fileName,
      readFileSync(join(this.rootPath, fileName), 'utf8')
    );
  }
}

const MODULE_COMPONENT_FILES = new ArchitectureFileCatalog(MODULES_ROOT);
const API_DOC_FILES = new ArchitectureFileCatalog(API_DOCS_ROOT);

export function moduleComponentExists(fileName: string): boolean {
  return MODULE_COMPONENT_FILES.exists(fileName);
}

export function readModuleTextFile(fileName: string): ArchitectureTextFile {
  return MODULE_COMPONENT_FILES.read(fileName);
}

export function readApiDoc(fileName: string): string {
  return API_DOC_FILES.read(fileName).sourceText;
}

export function apiDocExists(fileName: string): boolean {
  return API_DOC_FILES.exists(fileName);
}
