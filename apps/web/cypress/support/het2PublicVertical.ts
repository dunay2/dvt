/** Owned concern: author and inspect the public HET2 acquisition-to-loader handoff. */
import { canvasViewCopy } from '../../src/app/views/canvas/copy';

import {
  applyNodeWorkbench,
  closeNodeWorkbench,
  configureObjectFileLoad,
  openNodeWorkbench,
  type Het1ObjectFileManifest,
} from './het1PublicVertical';

export type Het2HttpJsonManifest = Readonly<{
  bucket: string;
  objectKey: string;
  storageUri: string;
  sha256: string;
  sizeBytes: number;
  endpointRef: string;
  authCredentialRef: string;
  artifactCredentialRef: string;
  targetCredentialRef: string;
}>;

function replaceInput(selector: string, value: string): void {
  cy.get(selector).should('be.visible').and('be.enabled').clear().type(value, {
    parseSpecialCharSequences: false,
    delay: 0,
  });
}

export function configureHttpJsonAcquisition(args: {
  nodeId: string;
  manifest: Het2HttpJsonManifest;
}): void {
  const field = (suffix: string): string => `[id="${args.nodeId}-http-json-${suffix}"]`;
  replaceInput(field('endpoint-ref'), args.manifest.endpointRef);
  replaceInput(field('auth-ref'), args.manifest.authCredentialRef);
  replaceInput(field('sha256'), args.manifest.sha256);
  replaceInput(field('size'), String(args.manifest.sizeBytes));
  replaceInput(field('max-size'), String(args.manifest.sizeBytes));
  replaceInput(field('storage-uri'), args.manifest.storageUri);
  replaceInput(field('artifact-credential'), args.manifest.artifactCredentialRef);
  replaceInput(field('connect-timeout'), '2000');
  replaceInput(field('request-timeout'), '20000');
  replaceInput(field('redirects'), '0');
  applyNodeWorkbench();
}

export function updateHttpJsonEndpointRef(args: {
  nodeId: string;
  nodeName: string;
  endpointRef: string;
}): void {
  openNodeWorkbench(args.nodeName);
  replaceInput(`[id="${args.nodeId}-http-json-endpoint-ref"]`, args.endpointRef);
  applyNodeWorkbench();
  closeNodeWorkbench();
}

export function configureJsonlObjectFileLoad(args: {
  nodeId: string;
  manifest: Het2HttpJsonManifest;
  targetRelation: string;
}): void {
  const compatibleManifest: Het1ObjectFileManifest = {
    ...args.manifest,
    sourceCredentialRef: args.manifest.artifactCredentialRef,
    integrityMismatchObject: {
      objectKey: `tenants/tenant/${'0'.repeat(64)}`,
      storageUri: `s3://${args.manifest.bucket}/tenants/tenant/${'0'.repeat(64)}`,
      sha256: '0'.repeat(64),
    },
  };
  configureObjectFileLoad({
    nodeId: args.nodeId,
    manifest: compatibleManifest,
    targetRelation: args.targetRelation,
  });
  cy.get('[data-slot="object-file-postgres-authoring"]')
    .find('[role="combobox"]')
    .first()
    .should('be.enabled')
    .click();
  cy.contains('[role="option"]', canvasViewCopy.inspectorObjectFileJsonLinesLabel)
    .should('be.visible')
    .click();
  applyNodeWorkbench();
}

export function asHet1CompatibleManifest(manifest: Het2HttpJsonManifest): Het1ObjectFileManifest {
  return {
    ...manifest,
    sourceCredentialRef: manifest.artifactCredentialRef,
    integrityMismatchObject: {
      objectKey: `tenants/tenant/${'0'.repeat(64)}`,
      storageUri: `s3://${manifest.bucket}/tenants/tenant/${'0'.repeat(64)}`,
      sha256: '0'.repeat(64),
    },
  };
}
