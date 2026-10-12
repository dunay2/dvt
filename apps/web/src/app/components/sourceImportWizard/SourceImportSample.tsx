/**
 * Owned concern: request a bounded source sample only through explicit user intent.
 * @baseline ADR-0058: source discovery and row reads are separate rails.
 * @decision Key the request owner by connection and object, without a shared row cache.
 * @consequence Changing the inspected source cannot display a previous request's result.
 * @version 1.0.0
 */
import { useState } from 'react';
import { SOURCE_DATA_SAMPLE_DEFAULT_LIMIT } from '@dvt/contracts';
import type { SourceDataSample } from '../../ports/workspace';
import { useWarehouseSourceDataSampleQueryPort } from '../../services/AppServicesContext';
import {
  WarehouseSourceDataSampleQueryError,
  type WarehouseSourceDataSampleQueryErrorReason,
} from '../../services/workspace/workspaceErrors';
import { SourceImportSampleTemplate } from './SourceImportSample.templates';

type Props = Readonly<{ connectionId: string; objectId: string; name: string }>;
export type SourceImportSampleState =
  | Readonly<{ status: 'idle' | 'loading' }>
  | Readonly<{ status: 'ready'; sample: SourceDataSample }>
  | Readonly<{ status: 'error'; reason: WarehouseSourceDataSampleQueryErrorReason | 'unknown' }>;

function SourceImportSampleRequest({ connectionId, objectId, name }: Props): JSX.Element {
  const query = useWarehouseSourceDataSampleQueryPort();
  const [state, setState] = useState<SourceImportSampleState>({ status: 'idle' });
  const request = async (): Promise<void> => {
    if (state.status === 'loading') return;
    setState({ status: 'loading' });
    try {
      const sample = await query.previewSourceObjectRows({
        connectionId,
        objectId,
        limit: SOURCE_DATA_SAMPLE_DEFAULT_LIMIT,
      });
      setState({ status: 'ready', sample });
    } catch (error) {
      setState({
        status: 'error',
        reason: error instanceof WarehouseSourceDataSampleQueryError ? error.reason : 'unknown',
      });
    }
  };
  return <SourceImportSampleTemplate state={state} name={name} onRequest={() => void request()} />;
}

export function SourceImportSample(props: Props): JSX.Element | null {
  if (!props.objectId.startsWith('relation/')) return null;
  return (
    <SourceImportSampleRequest
      key={JSON.stringify([props.connectionId, props.objectId])}
      {...props}
    />
  );
}
