'use client';

import type { ReactNode } from 'react';
import { ExplorerSearch } from './ExplorerSearch';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import styles from '@/styles/pages/Explorer.module.css';

interface Crumb {
  label: string;
  href?: string;
}

interface ExplorerShellProps {
  title: string;
  subtitle?: string;
  /** Kept for API compatibility; AppShell renders automatic breadcrumbs now. */
  breadcrumbs?: Crumb[];
  children: ReactNode;
}

export function ExplorerShell({ title, subtitle, children }: ExplorerShellProps) {
  const { deployment } = useEvvmDeployment();
  const chainLabel = deployment
    ? `Chain ${deployment.chainId} · EVVM ID ${deployment.evvmID}`
    : 'Local Chain';

  return (
    <div className={styles.wrap}>
      <div className={styles.subHeader}>
        <div className={styles.subHeaderTop}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <span className={styles.chainBadge}>
            <span className={styles.chainDot} />
            {chainLabel}
          </span>
        </div>
        <ExplorerSearch />
      </div>
      {children}
    </div>
  );
}
