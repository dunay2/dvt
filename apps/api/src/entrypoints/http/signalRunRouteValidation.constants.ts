import type { SupportedSignalType } from '../../application/ports/runtime.js';
import {
  RUN_COMMAND_PARSE_ERROR_CODE,
  RUN_COMMAND_PARSE_ERROR_RESPONSE,
  type RunCommandParseErrorCode,
} from './runCommandRoute.constants.js';

export const SIGNAL_RUN_PARSE_ERROR_CODE = RUN_COMMAND_PARSE_ERROR_CODE;

export type SignalRunParseErrorCode = RunCommandParseErrorCode;

export const SIGNAL_RUN_PARSE_ERROR_RESPONSE = RUN_COMMAND_PARSE_ERROR_RESPONSE;

export const SUPPORTED_SIGNAL_TYPES: ReadonlySet<SupportedSignalType> = new Set([
  'PAUSE',
  'RESUME',
  'CANCEL',
]);
