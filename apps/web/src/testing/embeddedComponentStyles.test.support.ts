/** Owned concern: inspect statically authored appearance in one component without executing it. */
import ts from 'typescript';

type StyleFinding = Readonly<{ line: number; kind: 'style' | 'class' | 'syntax' }>;

export function inspectEmbeddedComponentStyles(content: string): readonly StyleFinding[] {
  const fileName = 'component.tsx';
  const source = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const options: ts.CompilerOptions = { noLib: true, noResolve: true, jsx: ts.JsxEmit.Preserve };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => (name === fileName ? source : undefined);
  const program = ts.createProgram([fileName], options, host);
  const checker = program.getTypeChecker();
  const findings: StyleFinding[] = [];
  const visited = { class: new Set<ts.Node>(), props: new Set<ts.Node>() };

  function report(node: ts.Node, kind: StyleFinding['kind']): void {
    findings.push({
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      kind,
    });
  }

  function followSymbol(node: ts.Node, mode: 'class' | 'props'): void {
    const symbol = checker.getSymbolAtLocation(node);
    for (const declaration of symbol?.declarations ?? []) {
      if (ts.isVariableDeclaration(declaration) || ts.isPropertyAssignment(declaration)) {
        inspectValue(declaration.initializer, mode);
      } else if (ts.isFunctionDeclaration(declaration)) {
        inspectValue(declaration, mode);
      }
    }
  }

  function inspectObject(node: ts.ObjectLiteralExpression, mode: 'class' | 'props'): void {
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        inspectValue(property.expression, mode);
        continue;
      }
      const name = property.name;
      if (mode === 'class') {
        if (ts.isComputedPropertyName(name)) inspectValue(name.expression, mode);
        else report(name, 'class');
        continue;
      }
      const keyNode = ts.isComputedPropertyName(name) ? name.expression : name;
      const key =
        ts.isIdentifier(keyNode) || ts.isStringLiteralLike(keyNode) ? keyNode.text : undefined;
      if (key === 'style') report(property, 'style');
      if (key === 'className') {
        if (ts.isPropertyAssignment(property)) inspectValue(property.initializer, 'class');
        else if (ts.isShorthandPropertyAssignment(property)) {
          const symbol = checker.getShorthandAssignmentValueSymbol(property);
          for (const declaration of symbol?.declarations ?? []) {
            if (ts.isVariableDeclaration(declaration))
              inspectValue(declaration.initializer, 'class');
          }
        }
      }
    }
  }

  function inspectReturns(node: ts.Node, mode: 'class' | 'props'): void {
    if (ts.isReturnStatement(node)) inspectValue(node.expression, mode);
    else if (!ts.isFunctionLike(node))
      ts.forEachChild(node, (child) => inspectReturns(child, mode));
  }

  function inspectValue(node: ts.Node | undefined, mode: 'class' | 'props'): void {
    if (node == null || visited[mode].has(node)) return;
    visited[mode].add(node);
    if (ts.isStringLiteralLike(node)) {
      if (mode === 'class' && node.text.trim()) report(node, 'class');
    } else if (ts.isIdentifier(node)) {
      followSymbol(node, mode);
    } else if (ts.isPropertyAccessExpression(node)) {
      followSymbol(node.name, mode);
    } else if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      const symbol = checker
        .getTypeAtLocation(node.expression)
        .getProperty(node.argumentExpression.text);
      for (const declaration of symbol?.declarations ?? []) {
        if (ts.isPropertyAssignment(declaration)) inspectValue(declaration.initializer, mode);
      }
    } else if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isSpreadElement(node)
    ) {
      inspectValue(node.expression, mode);
    } else if (ts.isConditionalExpression(node)) {
      inspectValue(node.whenTrue, mode);
      inspectValue(node.whenFalse, mode);
    } else if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken)
        inspectValue(node.left, mode);
      inspectValue(node.right, mode);
    } else if (ts.isTemplateExpression(node)) {
      if (mode === 'class' && node.head.text.trim()) report(node.head, 'class');
      for (const span of node.templateSpans) {
        inspectValue(span.expression, mode);
        if (mode === 'class' && span.literal.text.trim()) report(span.literal, 'class');
      }
    } else if (ts.isCallExpression(node)) {
      inspectValue(node.expression, mode);
      for (const argument of node.arguments) inspectValue(argument, mode);
    } else if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      if (node.body != null && ts.isBlock(node.body)) inspectReturns(node.body, mode);
      else inspectValue(node.body, mode);
    } else if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) inspectValue(element, mode);
    } else if (ts.isObjectLiteralExpression(node)) {
      inspectObject(node, mode);
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (ts.isIdentifier(node.tagName) && node.tagName.text === 'style') report(node, 'style');
      for (const attribute of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(attribute)) {
          inspectValue(attribute.expression, 'props');
        } else if (attribute.name.getText(source) === 'style') {
          report(attribute, 'style');
        } else if (attribute.name.getText(source) === 'className') {
          const initializer = attribute.initializer;
          inspectValue(
            initializer != null && ts.isJsxExpression(initializer)
              ? initializer.expression
              : initializer,
            'class'
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  for (const diagnostic of program.getSyntacticDiagnostics(source)) {
    findings.push({
      line: source.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1,
      kind: 'syntax',
    });
  }
  visit(source);
  return findings;
}
