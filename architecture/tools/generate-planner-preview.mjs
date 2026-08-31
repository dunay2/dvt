import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

// First generate the machine-readable inventory from the pinned Git tree.
await import('./generate-planner-inventory.mjs');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const architectureDir = dirname(scriptDir);
const baseline = JSON.parse(readFileSync(join(architectureDir, 'planner-source-baseline.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(join(architectureDir, 'generated', 'planner-inventory.json'), 'utf8'));
const output = join(architectureDir, 'generated', 'planner-source.c4');
const { repository, baselineSha, scope, modelId, displayName, architectureOwner } = baseline;

const root = folder('', '');
for (const file of inventory.files) addFile(root, file);
countFiles(root);

const pathToFqn = new Map();
const lines = [
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
  `    link https://github.com/${repository}/tree/${baselineSha}/${urlPath(scope)} 'Pinned package tree'`,
];

emitChildren(root, modelId, '    ');
lines.push('  }', '}', '', 'views {');
lines.push(`  view ${modelId}Inventory of ${modelId} {`);
lines.push(`    title '${esc(displayName)} — Complete source inventory'`);
lines.push(`    description 'Generated from Git at ${baselineSha.slice(0, 8)}. ${inventory.counts.trackedFiles} tracked files; drill into folders to reach every file.'`);
lines.push('    include *', '    autoLayout TopBottom', '  }', '');
emitFolderViews(root);

for (const component of inventory.componentMappings) {
  lines.push(`  view ${componentViewId(component.id)} {`);
  lines.push(`    title 'Files — ${esc(component.title)}'`);
  lines.push(`    description 'ARCHITECTURE-DECLARED mapping over SOURCE-DERIVED Git files. ${component.fileCount} evidence file(s).'`);
  for (const relativePath of component.files) {
    const fqn = pathToFqn.get(relativePath);
    if (!fqn) throw new Error(`No generated LikeC4 element for ${relativePath}`);
    lines.push(`    include ${fqn}`);
  }
  lines.push('    autoLayout TopBottom', '  }', '');
}
lines.push('}', '');

const rendered = lines.join('\n');
if (/^\s*navigateTo\s+/m.test(rendered)) throw new Error('Generated source model contains model-level navigateTo');
writeFileSync(output, rendered);
console.log(`Rendered clean Planner LikeC4 source: ${inventory.counts.trackedFiles} unique files.`);

function folder(name, relativePath) {
  return { name, relativePath, folders: new Map(), files: [], recursiveFileCount: 0 };
}

function addFile(rootFolder, file) {
  const parts = file.relativePath.split('/');
  const filename = parts.pop();
  let current = rootFolder;
  let currentPath = '';
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    if (!current.folders.has(part)) current.folders.set(part, folder(part, currentPath));
    current = current.folders.get(part);
  }
  current.files.push({ ...file, filename });
}

function countFiles(current) {
  let total = current.files.length;
  for (const child of current.folders.values()) total += countFiles(child);
  current.recursiveFileCount = total;
  return total;
}

function emitChildren(current, parentFqn, indent) {
  for (const child of sortedFolders(current)) {
    const id = elementId('dir', child.relativePath);
    const fqn = `${parentFqn}.${id}`;
    pathToFqn.set(`${child.relativePath}/`, fqn);
    lines.push(`${indent}${id} = folder '${esc(child.name)}/ — ${child.recursiveFileCount} files' {`);
    lines.push(`${indent}  #structureDerived`);
    lines.push(`${indent}  description 'Directory observed in the pinned Git tree.'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'STRUCTURE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${esc(posix.join(scope, child.relativePath))}'`);
    lines.push(`${indent}    recursiveFileCount '${child.recursiveFileCount}'`);
    lines.push(`${indent}    directFileCount '${child.files.length}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  link https://github.com/${repository}/tree/${baselineSha}/${urlPath(posix.join(scope, child.relativePath))} 'Pinned directory'`);
    emitChildren(child, fqn, `${indent}  `);
    emitDirectFiles(child.files, fqn, `${indent}  `);
    lines.push(`${indent}}`);
  }
  emitDirectFiles(current.files, parentFqn, indent);
}

function emitDirectFiles(files, parentFqn, indent) {
  for (const file of [...files].sort((a, b) => a.filename.localeCompare(b.filename))) {
    const id = elementId('file', file.relativePath);
    const fqn = `${parentFqn}.${id}`;
    if (pathToFqn.has(file.relativePath)) throw new Error(`Duplicate source element: ${file.relativePath}`);
    pathToFqn.set(file.relativePath, fqn);
    lines.push(`${indent}${id} = file '${esc(file.filename)}' {`);
    lines.push(`${indent}  #sourceDerived`);
    lines.push(`${indent}  description '${esc(file.ownedConcern ?? 'Tracked file from the pinned Git tree.')}'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'SOURCE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${esc(file.path)}'`);
    lines.push(`${indent}    blobSha '${file.blobSha}'`);
    if (file.sizeBytes !== null) lines.push(`${indent}    sizeBytes '${file.sizeBytes}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    if (file.ownedConcern) lines.push(`${indent}    ownedConcern '${esc(file.ownedConcern)}'`);
    if (file.decision) lines.push(`${indent}    decision '${esc(file.decision)}'`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  link ${file.githubUrl} 'Open pinned source'`);
    lines.push(`${indent}}`);
  }
}

function emitFolderViews(current) {
  for (const child of sortedFolders(current)) {
    const fqn = pathToFqn.get(`${child.relativePath}/`);
    if (!fqn) throw new Error(`No generated folder element for ${child.relativePath}`);
    lines.push(`  view ${folderViewId(child.relativePath)} of ${fqn} {`);
    lines.push(`    title 'Source — ${esc(child.relativePath)}/ (${child.recursiveFileCount} files)'`);
    lines.push("    description 'STRUCTURE-DERIVED directory view; child files are SOURCE-DERIVED from Git.'");
    lines.push('    include *', '    autoLayout TopBottom', '  }', '');
    emitFolderViews(child);
  }
}

function sortedFolders(current) {
  return [...current.folders.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function elementId(prefix, value) {
  const stem = value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^([^A-Za-z_])/, '_$1').slice(-48);
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 8);
  return `${prefix}_${stem || 'root'}_${hash}`;
}

function folderViewId(relativePath) {
  return `${modelId}_${elementId('dir', relativePath)}`;
}

function componentViewId(id) {
  return `plannerFiles_${id.replace(/[^A-Za-z0-9_-]+/g, '_')}`;
}

function urlPath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
