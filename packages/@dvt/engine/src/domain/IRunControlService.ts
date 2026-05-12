import type { IRunCommandService } from './IRunCommandService.js';
import type { IRunSignalService } from './IRunSignalService.js';

export interface IRunControlService extends IRunCommandService, IRunSignalService {}
