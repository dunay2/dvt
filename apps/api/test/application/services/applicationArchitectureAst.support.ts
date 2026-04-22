/**
 * Owned concern: model the start-run execution-capacity admission component for
 * semantic application-service architecture tests.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

type NamedImportContract = {
  readonly importedName: string;
  readonly moduleSpecifier: string;
};

type ConstructorObjectIdentifierBinding = {
  readonly constructorName: string;
  readonly identifierName: string;
  readonly propertyName: string;
};

class ApplicationArchitectureSource {
  public readonly sourceFile: ts.SourceFile;

  public constructor(
    public readonly absolutePath: string,
    public readonly sourceText: string
  ) {
    this.sourceFile = ts.createSourceFile(
      absolutePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
  }

  public collectNamedImports(moduleSpecifier: string): string[] {
    const imports: string[] = [];

    for (const statement of this.sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) {
        continue;
      }

      if (statement.moduleSpecifier.getText(this.sourceFile) !== `'${moduleSpecifier}'`) {
        continue;
      }

      const namedBindings = statement.importClause?.namedBindings;
      if (!namedBindings || !ts.isNamedImports(namedBindings)) {
        continue;
      }

      for (const element of namedBindings.elements) {
        imports.push(element.name.text);
      }
    }

    return imports;
  }

  public hasConstructorObjectIdentifierBinding(
    binding: ConstructorObjectIdentifierBinding
  ): boolean {
    let found = false;

    const visit = (node: ts.Node): void => {
      const argument = this.getNamedConstructorArgument(node, binding.constructorName);
      if (
        argument !== null &&
        this.hasIdentifierProperty(argument, binding.propertyName, binding.identifierName)
      ) {
        found = true;
        return;
      }

      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return found;
  }

  public hasNamedImport(contract: NamedImportContract): boolean {
    return this.collectNamedImports(contract.moduleSpecifier).includes(contract.importedName);
  }

  private getNamedConstructorArgument(
    node: ts.Node,
    constructorName: string
  ): ts.ObjectLiteralExpression | null {
    if (!ts.isNewExpression(node)) {
      return null;
    }
    if (!ts.isIdentifier(node.expression) || node.expression.text !== constructorName) {
      return null;
    }

    const argument = node.arguments?.[0];
    return argument && ts.isObjectLiteralExpression(argument) ? argument : null;
  }

  private hasIdentifierProperty(
    objectLiteral: ts.ObjectLiteralExpression,
    propertyName: string,
    identifierName: string
  ): boolean {
    return objectLiteral.properties.some(
      (property) =>
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === propertyName &&
        ts.isIdentifier(property.initializer) &&
        property.initializer.text === identifierName
    );
  }
}

class ApplicationComponentArtifact {
  public constructor(public readonly absolutePath: string) {}

  public exists(): boolean {
    return existsSync(this.absolutePath);
  }

  public hasOwnedConcernDocblock(): boolean {
    return this.readText().startsWith('/**\n * Owned concern:');
  }

  public readSource(): ApplicationArchitectureSource {
    return new ApplicationArchitectureSource(this.absolutePath, this.readText());
  }

  private readText(): string {
    return readFileSync(this.absolutePath, 'utf8');
  }
}

const APPLICATION_ROOT = join(import.meta.dirname, '../../../src/application');
const DOCS_ROOT = join(import.meta.dirname, '../../../docs');
const MODULES_ROOT = join(import.meta.dirname, '../../../src/modules');

function defineArtifact(...segments: string[]): ApplicationComponentArtifact {
  return new ApplicationComponentArtifact(join(...segments));
}

export const START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT = {
  artifacts: {
    backpressureUseCase: defineArtifact(
      APPLICATION_ROOT,
      'services/BackpressureAwareStartRunUseCase.ts'
    ),
    componentGuide: defineArtifact(
      DOCS_ROOT,
      'start-run-execution-capacity-admission-component.md'
    ),
    defaultBinding: defineArtifact(
      APPLICATION_ROOT,
      'services/defaultStartRunExecutionCapacityPort.ts'
    ),
    port: defineArtifact(APPLICATION_ROOT, 'ports/IStartRunExecutionCapacityPort.ts'),
    runtimeModule: defineArtifact(MODULES_ROOT, 'buildProtectedRuntimeModule.ts'),
  },
  contracts: {
    abstractPortImport: {
      importedName: 'IStartRunExecutionCapacityPort',
      moduleSpecifier: '../ports/IStartRunExecutionCapacityPort.js',
    },
    defaultBindingImport: {
      importedName: 'DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT',
      moduleSpecifier: '../application/services/defaultStartRunExecutionCapacityPort.js',
    },
    useCaseForbiddenDefaultBindingModule: './defaultStartRunExecutionCapacityPort.js',
    runtimeExecutionCapacityBinding: {
      constructorName: 'BackpressureAwareStartRunUseCase',
      identifierName: 'DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT',
      propertyName: 'executionCapacity',
    },
  },
} as const;
