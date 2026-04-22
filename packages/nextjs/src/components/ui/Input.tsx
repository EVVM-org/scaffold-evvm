'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  mono?: boolean;
  wrapClassName?: string;
}

/**
 * Accessible text input with visible label, helper text, optional leading /
 * trailing adornments, and a monospace mode for addresses / hashes / hex.
 * The label/input are wired with htmlFor/id automatically, and error state
 * is exposed via aria-invalid + aria-describedby for screen readers.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helper,
    error,
    leading,
    trailing,
    mono = false,
    required,
    id,
    className,
    wrapClassName,
    disabled,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = helper ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  const fieldClasses = [
    styles.field,
    mono ? styles.mono : '',
    error ? styles.invalid : '',
    disabled ? styles.disabled : '',
    wrapClassName ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const wrapClasses = [
    styles.inputWrap,
    leading ? styles.hasLeading : '',
    trailing ? styles.hasTrailing : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={fieldClasses}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden>*</span>}
        </label>
      )}
      <div className={wrapClasses}>
        {leading && <span className={styles.leading}>{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          className={`${styles.input} ${className ?? ''}`.trim()}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[helperId, errorId].filter(Boolean).join(' ') || undefined}
          disabled={disabled}
          {...rest}
        />
        {trailing && <span className={styles.trailing}>{trailing}</span>}
      </div>
      {helper && !error && <span id={helperId} className={styles.helper}>{helper}</span>}
      {error && <span id={errorId} role="alert" className={styles.errorText}>{error}</span>}
    </div>
  );
});
