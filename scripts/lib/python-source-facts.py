"""Parse source bytes into syntax facts without importing the selected module."""
import ast
import json
import sys


def source_offsets(source, line, column):
    starts = [0]
    for index, character in enumerate(source):
        if character == "\n" or (character == "\r" and source[index + 1:index + 2] != "\n"):
            starts.append(index + 1)
    start = starts[line - 1]
    prefix = source[:start] + source[start:].encode("utf-8")[:column].decode("utf-8")
    return len(prefix), len(prefix.encode("utf-16-le")) // 2


def normalized_body(body):
    return json.dumps([ast.dump(statement, include_attributes=False) for statement in body],
                      ensure_ascii=True, separators=(",", ":"))


def has_implementation(node):
    if isinstance(node, ast.Lambda):
        return not (isinstance(node.body, ast.Constant) and node.body.value is Ellipsis) and not (
            isinstance(node.body, ast.Name) and node.body.id == "NotImplemented")
    for statement in node.body:
        if isinstance(statement, ast.Pass):
            continue
        if isinstance(statement, ast.Expr) and isinstance(statement.value, ast.Constant):
            if isinstance(statement.value.value, str) or statement.value.value is Ellipsis:
                continue
        value = statement.exc if isinstance(statement, ast.Raise) else (
            statement.value if isinstance(statement, ast.Return) else None)
        if isinstance(value, ast.Call):
            value = value.func
        if isinstance(value, ast.Name) and value.id in ("NotImplemented", "NotImplementedError"):
            continue
        if isinstance(statement, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            if not has_implementation(statement):
                continue
        return True
    return False


def literal_imports(tree):
    imports = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            imports.add("." * node.level + (node.module or ""))
    return sorted(imports)


def read_source_facts(source, path):
    tree = ast.parse(source, filename=path, type_comments=True)
    declarations = []

    def record(node, name, kind, scope, top_level):
        start_char, start = source_offsets(source, node.lineno, node.col_offset)
        end_char, end = source_offsets(source, node.end_lineno, node.end_col_offset)
        implementation = node.value if isinstance(getattr(node, "value", None), ast.Lambda) else node
        body = ([implementation.body] if isinstance(implementation, ast.Lambda) else implementation.body) if kind != "variable" else []
        body_start = source_offsets(source, body[0].lineno, body[0].col_offset)[0] if body else end_char
        qualified = scope + "." + name if scope else name
        declarations.append({
            "name": name, "qualifiedName": qualified, "kind": kind,
            "implemented": bool(body) and has_implementation(implementation), "linkable": True,
            "topLevel": top_level, "exportKind": "internal",
            "start": start, "end": end, "startLine": node.lineno, "endLine": node.end_lineno,
            "signature": source[start_char:body_start].strip(),
            "normalizedBody": normalized_body(body) if body else "",
            "statementCount": len(body), "isAsync": isinstance(node, ast.AsyncFunctionDef),
        })
        return qualified

    def visit(node, scope="", parent_kind=None, top_level=False):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            kind = "class" if isinstance(node, ast.ClassDef) else (
                "method" if parent_kind == "class" else "function")
            qualified = record(node, node.name, kind, scope, top_level)
            for child in node.body:
                visit(child, qualified, kind)
            return
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for target in targets:
                for name in ast.walk(target):
                    if isinstance(name, ast.Name) and isinstance(name.ctx, ast.Store):
                        record(node, name.id, "function" if isinstance(node.value, ast.Lambda) else "variable", scope, top_level)
        for child in ast.iter_child_nodes(node):
            visit(child, scope, parent_kind, isinstance(node, ast.Module))

    visit(tree)
    return {"schemaVersion": 1, "language": "python", "path": path,
            "sourceLength": len(source.encode("utf-16-le")) // 2,
            "declarations": declarations, "importRefs": literal_imports(tree)}


def main():
    try:
        data = sys.stdin.buffer.read(8 * 1024 * 1024 + 1)
        if len(data) > 8 * 1024 * 1024:
            raise ValueError("Request too large")
        request = json.loads(data)
        if (not isinstance(request, dict) or set(request) != {"schemaVersion", "path", "content"}
                or type(request["schemaVersion"]) is not int or request["schemaVersion"] != 1
                or not isinstance(request["path"], str)
                or not isinstance(request["content"], str)):
            raise ValueError("Invalid request")
        result = read_source_facts(request["content"], request["path"])
        sys.stdout.write(json.dumps(result, ensure_ascii=True, separators=(",", ":")))
        return 0
    except (ValueError, SyntaxError, RecursionError, UnicodeError):
        sys.stderr.write("Python source facts rejected\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
