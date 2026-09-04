import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const contextId = process.argv[2];
if (!contextId || !/^[a-z0-9-]+$/.test(contextId)) {
  throw new Error('Usage: node generate-source-first-context.mjs <context-id>');
}

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const baseline = JSON.parse(readFileSync(join(contextsDir, `${contextId}-source-baseline.json`), 'utf8'));
const manifest = JSON.parse(readFileSync(join(contextsDir, `${contextId}-components.json`), 'utf8'));
const { repository, baselineSha, scope, modelId, displayName, architectureOwner } = baseline;
if (![repository, baselineSha, scope, modelId, displayName, architectureOwner].every(Boolean)) {
  throw new Error(`Incomplete baseline for ${contextId}`);
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trimEnd();
git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const files = git(['ls-tree', '-r', '-l', baselineSha, '--', scope])
  .split(/\r?\n/).filter(Boolean).map(parseTreeLine).filter(Boolean)
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
if (!files.length) throw new Error(`No tracked files under ${scope}@${baselineSha}`);

const fileByPath = new Map(files.map((file) => [file.relativePath, file]));
const components = manifest.components.map((component) => {
  const selected = new Map();
  for (const path of component.paths ?? []) {
    const file = fileByPath.get(path);
    if (!file) throw new Error(`${component.id} references missing file ${path}`);
    selected.set(path, file);
  }
  for (const prefix of component.prefixes ?? []) {
    const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
    const matches = files.filter((file) => file.relativePath.startsWith(normalized));
    if (!matches.length) throw new Error(`${component.id} prefix matched no files: ${prefix}`);
    for (const file of matches) selected.set(file.relativePath, file);
  }
  const evidenceFiles = [...selected.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (!evidenceFiles.length) throw new Error(`${component.id} has no evidence files`);
  return { ...component, evidenceFiles };
});

const counts = {
  trackedFiles: files.length,
  sourceFiles: files.filter((f) => f.relativePath.startsWith('src/')).length,
  testFiles: files.filter((f) => /^(test|tests)\//.test(f.relativePath)).length,
  docsFiles: files.filter((f) => f.relativePath.startsWith('docs/')).length,
  packageRootFiles: files.filter((f) => !f.relativePath.includes('/')).length,
  filesWithOwnedConcern: files.filter((f) => Boolean(f.ownedConcern)).length,
  filesWithDecision: files.filter((f) => Boolean(f.decision)).length,
};
const payload = {
  schemaVersion: 1,
  generatedFrom: 'git-tree',
  repository,
  baselineSha,
  scope,
  counts,
  files,
  componentMappings: components.map((component) => ({
    id: component.id,
    title: component.title,
    provenance: 'ARCHITECTURE-DECLARED',
    rationale: component.rationale ?? null,
    fileCount: component.evidenceFiles.length,
    files: component.evidenceFiles.map((file) => file.relativePath),
  })),
};
const canonical = JSON.stringify(payload, null, 2) + '\n';
const inventory = { ...payload, inventorySha256: createHash('sha256').update(canonical).digest('hex') };

mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, `${contextId}-inventory.json`), JSON.stringify(inventory, null, 2) + '\n');
writeFileSync(join(generatedDir, `${contextId}-source.c4`), renderSourceModel(inventory));
console.log(`Generated ${displayName}: ${counts.trackedFiles} tracked, ${counts.sourceFiles} src, ${counts.testFiles} tests, digest ${inventory.inventorySha256}`);

function parseTreeLine(line) {
  const match = line.match(/^(\d+)\s+(\w+)\s+([0-9a-f]+)\s+(-|\d+)\t(.+)$/);
  if (!match) throw new Error(`Cannot parse git ls-tree line: ${line}`);
  const [, mode, type, blobSha, rawSize, path] = match;
  if (type !== 'blob') return null;
  const relativePath = path.startsWith(`${scope}/`) ? path.slice(scope.length + 1) : path;
  return {
    mode, type, blobSha,
    sizeBytes: rawSize === '-' ? null : Number(rawSize),
    path, relativePath,
    githubUrl: `https://github.com/${repository}/blob/${baselineSha}/${urlPath(path)}`,
    ...sourceMetadata(path, relativePath),
  };
}

function sourceMetadata(path, relativePath) {
  if (!/\.(?:[cm]?js|jsx|ts|tsx)$/.test(relativePath)) return {};
  let content;
  try { content = git(['show', `${baselineSha}:${path}`]); } catch { return {}; }
  return {
    ownedConcern: first(content, [/@ownedConcern\s+([^\r\n*]+)/i, /Owned concern:\s*([^\r\n*]+)/i]),
    decision: first(content, [/@decision\s+([^\r\n*]+)/i]),
    consequence: first(content, [/@consequence\s+([^\r\n*]+)/i]),
    baseline: [...content.matchAll(/@baseline\s+([^\r\n*]+)/gi)].map((m) => m[1]?.trim()).filter(Boolean) || undefined,
  };
}
function first(content, regexes) {
  for (const regex of regexes) { const value = content.match(regex)?.[1]?.trim(); if (value) return value; }
  return undefined;
}

function renderSourceModel(data) {
  const root = makeFolder('', '');
  for (const file of data.files) addFile(root, file);
  countFiles(root);
  const fqnByPath = new Map();
  const out = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Source: git tree ${repository}@${baselineSha}:${scope}`,
    'model {',
    `  ${modelId} = inventory '${esc(displayName)} source inventory — generated from Git' {`,
    '    #sourceDerived',
    "    description 'Machine-generated from the exact Git tree. Folder structure is STRUCTURE-DERIVED; file identity is SOURCE-DERIVED.'",
    '    metadata {',
    "      provenance 'SOURCE-DERIVED'",
    `      architectureOwner '${esc(architectureOwner)}'`,
    `      sourceRoot '${esc(scope)}'`,
    `      baselineSha '${baselineSha}'`,
    `      trackedFiles '${data.counts.trackedFiles}'`,
    `      sourceFiles '${data.counts.sourceFiles}'`,
    `      testFiles '${data.counts.testFiles}'`,
    `      inventorySha256 '${data.inventorySha256}'`,
    '    }',
    `    link https://github.com/${repository}/tree/${baselineSha}/${urlPath(scope)} 'Pinned package tree'`,
  ];
  emitNode(root, modelId, '    ', out, fqnByPath);
  out.push('  }', '}', '', 'views {');
  out.push(`  view ${modelId}Inventory of ${modelId} {`);
  out.push(`    title '${esc(displayName)} — Complete source inventory'`);
  out.push(`    description 'Generated from Git at ${baselineSha.slice(0, 8)}. ${data.counts.trackedFiles} tracked files.'`);
  out.push('    include *', '    autoLayout TopBottom', '  }', '');
  emitFolderViews(root, out, fqnByPath);
  for (const component of data.componentMappings) {
    out.push(`  view ${contextId}Files_${safeId(component.id)} {`);
    out.push(`    title 'Files — ${esc(component.title)}'`);
    out.push(`    description 'ARCHITECTURE-DECLARED mapping over SOURCE-DERIVED Git files. ${component.fileCount} evidence file(s).'`);
    for (const path of component.files) {
      const fqn = fqnByPath.get(path);
      if (!fqn) throw new Error(`Missing source element: ${path}`);
      out.push(`    include ${fqn}`);
    }
    out.push('    autoLayout TopBottom', '  }', '');
  }
  out.push('}', '');
  const expected = data.files.length + folderCount(root);
  if (fqnByPath.size !== expected) throw new Error(`Element cardinality mismatch: ${fqnByPath.size} != ${expected}`);
  return out.join('\n');
}

function makeFolder(name, path) { return { name, path, folders: new Map(), files: [], count: 0 }; }
function addFile(root, file) {
  const parts = file.relativePath.split('/'); const filename = parts.pop(); let node = root; let path = '';
  for (const part of parts) { path = path ? `${path}/${part}` : part; if (!node.folders.has(part)) node.folders.set(part, makeFolder(part, path)); node = node.folders.get(part); }
  node.files.push({ ...file, filename });
}
function countFiles(node) { let n = node.files.length; for (const child of node.folders.values()) n += countFiles(child); node.count = n; return n; }
function emitNode(node, parentFqn, indent, out, map) {
  for (const child of [...node.folders.values()].sort((a,b) => a.name.localeCompare(b.name))) {
    const id = elementId('dir', child.path); const fqn = `${parentFqn}.${id}`; register(map, `${child.path}/`, fqn);
    out.push(`${indent}${id} = folder '${esc(child.name)}/ — ${child.count} files' {`, `${indent}  #structureDerived`, `${indent}  description 'Directory observed in the pinned Git tree.'`, `${indent}  metadata {`, `${indent}    provenance 'STRUCTURE-DERIVED'`, `${indent}    sourcePath '${esc(posix.join(scope, child.path))}'`, `${indent}    recursiveFileCount '${child.count}'`, `${indent}    directFileCount '${child.files.length}'`, `${indent}    baselineSha '${baselineSha}'`, `${indent}  }`, `${indent}  link https://github.com/${repository}/tree/${baselineSha}/${urlPath(posix.join(scope, child.path))} 'Pinned directory'`);
    emitNode(child, fqn, `${indent}  `, out, map); emitFiles(child.files, fqn, `${indent}  `, out, map); out.push(`${indent}}`);
  }
  if (!node.path) emitFiles(node.files, parentFqn, indent, out, map);
}
function emitFiles(files, parentFqn, indent, out, map) {
  for (const file of [...files].sort((a,b) => a.filename.localeCompare(b.filename))) {
    const id = elementId('file', file.relativePath); const fqn = `${parentFqn}.${id}`; register(map, file.relativePath, fqn);
    out.push(`${indent}${id} = file '${esc(file.filename)}' {`, `${indent}  #sourceDerived`, `${indent}  description '${esc(file.ownedConcern ?? 'Tracked file from the pinned Git tree.')}'`, `${indent}  metadata {`, `${indent}    provenance 'SOURCE-DERIVED'`, `${indent}    sourcePath '${esc(file.path)}'`, `${indent}    blobSha '${file.blobSha}'`);
    if (file.sizeBytes !== null) out.push(`${indent}    sizeBytes '${file.sizeBytes}'`);
    out.push(`${indent}    baselineSha '${baselineSha}'`); if (file.ownedConcern) out.push(`${indent}    ownedConcern '${esc(file.ownedConcern)}'`); if (file.decision) out.push(`${indent}    decision '${esc(file.decision)}'`); out.push(`${indent}  }`, `${indent}  link ${file.githubUrl} 'Open pinned source'`, `${indent}}`);
  }
}
function emitFolderViews(node, out, map) {
  for (const child of [...node.folders.values()].sort((a,b) => a.name.localeCompare(b.name))) {
    const fqn = map.get(`${child.path}/`); out.push(`  view ${modelId}_${elementId('dir', child.path)} of ${fqn} {`, `    title 'Source — ${esc(child.path)}/ (${child.count} files)'`, "    description 'STRUCTURE-DERIVED directory view; child files are SOURCE-DERIVED from Git.'", '    include *', '    autoLayout TopBottom', '  }', ''); emitFolderViews(child, out, map);
  }
}
function register(map, key, fqn) { if (map.has(key)) throw new Error(`Duplicate generated source element: ${key}`); map.set(key, fqn); }
function folderCount(node) { let n = node.folders.size; for (const child of node.folders.values()) n += folderCount(child); return n; }
function safeId(value) { return value.replace(/[^A-Za-z0-9_-]+/g, '_'); }
function elementId(prefix, value) { const stem = value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^([^A-Za-z_])/, '_$1').slice(-48); return `${prefix}_${stem || 'root'}_${createHash('sha1').update(value).digest('hex').slice(0,8)}`; }
function urlPath(value) { return value.split('/').map(encodeURIComponent).join('/'); }
function esc(value) { return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '); }
