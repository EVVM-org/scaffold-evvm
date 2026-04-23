'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { NAV_GROUPS } from './navItems';
import { IconChevronRight, IconHome } from './icons';
import styles from './Breadcrumb.module.css';

/**
 * Resolve a path segment to a human label. First tries the nav config, so
 * `/evvm/payments` renders "Payments" rather than "payments". Long hashes
 * and addresses are truncated for readability.
 */
const SEGMENT_LABELS: Record<string, string> = {
  evvm: 'EVVM',
  evvmscan: 'EVVMScan',
  tx: 'Transaction',
  block: 'Block',
  address: 'Address',
  nameservice: 'Names',
  p2pswap: 'P2P Swap',
  services: 'Services',
};

function labelFor(segment: string, href: string): string {
  const match = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === href);
  if (match) return match.label;

  const known = SEGMENT_LABELS[segment.toLowerCase()];
  if (known) return known;

  // Truncate long tx hashes (66 chars) and addresses (42 chars)
  if (/^0x[0-9a-fA-F]{40,}$/.test(segment)) {
    return `${segment.slice(0, 6)}…${segment.slice(-4)}`;
  }

  // Numeric block numbers render as "#N"
  if (/^\d+$/.test(segment)) return `#${segment}`;

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * Automatic breadcrumb derived from the current pathname. Hidden on the
 * home route since there's nothing to show above it.
 */
export function Breadcrumb() {
  const pathname = usePathname();
  if (!pathname || pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    return { label: labelFor(seg, href), href, isLast: i === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className={styles.nav}>
      <Link href="/" className={`${styles.link} ${styles.item}`} aria-label="Home">
        <IconHome width={14} height={14} />
      </Link>
      {crumbs.map((c) => (
        <Fragment key={c.href}>
          <span className={styles.sep} aria-hidden>
            <IconChevronRight width={12} height={12} />
          </span>
          {c.isLast ? (
            <span className={`${styles.item} ${styles.current}`} aria-current="page">
              {c.label}
            </span>
          ) : (
            <Link href={c.href} className={`${styles.link} ${styles.item}`}>
              {c.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
