'use client';

import Link from 'next/link';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import {
  buildAddressBook,
  lookupAddress,
  resolveToken,
  shortAddress,
  ZERO_ADDRESS,
} from '@/utils/explorer';
import styles from '@/styles/pages/Explorer.module.css';

interface AddressDisplayProps {
  address: string | null | undefined;
  truncate?: boolean;
  noLink?: boolean;
  asToken?: boolean;
}

function CopyBtn({ text }: { text: string }) {
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).catch(() => {});
  };
  return (
    <button
      type="button"
      className={styles.copyBtn}
      onClick={onClick}
      title="Copy"
      aria-label="Copy"
    >
      ⧉
    </button>
  );
}

export function AddressDisplay({
  address,
  truncate = false,
  noLink = false,
  asToken = false,
}: AddressDisplayProps) {
  const { deployment } = useEvvmDeployment();
  if (!address) return <span className={styles.mono}>—</span>;
  const lower = address.toLowerCase();

  if (lower === ZERO_ADDRESS) {
    return (
      <span>
        <span className={styles.badgeNeutral + ' ' + styles.badge}>0x00…0</span>
      </span>
    );
  }

  const book = buildAddressBook(deployment);
  const known = lookupAddress(book, address);
  const token = asToken ? resolveToken(address) : null;

  const display = truncate ? shortAddress(address) : address;

  const body = token ? (
    <span>
      <span className={`${styles.badge} ${styles.badgeEvvm}`}>{token.symbol}</span>{' '}
      <span className={styles.mono}>{display}</span>
    </span>
  ) : known ? (
    <span>
      <span className={`${styles.badge} ${styles.badgePrimary}`}>{known.name}</span>{' '}
      <span className={styles.mono}>{display}</span>
    </span>
  ) : (
    <span className={styles.mono}>{display}</span>
  );

  if (noLink) {
    return (
      <span>
        {body}
        <CopyBtn text={address} />
      </span>
    );
  }

  return (
    <span>
      <Link href={`/evvmscan/address/${lower}`} className={styles.link}>
        {body}
      </Link>
      <CopyBtn text={address} />
    </span>
  );
}
