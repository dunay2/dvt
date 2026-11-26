// @vitest-environment jsdom
/** Verify the Preview containment contract independently of module class hashes. */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type PreviewStyleRule = Readonly<{
  selector: string;
  media: string;
  style: CSSStyleDeclaration;
}>;

const previewStyleSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'PlanPreview.module.css'),
  'utf8'
);
let styleHost: HTMLStyleElement;
let previewStyleRules: readonly PreviewStyleRule[];

function collectPreviewStyleRules(rules: CSSRuleList, media = ''): PreviewStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSMediaRule)
      return collectPreviewStyleRules(rule.cssRules, rule.conditionText);
    if (rule instanceof CSSStyleRule) {
      return rule.selectorText
        .split(',')
        .map((selector) => ({ selector: selector.trim(), media, style: rule.style }));
    }
    return [];
  });
}

describe('Preview containment and focus styles', () => {
  beforeAll(() => {
    styleHost = document.createElement('style');
    styleHost.textContent = previewStyleSource;
    document.head.appendChild(styleHost);
    previewStyleRules = collectPreviewStyleRules(styleHost.sheet!.cssRules);
  });

  afterAll(() => styleHost.remove());

  it.each([
    ['.dialogContent', 'max-height', '92vh', ''],
    ['.dialogContent', 'width', 'calc(100vw - 2rem)', ''],
    ['.scrollRegion', 'max-height', '70vh', ''],
    ['.scrollRegion', 'overflow-y', 'auto', ''],
    ['.scrollRegion', 'overflow-x', 'hidden', ''],
    ['.fieldValueLong', 'word-break', 'break-all', ''],
    ['.fieldValueLong', 'min-width', '0px', ''],
    ['.dialogWide', 'max-width', '56rem', '(min-width: 40rem)'],
    ['.dialogNarrow', 'max-width', '42rem', '(min-width: 40rem)'],
    ['.fieldGrid', 'grid-template-columns', 'repeat(2, minmax(0, 1fr))', '(min-width: 48rem)'],
    ['.targetGrid', 'grid-template-columns', 'repeat(3, minmax(0, 1fr))', '(min-width: 48rem)'],
    ['.fullWidthField', 'grid-column', 'span 2 / span 2', '(min-width: 48rem)'],
    ['.technicalSummary:focus-visible', 'outline-width', '2px', ''],
    ['.technicalSummary:focus-visible', 'outline-color', 'var(--focus-ring)', ''],
  ])('keeps %s %s as %s at %s', (selector, property, value, media) => {
    const rule = previewStyleRules.find(
      (candidate) => candidate.selector === selector && candidate.media === media
    );
    expect(rule, `${selector} at ${media || 'all widths'}`).toBeDefined();
    expect(rule!.style.getPropertyValue(property)).toBe(value);
  });
});
