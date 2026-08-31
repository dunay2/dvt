import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./generate-planner-inventory.mjs');

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const baseline = JSON.parse(readFileSync(join(architectureDir, 'planner-source-baseline.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(join(architectureDir, 'generated', 'planner-inventory.json'), 'utf8'));
const { repository, baselineSha, scope, modelId, displayName, architectureOwner } = baseline;
const root = { name: '', path: '', folders: new Map(), files: [], count: 0 };

for (const file of inventory.files) {
  const parts = file.relativePath.split('/');
  const filename = parts.pop();
  let node = root;
  let path = '';
  for (const part of parts) {
    path = path ? `${path}/${part}` : part;
    if (!node.folders.has(part)) node.folders.set(part, { name: part, path, folders: new Map(), files: [], count: 0 });
    node = node.folders.get(part);
  }
  node.files.push({ ...file, filename });
}

const count = (node) => {
  let n = node.files.length;
  for (const child of node.folders.values()) n += count(child);
  node.count = n;
  return n;
};
count(root);

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
  `      trackedFiles '${inventory.counts.trackedFiles}'`,
  `      sourceFiles '${inventory.counts.sourceFiles}'`,
  `      testFiles '${inventory.counts.testFiles}'`,
  `      inventorySha256 '${inventory.inventorySha256}'`,
  '    }',
  `    link https://github.com/${repository}/tree/${baselineSha}/${url(scope)} 'Pinned package tree'`,
];

emitNode(root, modelId, '    ');
out.push('  }', '}', '', 'views {');
out.push(`  view ${modelId}Inventory of ${modelId} {`);
out.push(`    title '${esc(displayName)} — Complete source inventory'`);
out.push(`    description 'Generated from Git at ${baselineSha.slice(0, 8)}. ${inventory.counts.trackedFiles} tracked files; drill into folders to reach every file.'`);
out.push('    include *', '    autoLayout TopBottom', '  }', '');
emitViews(root);

for (const component of inventory.componentMappings) {
  out.push(`  view ${componentView(component.id)} {`);
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

if (fqnByPath.size !== inventory.files.length + folderCount(root)) {
  throw new Error(`Generated element cardinality mismatch: map=${fqnByPath.size}, files=${inventory.files.length}, folders=${folderCount(root)}`);
}

writeFileSync(join(architectureDir, 'generated', 'planner-source.c4'), out.join('\n'));
console.log(`Rendered Planner source model: ${inventory.files.length} unique files, ${folderCount(root)} folders.`);

function emitNode(node, parentFqn, indent) {
  for (const child of [...node.folders.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const id = elementId('dir', child.path);
    const fqn = `${parentFqn}.${id}`;
    register(`${child.path}/`, fqn);
    out.push(`${indent}${id} = folder '${esc(child.name)}/ — ${child.count} files' {`);
    out.push(`${indent}  #structureDerived`);
    out.push(`${indent}  description 'Directory observed in the pinned Git tree.'`);
    out.push(`${indent}  metadata {`);
    out.push(`${indent}    provenance 'STRUCTURE-DERIVED'`);
    out.push(`${indent}    sourcePath '${esc(posix.join(scope, child.path))}'`);
    out.push(`${indent}    recursiveFileCount '${child.count}'`);
    out.push(`${indent}    directFileCount '${child.files.length}'`);
    out.push(`${indent}    baselineSha '${baselineSha}'`);
    out.push(`${indent}  }`);
    out.push(`${indent}  link https://github.com/${repository}/tree/${baselineSha}/${url(posix.join(scope, child.path))} 'Pinned directory'`);
    emitNode(child, fqn, `${indent}  `);
    emitFiles(child.files, fqn, `${indent}  `);
    out.push(`${indent}}`);
  }
  if (node === root) emitFiles(node.files, parentFqn, indent);
}

function emitFiles(files, parentFqn, indent) {
  for (const file of [...files].sort((a, b) => a.filename.localeCompare(b.filename))) {
    const id = elementId('file', file.relativePath);
    const fqn = `${parentFqn}.${id}`;
    register(file.relativePath, fqn);
    out.push(`${indent}${id} = file '${esc(file.filename)}' {`);
    out.push(`${indent}  #sourceDerived`);
    out.push(`${indent}  description '${esc(file.ownedConcern ?? 'Tracked file from the pinned Git tree.')}'`);
    out.push(`${indent}  metadata {`);
    out.push(`${indent}    provenance 'SOURCE-DERIVED'`);
    out.push(`${indent}    sourcePath '${esc(file.path)}'`);
    out.push(`${indent}    blobSha '${file.blobSha}'`);
    if (file.sizeBytes !== null) out.push(`${indent}    sizeBytes '${file.sizeBytes}'`);
    out.push(`${indent}    baselineSha '${baselineSha}'`);
    if (file.ownedConcern) out.push(`${indent}    ownedConcern '${esc(file.ownedConcern)}'`);
    if (file.decision) out.push(`${indent}    decision '${esc(file.decision)}'`);
    out.push(`${indent}  }`);
    out.push(`${indent}  link ${file.githubUrl} 'Open pinned source'`);
    out.push(`${indent}}`);
  }
}

function emitViews(node) {
  for (const child of [...node.folders.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const fqn = fqnByPath.get(`${child.path}/`);
    out.push(`  view ${folderView(child.path)} of ${fqn} {`);
    out.push(`    title 'Source — ${esc(child.path)}/ (${child.count} files)'`);
    out.push("    description 'STRUCTURE-DERIVED directory view; child files are SOURCE-DERIVED from Git.'");
    out.push('    include *', '    autoLayout TopBottom', '  }', '');
    emitViews(child);
  }
}

function register(key, fqn) {
  if (fqnByPath.has(key)) throw new Error(`Duplicate generated source element: ${key}`);
  fqnByPath.set(key, fqn);
}

function folderCount(node) {
  let n = node.folders.size;
  for (const child of node.folders.values()) n += folderCount(child);
  return n;
}

function elementId(prefix, value) {
  const stem = value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^([^A-Za-z_])/, '_$1').slice(-48);
  return `${prefix}_${stem || 'root'}_${createHash('sha1').update(value).digest('hex').slice(0, 8)}`;
}
function folderView(value) { return `${modelId}_${elementId('dir', value)}`; }
function componentView(value) { return `plannerFiles_${value.replace(/[^A-Za-z0-9_-]+/g, '_')}`; }
function url(value) { return value.split('/').map(encodeURIComponent).join('/'); }
function esc(value) { return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '); }
