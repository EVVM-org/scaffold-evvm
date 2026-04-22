'use client';

import { useCallback, type HTMLAttributes, type ReactNode } from 'react';
import styles from './Code.module.css';

export function Code({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <code className={`${styles.inline} ${className ?? ''}`.trim()} {...rest}>
      {children}
    </code>
  );
}

interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  copyable?: boolean;
  copyValue?: string;
  children?: ReactNode;
}

export function CodeBlock({
  copyable = false,
  copyValue,
  className,
  children,
  ...rest
}: CodeBlockProps) {
  const handleCopy = useCallback(() => {
    const value = copyValue ?? (typeof children === 'string' ? children : '');
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => {});
  }, [copyValue, children]);

  return (
    <div className={styles.wrap}>
      <pre className={`${styles.block} ${className ?? ''}`.trim()} {...rest}>
        {children}
      </pre>
      {copyable && (
        <button
          type="button"
          className={styles.copy}
          onClick={handleCopy}
          aria-label="Copy to clipboard"
        >
          Copy
        </button>
      )}
    </div>
  );
}
