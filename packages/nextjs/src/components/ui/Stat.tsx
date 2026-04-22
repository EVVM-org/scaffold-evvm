import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Stat.module.css';

interface StatGroupProps extends HTMLAttributes<HTMLDivElement> {}

export function StatGroup({ className, children, ...rest }: StatGroupProps) {
  return (
    <div className={`${styles.group} ${className ?? ''}`.trim()} {...rest}>
      {children}
    </div>
  );
}

interface StatProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  mono?: boolean;
}

export function Stat({ label, value, hint, mono = false, className, ...rest }: StatProps) {
  return (
    <div className={`${styles.stat} ${mono ? styles.mono : ''} ${className ?? ''}`.trim()} {...rest}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
