/**
 * Owned concern: prepare a verified immutable CI image, never database state.
 * @baseline Workflow dependency pins and GitHub branch-scoped image caches.
 * @decision Separate cache identity from Docker effects; only a miss may pull.
 * @consequence Warm runners need no registry; invalid cache contents fail closed.
 * @version 1.0.0
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const catalog = JSON.parse(
  readFileSync(new URL('./container-images.json', import.meta.url), 'utf8')
);
export const IMAGE_CACHE_ERROR = Object.freeze({
  unknownImage: 'CI_IMAGE_UNKNOWN',
  invalidPin: 'CI_IMAGE_PIN_INVALID',
  identityMismatch: 'CI_IMAGE_IDENTITY_MISMATCH',
  invalidCommand: 'CI_IMAGE_COMMAND_INVALID',
});

export class ImageCacheError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'ImageCacheError';
    this.code = code;
  }
}

export function resolveImageCache(name, directory) {
  const image = Object.hasOwn(catalog, name) ? catalog[name] : undefined;
  if (!image) throw new ImageCacheError(IMAGE_CACHE_ERROR.unknownImage, name);
  if (
    !/^postgres:\d+\.\d+@sha256:[a-f0-9]{64}$/.test(image.reference) ||
    !/^sha256:[a-f0-9]{64}$/.test(image.configDigest) ||
    image.platform !== 'linux/amd64'
  ) {
    throw new ImageCacheError(IMAGE_CACHE_ERROR.invalidPin, name);
  }
  const digest = image.reference.split('@sha256:')[1];
  const key = `ci-image-linux-amd64-${digest}`;
  return {
    ...image,
    key,
    archive: path.join(directory, `${key}.tar`),
    localReference: `dvt-ci/${name}:${digest}`,
  };
}

function dockerCommand(args) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

export function prepareCachedImage(image, cacheHit, docker = dockerCommand) {
  if (cacheHit) {
    docker(['load', '--input', image.archive]);
  } else {
    docker(['pull', '--platform', image.platform, image.reference]);
    docker(['tag', image.reference, image.localReference]);
  }
  const [actual] = JSON.parse(docker(['image', 'inspect', image.localReference]));
  // Classic Docker identifies configs; containerd identifies manifests.
  const identities = [image.configDigest, image.reference.split('@')[1]];
  if (
    !identities.includes(actual?.Id) ||
    `${actual?.Os}/${actual?.Architecture}` !== image.platform
  ) {
    throw new ImageCacheError(IMAGE_CACHE_ERROR.identityMismatch, image.localReference);
  }
  if (!cacheHit) docker(['save', '--output', image.archive, image.localReference]);
}

export function runImageCacheCli([command, name], env = process.env) {
  if (!['resolve', 'prepare'].includes(command) || !env.RUNNER_TEMP) {
    throw new ImageCacheError(
      IMAGE_CACHE_ERROR.invalidCommand,
      'Use resolve|prepare <catalog name> with RUNNER_TEMP'
    );
  }
  const directory = path.join(env.RUNNER_TEMP, 'dvt-ci-images');
  const image = resolveImageCache(name, directory);
  mkdirSync(directory, { recursive: true });
  if (command === 'resolve') {
    const outputs = { key: image.key, archive: image.archive, image: image.localReference };
    appendFileSync(
      env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([key, value]) => `${key}=${value}\n`)
        .join('')
    );
    return;
  }
  prepareCachedImage(image, env.CACHE_HIT === 'true');
  console.log(
    `[ci-image] ${env.CACHE_HIT === 'true' ? 'restored' : 'pulled once and saved'} ${image.reference}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runImageCacheCli(process.argv.slice(2));
}
