/**
 * @ownedConcern Engine architecture test support for source and documentation discovery.
 *
 * Centralizes repository path readers and semantic assertions used by engine
 * architecture fitness tests. This module is test-only infrastructure and does
 * not define runtime engine behavior.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import yaml from 'js-yaml';
import ts from 'typescript';
import { expect } from 'vitest';

export const ENGINE_ARCHITECTURE_TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
export const ENGINE_PACKAGE_ROOT = join(ENGINE_ARCHITECTURE_TEST_ROOT, '../..');
export const ENGINE_SRC_ROOT = join(ENGINE_PACKAGE_ROOT, 'src');
export const ENGINE_TEST_ROOT = join(ENGINE_PACKAGE_ROOT, 'test');
export const REPO_ROOT = join(ENGINE_PACKAGE_ROOT, '../../..');
export const ENGINE_ARCHITECTURE_DOC_ROOT = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture'
);

export function repoPath(relativePath: string): string {
  return join(REPO_ROOT, relativePath);
}

export function engineArchitectureDocPath(fileName: string): string {
  return join(ENGINE_ARCHITECTURE_DOC_ROOT, fileName);
}

export function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_SRC_ROOT, relativePath), 'utf8');
}

export function readEngineTestSource(relativePath: string): string {
  return readFileSync(join(ENGINE_TEST_ROOT, relativePath), 'utf8');
}

export function readRepoSource(relativePath: string): string {
  return readFileSync(repoPath(relativePath), 'utf8');
}

export function readEngineArchitectureDoc(fileName: string): string {
  return readFileSync(engineArchitectureDocPath(fileName), 'utf8');
}

export function expectFileExists(absolutePath: string): void {
  expect(existsSync(absolutePath), `${absolutePath} should exist`).toBe(true);
}

export function expectMarkdownSections(markdown: string, headings: readonly string[]): void {
  for (const heading of headings) {
    expect(markdown, `markdown should contain ${heading}`).toContain(heading);
  }
}

export type ComponentDocContract = {
  commandRails?: string[];
  componentId?: string;
  diagramPack?: string;
  publicApi?: string[];
  requiredSemantics?: string[];
};

export function extractComponentDocContract(markdown: string): ComponentDocContract {
  const match = /```component-doc-contract\s*\r?\n([\s\S]*?)\r?\n```/.exec(markdown);
  expect(match, 'component guide should declare component-doc-contract').not.toBeNull();
  return yaml.load(match?.[1] ?? '') as ComponentDocContract;
}

export function expectComponentDocContract(
  contract: ComponentDocContract,
  expected: {
    commandRails: readonly string[];
    componentId: string;
    diagramPack: string;
    publicApi: readonly string[];
    requiredSemantics: readonly string[];
  }
): void {
  expect(contract.componentId).toBe(expected.componentId);
  expect(contract.diagramPack).toBe(expected.diagramPack);
  expect(contract.commandRails).toEqual(expect.arrayContaining([...expected.commandRails]));
  expect(contract.publicApi).toEqual(expect.arrayContaining([...expected.publicApi]));
  expect(contract.requiredSemantics).toEqual(
    expect.arrayContaining([...expected.requiredSemantics])
  );
}

export function expectOwnedConcernHeader(
  source: string,
  tokens: readonly string[],
  sourcePath: string
): void {
  const header = source.slice(0, 800);
  for (const token of tokens) {
    expect(header, `${sourcePath} should declare ${token}`).toContain(token);
  }
}

export function expectForbiddenTokensAbsent(
  source: string,
  forbiddenTokens: readonly string[],
  sourcePath: string
): void {
  for (const token of forbiddenTokens) {
    expect(source, `${sourcePath} must not contain ${token}`).not.toContain(token);
  }
}

export function getClassConstructorParameterPropertyTypes(
  source: string,
  className: string
): Record<string, string> {
  const sourceFile = ts.createSourceFile(
    `${className}.architecture-fixture.ts`,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const constructorParameterProperties: Record<string, string> = {};

  function visit(node: ts.Node): void {
    if (ts.isClassDeclaration(node) && node.name?.text === className) {
      for (const member of node.members) {
        if (!ts.isConstructorDeclaration(member)) continue;
        for (const parameter of member.parameters) {
          if (!ts.isIdentifier(parameter.name) || !parameter.type) continue;
          if (isParameterProperty(parameter)) {
            constructorParameterProperties[parameter.name.text] =
              parameter.type.getText(sourceFile);
          }
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return constructorParameterProperties;
}

function isParameterProperty(parameter: ts.ParameterDeclaration): boolean {
  const modifiers = ts.canHaveModifiers(parameter) ? ts.getModifiers(parameter) : undefined;
  return (
    modifiers?.some((modifier) =>
      [
        ts.SyntaxKind.PublicKeyword,
        ts.SyntaxKind.PrivateKeyword,
        ts.SyntaxKind.ProtectedKeyword,
        ts.SyntaxKind.ReadonlyKeyword,
      ].includes(modifier.kind)
    ) ?? false
  );
}
