'use client';

import type { ReactNode } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';
import styles from './AppShell.module.css';

/**
 * App shell: responsive two-column layout that places a persistent Sidebar
 * on the left at ≥1024px and a TopBar+drawer below that breakpoint. The
 * Sidebar is always rendered — its own CSS hides it on narrow viewports —
 * and the TopBar hides its chrome on wide viewports so the same markup
 * serves both modes without client-side branching.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.root}>
      <Sidebar />
      <div className={styles.column}>
        <TopBar />
        <div className={styles.desktopActionBar}>
          <ThemeToggle />
          <WalletConnect />
        </div>
        <main className={styles.main}>
          <div className={styles.mainInner}>
            <Breadcrumb />
            {children}
          </div>
        </main>
        <footer className={styles.footer}>By EVVM with care</footer>
      </div>
    </div>
  );
}
