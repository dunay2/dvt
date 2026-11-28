/** @ownedConcern Detect canonical contract ownership in adapter source. */
import { listFilesRecursive, normalizePath } from './source-files.mjs';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const ADAPTER_CANONICAL_CONTRACT_RULE_NAME = 'no-adapters-own-canonical-contracts';

export const ADAPTER_SOURCE_FILE_PATTERN = /\.(?:cjs|js|mjs|ts|tsx)$/;

export const VERSIONED_CANONICAL_CONTRACT_FILE_PATTERN =
  /^packages\/@dvt\/adapter-[^/]+\/src\/.*\.v\d+\.(?:cjs|js|mjs|ts|tsx)$/;

export const ADAPTER_CONTRACT_FOLDER_PATTERN =
  /^packages\/@dvt\/adapter-[^/]+\/src\/contracts(?:\/|$)/;

export const VERSIONED_CANONICAL_EXPORT_PATTERN =
  /^\s*export\s+(?:interface|type|const|class|enum)\s+\w+(?:Contract|Schema|Dto|DTO|Envelope)V\d+\b/m;

export function getAdapterCanonicalContractReason(relativePath, contents) {
  if (ADAPTER_CONTRACT_FOLDER_PATTERN.test(relativePath)) {
    return 'adapter source owns a contracts folder';
  }

  if (VERSIONED_CANONICAL_CONTRACT_FILE_PATTERN.test(relativePath)) {
    return 'adapter source owns a versioned canonical contract file';
  }

  if (VERSIONED_CANONICAL_EXPORT_PATTERN.test(contents)) {
    return 'adapter source exports a versioned canonical contract symbol';
  }

  return null;
}

export function collectAdapterCanonicalContractFindings(baseDir = process.cwd()) {
  const adapterRoot = join(baseDir, 'packages', '@dvt');

  return listFilesRecursive(adapterRoot)
    .map((absolutePath) => ({
      absolutePath,
      relativePath: normalizePath(relative(baseDir, absolutePath)),
    }))
    .filter(({ relativePath }) => /^packages\/@dvt\/adapter-[^/]+\/src\//.test(relativePath))
    .filter(({ relativePath }) => ADAPTER_SOURCE_FILE_PATTERN.test(relativePath))
    .flatMap(({ absolutePath, relativePath }) => {
      const reason = getAdapterCanonicalContractReason(
        relativePath,
        readFileSync(absolutePath, 'utf8')
      );

      return reason === null
        ? []
        : [
            {
              ruleName: ADAPTER_CANONICAL_CONTRACT_RULE_NAME,
              filePath: relativePath,
              reason,
            },
          ];
    });
}

export function formatAdapterCanonicalContractFindings(findings) {
  return findings.map((finding) => `${finding.ruleName}: ${finding.filePath} (${finding.reason})`);
}
