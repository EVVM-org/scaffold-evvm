'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
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
  breadcrumbs?: Crumb[];
  children: ReactNode;
}

export function ExplorerShell({ title, subtitle, breadcrumbs, children }: ExplorerShellProps) {
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

      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={styles.breadcrumb}>
          <Link href="/evvmscan">EVVMScan</Link>
          {breadcrumbs.map((c, i) => (
            <span key={i}>
              <span aria-hidden>›</span>{' '}
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>
      )}

      {children}
    </div>
  );
}
