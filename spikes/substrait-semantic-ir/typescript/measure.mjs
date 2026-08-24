import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve('generated');
const output = process.env.DVT_TS_BINDING_REPORT || 'typescript-binding-report.json';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

const files = await walk(root);
let bytes = 0;
let lines = 0;
const byFile = [];
for (const file of files) {
  const info = await stat(file);
  const text = await readFile(file, 'utf8');
  const lineCount = text.split(/\r?\n/u).length;
  bytes += info.size;
  lines += lineCount;
  byFile.push({ path: relative(root, file), bytes: info.size, lines: lineCount });
}

const report = {
  sourceSpecTag: 'v0.99.0',
  generator: '@bufbuild/protoc-gen-es@2.14.0',
  runtime: '@bufbuild/protobuf@2.14.0',
  fileCount: files.length,
  generatedBytes: bytes,
  generatedLines: lines,
  generatedFiles: byFile.sort((a, b) => a.path.localeCompare(b.path)),
};

await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report));
