/** Owned concern: run Snowflake grammar analysis away from the editor thread. */
import { validateSnowflakeTaskSql } from './operationSqlSyntax';

self.onmessage = ({ data }: MessageEvent<string>) => {
  self.postMessage(validateSnowflakeTaskSql(data));
};
