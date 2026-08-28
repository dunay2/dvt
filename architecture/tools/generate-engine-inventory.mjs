import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const architectureDir = dirname(scriptDir);
const baselinePath = join(architectureDir, 'source-baseline.json');
const componentManifestPath = join(architectureDir, 'engine-components.json');
const generatedDir = join(architectureDir, 'generated');

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const componentManifest = JSON.parse(readFileSync(componentManifestPath, 'utf8'));
const { repository, baselineSha, scope } = baseline;

if (!repository || !baselineSha || !scope) {
  throw new Error('source-baseline.json requires repository, baselineSha and scope');
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  }).trimEnd();
}

try {
  git(['cat-file', '-e', `${baselineSha}^{commit}`]);
} catch {
  throw new Error(`Baseline commit ${baselineSha} is not available. Fetch it before generation.`);
}

const treeText = git(['ls-tree', '-r', '-l', baselineSha, '--', scope]);
const files = treeText
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const match = line.match(/^(\d+)\s+(\w+)\s+([0-9a-f]+)\s+(-|\d+)\t(.+)$/);
    if (!match) throw new Error(`Cannot parse git ls-tree line: ${line}`);
    const [, mode, type, blobSha, rawSize, path] = match;
    if (type !== 'blob') return null;
    const relativePath = path.startsWith(`${scope}/`) ? path.slice(scope.length + 1) : path;
    const sizeBytes = rawSize === '-' ? null : Number(rawSize);
    const githubUrl = `https://github.com/${repository}/blob/${baselineSha}/${encodeGitHubPath(path)}`;
    const sourceMetadata = parseSourceMetadata(path, relativePath);
    return {
      mode,
      type,
      blobSha,
      sizeBytes,
      path,
      relativePath,
      githubUrl,
      ...sourceMetadata,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

if (files.length === 0) throw new Error(`No tracked files found under ${scope} at ${baselineSha}`);

const fileByRelativePath = new Map(files.map((file) => [file.relativePath, file]));
const root = makeFolder('', scope);
for (const file of files) addFile(root, file);
computeCounts(root);

const mappedComponents = componentManifest.components.map((component) => {
  const selected = new Map();
  for (const exactPath of component.paths ?? []) {
    const file = fileByRelativePath.get(exactPath);
    if (!file) throw new Error(`Component ${component.id} references missing file: ${exactPath}`);
    selected.set(file.relativePath, file);
  }
  for (const prefix of component.prefixes ?? []) {
    const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    const matches = files.filter((file) => file.relativePath.startsWith(normalizedPrefix));
    if (matches.length === 0) throw new Error(`Component ${component.id} prefix matched no files: ${prefix}`);
    for (const file of matches) selected.set(file.relativePath, file);
  }
  const evidenceFiles = [...selected.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (evidenceFiles.length === 0) throw new Error(`Component ${component.id} has no evidence files`);
  return { ...component, evidenceFiles };
});

const counts = {
  trackedFiles: files.length,
  sourceFiles: files.filter((f) => f.relativePath.startsWith('src/')).length,
  testFiles: files.filter((f) => f.relativePath.startsWith('test/')).length,
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
  componentMappings: mappedComponents.map((component) => ({
    id: component.id,
    fqn: component.fqn,
    title: component.title,
    provenance: 'ARCHITECTURE-DECLARED',
    rationale: component.rationale ?? null,
    fileCount: component.evidenceFiles.length,
    files: component.evidenceFiles.map((file) => file.relativePath),
  })),
};
const payloadJson = JSON.stringify(payload, null, 2) + '\n';
const inventorySha256 = createHash('sha256').update(payloadJson).digest('hex');
const inventory = { ...payload, inventorySha256 };

mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, 'engine-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
writeFileSync(join(generatedDir, 'engine-source.c4'), generateLikeC4(root, mappedComponents, inventory));

console.log(
  `Generated Engine inventory: ${counts.trackedFiles} tracked files, ${counts.sourceFiles} src, ${counts.testFiles} tests, digest ${inventorySha256}`
);

function parseSourceMetadata(path, relativePath) {
  if (!/\.(?:[cm]?js|jsx|ts|tsx)$/.test(relativePath)) return {};
  let content;
  try {
    content = git(['show', `${baselineSha}:${path}`]);
  } catch {
    return {};
  }
  return {
    ownedConcern: tagLine(content, 'ownedConcern'),
    baseline: tagLines(content, 'baseline'),
    decision: tagLine(content, 'decision'),
    consequence: tagLine(content, 'consequence'),
  };
}

function tagLine(content, tag) {
  const match = content.match(new RegExp(`@${tag}\\s+([^\\r\\n*]+)`));
  return match?.[1]?.trim() || undefined;
}

function tagLines(content, tag) {
  const regex = new RegExp(`@${tag}\\s+([^\\r\\n*]+)`, 'g');
  const result = [];
  for (const match of content.matchAll(regex)) {
    const value = match[1]?.trim();
    if (value) result.push(value);
  }
  return result.length ? result : undefined;
}

function encodeGitHubPath(path) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function makeFolder(name, relativePath) {
  return { type: 'folder', name, relativePath, folders: new Map(), files: [], recursiveFileCount: 0 };
}

function addFile(rootFolder, file) {
  const segments = file.relativePath.split('/');
  const filename = segments.pop();
  let cursor = rootFolder;
  let currentPath = '';
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    if (!cursor.folders.has(segment)) cursor.folders.set(segment, makeFolder(segment, currentPath));
    cursor = cursor.folders.get(segment);
  }
  cursor.files.push({ ...file, filename });
}

function computeCounts(folder) {
  let count = folder.files.length;
  for (const child of folder.folders.values()) count += computeCounts(child);
  folder.recursiveFileCount = count;
  return count;
}

function generateLikeC4(rootFolder, mappedComponents, inventoryData) {
  const pathToFqn = new Map();
  const lines = [];
  lines.push('// GENERATED FILE. DO NOT EDIT.');
  lines.push(`// Source: git tree ${repository}@${baselineSha}:${scope}`);
  lines.push('model {');
  lines.push('  extend dvt.engine {');
  lines.push("    sourceInventory = component 'Source inventory — generated from Git' {");
  lines.push('      #sourceDerived');
  lines.push("      description 'Machine-generated from the exact Git tree. Folder structure is STRUCTURE-DERIVED; file identity is SOURCE-DERIVED.'");
  lines.push('      metadata {');
  lines.push("        provenance 'SOURCE-DERIVED'");
  lines.push(`        sourceRoot '${escapeDsl(scope)}'`);
  lines.push(`        baselineSha '${baselineSha}'`);
  lines.push(`        trackedFiles '${inventoryData.counts.trackedFiles}'`);
  lines.push(`        sourceFiles '${inventoryData.counts.sourceFiles}'`);
  lines.push(`        testFiles '${inventoryData.counts.testFiles}'`);
  lines.push(`        inventorySha256 '${inventoryData.inventorySha256}'`);
  lines.push('      }');
  lines.push(`      link https://github.com/${repository}/tree/${baselineSha}/${encodeGitHubPath(scope)} 'Pinned package tree'`);
  lines.push('      navigateTo engineSourceInventory');

  emitFolderChildren(rootFolder, 'dvt.engine.sourceInventory', '      ', lines, pathToFqn);
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('views {');
  lines.push('  view engineSourceInventory of dvt.engine.sourceInventory {');
  lines.push("    title 'Engine — Complete source inventory'");
  lines.push(`    description 'Generated from Git at ${baselineSha.slice(0, 8)}. ${inventoryData.counts.trackedFiles} tracked files; drill into folders to reach every file.'`);
  lines.push('    include *');
  lines.push('    autoLayout TopBottom');
  lines.push('  }');
  lines.push('');

  emitFolderViews(rootFolder, 'dvt.engine.sourceInventory', lines, pathToFqn);

  for (const component of mappedComponents) {
    const viewId = componentViewId(component.id);
    lines.push(`  view ${viewId} {`);
    lines.push(`    title 'Files — ${escapeDsl(component.title)}'`);
    lines.push(`    description 'ARCHITECTURE-DECLARED mapping over SOURCE-DERIVED Git files. ${component.evidenceFiles.length} evidence file(s).'`);
    for (const file of component.evidenceFiles) {
      const fqn = pathToFqn.get(file.relativePath);
      if (!fqn) throw new Error(`No LikeC4 element for component file ${file.relativePath}`);
      lines.push(`    include ${fqn}`);
    }
    lines.push('    autoLayout TopBottom');
    lines.push('  }');
    lines.push('');
  }
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

function emitFolderChildren(folder, parentFqn, indent, lines, pathToFqn) {
  const sortedFolders = [...folder.folders.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const child of sortedFolders) {
    const id = elementId('dir', child.relativePath);
    const fqn = `${parentFqn}.${id}`;
    pathToFqn.set(`${child.relativePath}/`, fqn);
    lines.push(`${indent}${id} = folder '${escapeDsl(child.name)}/ — ${child.recursiveFileCount} files' {`);
    lines.push(`${indent}  #structureDerived`);
    lines.push(`${indent}  description 'Directory observed in the pinned Git tree.'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'STRUCTURE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${escapeDsl(posix.join(scope, child.relativePath))}'`);
    lines.push(`${indent}    recursiveFileCount '${child.recursiveFileCount}'`);
    lines.push(`${indent}    directFileCount '${child.files.length}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  link https://github.com/${repository}/tree/${baselineSha}/${encodeGitHubPath(posix.join(scope, child.relativePath))} 'Pinned directory'`);
    lines.push(`${indent}  navigateTo ${folderViewId(child.relativePath)}`);
    emitFolderChildren(child, fqn, `${indent}  `, lines, pathToFqn);
    emitFiles(child.files, fqn, `${indent}  `, lines, pathToFqn);
    lines.push(`${indent}}`);
  }
  emitFiles(folder.files, parentFqn, indent, lines, pathToFqn);
}

function emitFiles(filesInFolder, parentFqn, indent, lines, pathToFqn) {
  for (const file of [...filesInFolder].sort((a, b) => a.filename.localeCompare(b.filename))) {
    const id = elementId('file', file.relativePath);
    const fqn = `${parentFqn}.${id}`;
    pathToFqn.set(file.relativePath, fqn);
    lines.push(`${indent}${id} = file '${escapeDsl(file.filename)}' {`);
    lines.push(`${indent}  #sourceDerived`);
    lines.push(`${indent}  description '${escapeDsl(file.ownedConcern ?? 'Tracked file from the pinned Git tree.')}'`);
    lines.push(`${indent}  metadata {`);
    lines.push(`${indent}    provenance 'SOURCE-DERIVED'`);
    lines.push(`${indent}    sourcePath '${escapeDsl(file.path)}'`);
    lines.push(`${indent}    blobSha '${file.blobSha}'`);
    if (file.sizeBytes !== null) lines.push(`${indent}    sizeBytes '${file.sizeBytes}'`);
    lines.push(`${indent}    baselineSha '${baselineSha}'`);
    if (file.ownedConcern) lines.push(`${indent}    ownedConcern '${escapeDsl(file.ownedConcern)}'`);
    if (file.decision) lines.push(`${indent}    decision '${escapeDsl(file.decision)}'`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  link ${file.githubUrl} 'Open pinned source'`);
    lines.push(`${indent}}`);
  }
}

function emitFolderViews(folder, parentFqn, lines, pathToFqn) {
  for (const child of [...folder.folders.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const fqn = pathToFqn.get(`${child.relativePath}/`);
    lines.push(`  view ${folderViewId(child.relativePath)} of ${fqn} {`);
    lines.push(`    title 'Source — ${escapeDsl(child.relativePath)}/ (${child.recursiveFileCount} files)'`);
    lines.push("    description 'STRUCTURE-DERIVED directory view; child files are SOURCE-DERIVED from Git.'");
    lines.push('    include *');
    lines.push('    autoLayout TopBottom');
    lines.push('  }');
    lines.push('');
    emitFolderViews(child, fqn, lines, pathToFqn);
  }
}

function elementId(prefix, value) {
  const stem = value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^([^A-Za-z_])/, '_$1').slice(-48);
  const hash = createHash('sha1').update(value).digest('hex').slice(0, 8);
  return `${prefix}_${stem || 'root'}_${hash}`;
}

function folderViewId(relativePath) {
  return `engineSource_${elementId('dir', relativePath)}`;
}

function componentViewId(id) {
  return `engineFiles_${id.replace(/[^A-Za-z0-9_-]+/g, '_')}`;
}

function escapeDsl(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
