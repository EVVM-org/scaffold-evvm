'use client';

import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  helper?: ReactNode;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, helper, options, children, required, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const helperId = helper ? `${selectId}-helper` : undefined;

  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden>*</span>}
        </label>
      )}
      <div className={styles.selectWrap}>
        <select
          ref={ref}
          id={selectId}
          className={`${styles.select} ${className ?? ''}`.trim()}
          required={required}
          aria-describedby={helperId}
          {...rest}
        >
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <span className={styles.chevron} aria-hidden>▾</span>
      </div>
      {helper && <span id={helperId} className={styles.helper}>{helper}</span>}
    </div>
  );
});
