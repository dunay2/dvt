/** Prove a project variation round-trips as plain Git source without trusting arbitrary file metadata. */
import { describe, expect, it } from 'vitest';
import {
  decodeProjectTemplate,
  encodeProjectTemplate,
  projectTemplatePath,
} from './projectTemplateFile';

const template = {
  version: 1,
  baseTemplateId: 'snowflake-task',
  name: 'Daily orders',
  source: 'CALL [[procedure]]()',
  values: { warehouse: 'WH' },
} as const;
describe('project template files', () => {
  it('round trips source and defaults and restricts reads to the expected version', () => {
    expect(decodeProjectTemplate(encodeProjectTemplate(template))).toEqual(template);
    expect(decodeProjectTemplate(JSON.stringify({ ...template, version: 3 }))).toBeNull();
    expect(decodeProjectTemplate('{')).toBeNull();
    expect(
      decodeProjectTemplate(JSON.stringify({ ...template, values: { warehouse: 3 } }))
    ).toBeNull();
  });
  it('keeps names inside the reserved template directory', () => {
    expect(projectTemplatePath('Daily orders')).toBe('dvt_templates/daily-orders.json');
    expect(projectTemplatePath('../orders')).toBeNull();
    expect(projectTemplatePath('  ')).toBeNull();
  });
});
