import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseGenericGraphSourceV1,
  parsePlannerInputEnvelopeV1,
} from '../../src/validation.js';

export function registerValidationPlannerGraphSuite(): void {
  describe('planner graph and input envelopes', () => {
    it('parses GenericGraphSourceV1 with step-oriented nodes', () => {
      const source = parseGenericGraphSourceV1({
        kind: 'generic-graph-v1',
        sourceFamily: 'integration-suite',
        sourceVersion: '1.0',
        nodes: [
          {
            nodeId: 'extract.iot-readings',
            stepKind: 'API_CALL',
            dependsOn: [],
            stepTypeConfig: {
              operationRef: 'artifacts://operations/iot-readings.json',
            },
          },
        ],
      });

      expect(source.kind).toBe('generic-graph-v1');
      expect(source.nodes[0]?.stepKind).toBe('API_CALL');
    });

    it('rejects GenericGraphSourceV1 when stepKind is missing', () => {
      expect(() =>
        parseGenericGraphSourceV1({
          kind: 'generic-graph-v1',
          sourceFamily: 'integration-suite',
          sourceVersion: '1.0',
          nodes: [
            {
              nodeId: 'extract.iot-readings',
              dependsOn: [],
            },
          ],
        })
      ).toThrow(ContractValidationError);
    });

    it('throws ContractValidationError when planner input has no active source', () => {
      expect(() =>
        parsePlannerInputEnvelopeV1({
          selection: {
            selectedNodeIds: ['model.analytics.orders'],
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('throws ContractValidationError when planner input uses legacy manifestRef source', () => {
      expect(() =>
        parsePlannerInputEnvelopeV1({
          manifestRef: {
            uri: 's3://bucket/manifest.json',
            sha256: 'a'.repeat(64),
          },
          selection: {
            selectedNodeIds: ['model.analytics.orders'],
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects GenericGraphSourceV1 when nodes is empty', () => {
      expect(() =>
        parseGenericGraphSourceV1({
          kind: 'generic-graph-v1',
          sourceFamily: 'integration-suite',
          sourceVersion: '1.0',
          nodes: [],
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects planner input with legacy manifest inline payload', () => {
      expect(() =>
        parsePlannerInputEnvelopeV1({
          manifest: { nodes: {} },
          selection: {
            selectedNodeIds: ['model.analytics.orders'],
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects planner input with legacy nodes payload', () => {
      expect(() =>
        parsePlannerInputEnvelopeV1({
          nodes: [],
          selection: {
            selectedNodeIds: ['model.analytics.orders'],
          },
        })
      ).toThrow(ContractValidationError);
    });
  });
}
