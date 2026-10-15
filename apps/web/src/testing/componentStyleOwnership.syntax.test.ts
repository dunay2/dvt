/** Owned concern: prove embedded appearance cannot evade the shared ownership assertion. */
import { describe, expect, it } from 'vitest';

import { assertComponentStyleOwnership } from './componentStyleOwnership.test.support';

function assertOwned(fragment: string): void {
  assertComponentStyleOwnership({
    componentSource: `import styles from './View.module.css';
      export const owned = <div className={styles.root} />;
      ${fragment}`,
    stylesheetSource: '.root { display: flex; } .active { color: green; }',
    stylesheetImport: './View.module.css',
  });
}

describe('embedded component appearance', () => {
  it.each([
    '<div style={{ color: "red" }} />',
    '<div style={appearance} />',
    '<style>{"div { color: red; }"}</style>',
    '<div className="flex" />',
    '<div className={"flex"} />',
    '<div className={active ? "flex" : styles.root} />',
    '<div className={`flex ${styles.root}`} />',
    '<div className={styles.root + " flex"} />',
    'const local = "flex"; const view = <div className={local} />;',
    'const local = { root: "flex" }; const view = <div className={local.root} />;',
    '<div className={cn(styles.root, { "flex": active })} />',
    '<div className={cn([styles.root, "flex"])} />',
    'const local = { style: { color: "red" } }; const view = <div {...local} />;',
    '<div {...{ className: "flex" }} />',
    'const first = { className: "flex" }; const second = { ...first }; const view = <div {...second} />;',
    'function render() { const local = "flex"; return <div className={local} />; }',
    'function classes() { return "flex"; } const view = <div className={classes()} />;',
    'const classes = () => "flex"; const view = <div className={classes()} />;',
    '<div {...{ ["style"]: { color: "red" } }} />',
    'const className = "flex"; const view = <div {...{ className }} />;',
    'const local = ["flex"]; const view = <div className={cn(...local)} />;',
    'const local = { root: "flex" }; const view = <div className={local["root"]} />;',
    '<div className={active ? styles.root : } />',
  ])('rejects authored appearance: %s', (fragment) => {
    expect(() => assertOwned(fragment)).toThrow();
  });

  it.each([
    '<div className={styles.root} />',
    '<div className={styles["root"]} />',
    '<div className={active ? styles.active : styles.root} />',
    '<div className={variant === "compact" ? styles.active : styles.root} />',
    '<div className={cn(styles.root, active && styles.active)} />',
    '<div className={cn({ [styles.active]: active })} />',
    '<div className={`${styles.root} ${active ? styles.active : ""}`} />',
    'const local = styles.root; const view = <div className={local} />;',
    'const local = "flex"; function render(local) { return <div className={local} />; }',
    'const props = { title: "style= className=" }; const view = <div {...props} />;',
    '<div {...props} className={externalClasses.root} />',
    'const text = "className= style="; // style= is not an attribute',
    'const first = second; const second = first; const view = <div className={first} />;',
    'const classes = () => styles.root; const view = <div className={classes()} />;',
  ])('preserves external ownership and unrelated text: %s', (fragment) => {
    expect(() => assertOwned(fragment)).not.toThrow();
  });
});
