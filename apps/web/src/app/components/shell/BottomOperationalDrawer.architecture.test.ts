/**
 * Owned concern: guard operational drawer stylesheet ownership and theme tokens.
 * @baseline GH-3629: source ownership checks do not replace behavior or native layout evidence.
 * @decision Read the actual drawer and stylesheet; reject legacy, inline and undeclared bindings.
 * @consequence Contribution, feed, retry and close behavior retain their existing tests and owners.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';
import { assertComponentStyleOwnership } from '../../../testing/componentStyleOwnership.test.support';
import { readArchitectureSiblingSource } from '../../views/architecture.test.support';

const DRAWER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'BottomOperationalDrawer.tsx'
);
const DRAWER_STYLESHEET = readArchitectureSiblingSource(
  import.meta.dirname,
  'BottomOperationalDrawer.module.css'
);

describe('BottomOperationalDrawer stylesheet ownership', () => {
  it('consumes only declared classes from its direct stylesheet', () => {
    assertComponentStyleOwnership({
      componentSource: DRAWER_SOURCE,
      stylesheetSource: DRAWER_STYLESHEET,
      stylesheetImport: './BottomOperationalDrawer.module.css',
    });
  });

  it.each([
    [
      'legacy chrome import',
      DRAWER_SOURCE.replace(
        "import styles from './BottomOperationalDrawer.module.css'",
        "import { bottomOperationalDrawerClasses } from './chrome'"
      ),
    ],
    ['inline class', `${DRAWER_SOURCE}\n<div className="legacy-appearance" />`],
    ['inline style', `${DRAWER_SOURCE}\n<div style={{ display: 'flex' }} />`],
    ['undeclared class', DRAWER_SOURCE.replace('styles.drawer', 'styles.undeclaredDrawer')],
  ] as const)('rejects %s rather than admitting an invalid style owner', (_reason, source) => {
    expect(() =>
      assertComponentStyleOwnership({
        componentSource: source,
        stylesheetSource: DRAWER_STYLESHEET,
        stylesheetImport: './BottomOperationalDrawer.module.css',
      })
    ).toThrow();
  });

  it('keeps drawer and close hover appearance tied to semantic theme tokens', () => {
    const drawer = DRAWER_STYLESHEET.match(/\.drawer\s*\{([^}]+)\}/u)?.[1];
    const closeHover = DRAWER_STYLESHEET.match(/\.closeButton:hover\s*\{([^}]+)\}/u)?.[1];
    expect(drawer).toContain('var(--surface-shell)');
    expect(drawer).toContain('var(--border-default)');
    expect(drawer).toContain('var(--text-default)');
    expect(closeHover).toContain('var(--text-strong)');
  });
});
