/**
 * @ownedConcern Stable feature-mechanization manifest parsing.
 *
 * Exposes parser functions used by CLI validation and architecture guards
 * without coupling callers to the CLI command implementation.
 */
const yaml = require('js-yaml');

const manifestFencePattern = /```feature-mechanization\s*\r?\n([\s\S]*?)\r?\n```/g;

function extractFeatureMechanizationManifests(markdown, sourcePath) {
  const manifests = [];
  let match;
  const pattern = new RegExp(manifestFencePattern);

  while ((match = pattern.exec(markdown)) !== null) {
    const raw = match[1];
    try {
      manifests.push({
        sourcePath,
        manifest: yaml.load(raw),
      });
    } catch (error) {
      manifests.push({
        sourcePath,
        manifest: null,
        parseError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return manifests;
}

module.exports = {
  extractFeatureMechanizationManifests,
};
