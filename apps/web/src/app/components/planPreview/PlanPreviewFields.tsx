/** Owned concern: render shared Preview sections and read-only field geometry. */
import { Fragment, type ReactNode } from 'react';
import styles from './PlanPreview.module.css';
export type PlanPreviewFieldSpec = Readonly<{
  label: string;
  value: ReactNode;
  dataSlot?: string;
  long?: boolean;
  mono?: boolean;
  fullWidth?: boolean;
}>;
type PlanPreviewFieldProps = Omit<PlanPreviewFieldSpec, 'value' | 'fullWidth'> &
  Readonly<{ children: ReactNode }>;
export function PlanPreviewSection({
  title,
  caption,
  children,
  fields,
}: Readonly<
  {
    title: string;
    caption?: string;
  } & (
    | { children: ReactNode; fields?: never }
    | { fields: Parameters<typeof PlanPreviewFieldGrid>[0]['fields']; children?: never }
  )
>) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {caption ? <p className={styles.sectionCaption}>{caption}</p> : null}
      </div>
      {fields ? <PlanPreviewFieldGrid fields={fields} /> : children}
    </section>
  );
}
export function PlanPreviewField({
  label,
  children,
  long = false,
  mono = false,
  dataSlot,
}: PlanPreviewFieldProps): JSX.Element {
  const valueClassName = long
    ? styles.fieldValueLong
    : mono
      ? styles.fieldValueMono
      : styles.fieldValueText;
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      <div
        aria-label={label}
        data-slot={dataSlot}
        data-testid={long ? 'plan-preview-long-value' : undefined}
        className={valueClassName}
      >
        {children}
      </div>
    </div>
  );
}
export function PlanPreviewFieldGrid({
  fields,
}: Readonly<{
  fields: readonly PlanPreviewFieldSpec[];
}>) {
  return (
    <div className={styles.fieldGrid}>
      {fields.map((field) => {
        const content = (
          <PlanPreviewField
            label={field.label}
            dataSlot={field.dataSlot}
            long={field.long}
            mono={field.mono}
          >
            {field.value}
          </PlanPreviewField>
        );
        return field.fullWidth ? (
          <div key={field.label} className={styles.fullWidthField}>
            {content}
          </div>
        ) : (
          <Fragment key={field.label}>{content}</Fragment>
        );
      })}
    </div>
  );
}
