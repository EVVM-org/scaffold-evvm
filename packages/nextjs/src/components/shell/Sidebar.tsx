'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { NAV_GROUPS, isActive } from './navItems';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const pathname = usePathname();
  const { deployment } = useEvvmDeployment();

  return (
    <aside className={styles.sidebar} aria-label="Primary navigation">
      <Link href="/" className={styles.brand}>
        <span className={styles.brandIcon} aria-hidden>E</span>
        <span className={styles.brandText}>Scaffold-EVVM</span>
      </Link>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={styles.group}>
            <span className={styles.groupLabel}>{group.label}</span>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.item} ${active ? styles.itemActive : ''}`.trim()}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={styles.itemIcon}>
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.footerRow}>
          <span>Network</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className={styles.footerDot} aria-hidden />
            {deployment?.chainId ?? '—'}
          </span>
        </div>
        <div className={styles.footerRow}>
          <span>EVVM ID</span>
          <span className="mono">{deployment?.evvmID ?? '—'}</span>
        </div>
      </div>
    </aside>
  );
}
