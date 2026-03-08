export interface LogFields {
  readonly [key: string]: string | number | boolean | null | undefined;
}

export interface ILogger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export class NoopLogger implements ILogger {
  debug(_message: string, _fields?: LogFields): void {
    return;
  }
  info(_message: string, _fields?: LogFields): void {
    return;
  }
  warn(_message: string, _fields?: LogFields): void {
    return;
  }
  error(_message: string, _fields?: LogFields): void {
    return;
  }
}
