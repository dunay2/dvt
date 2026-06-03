import { readFileSync } from 'node:fs';
import path from 'node:path';

export function readArchitectureSiblingSource(
  directoryName: string,
  fileName: string
): string {
  return readFileSync(path.resolve(directoryName, fileName), 'utf8');
}
