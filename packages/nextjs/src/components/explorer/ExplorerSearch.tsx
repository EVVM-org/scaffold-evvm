'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExplorerClient } from '@/hooks/useExplorerClient';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import styles from '@/styles/pages/Explorer.module.css';

function classify(input: string): 'hash' | 'address' | 'block' | 'username' | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return 'hash';
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return 'address';
  if (/^\d+$/.test(trimmed)) return 'block';
  if (/^@?[a-zA-Z0-9._-]+$/.test(trimmed)) return 'username';
  return null;
}

export function ExplorerSearch() {
  const router = useRouter();
  const client = useExplorerClient();
  const { deployment } = useEvvmDeployment();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const raw = value.trim();
    const kind = classify(raw);
    if (!kind) {
      setError('Enter a tx hash, block number, address, or @username');
      return;
    }

    setLoading(true);
    try {
      if (kind === 'hash') {
        router.push(`/evvmscan/tx/${raw.toLowerCase()}`);
      } else if (kind === 'address') {
        router.push(`/evvmscan/address/${raw.toLowerCase()}`);
      } else if (kind === 'block') {
        router.push(`/evvmscan/block/${raw}`);
      } else if (kind === 'username') {
        if (!deployment?.nameService || !deployment.evvmID) {
          setError('NameService not deployed — cannot resolve username');
          return;
        }
        const username = raw.startsWith('@') ? raw.slice(1) : raw;
        const owner = await client.readContract({
          address: deployment.nameService,
          abi: [
            {
              type: 'function',
              name: 'getOwnerOfIdentity',
              stateMutability: 'view',
              inputs: [{ name: 'identity', type: 'string' }],
              outputs: [{ name: '', type: 'address' }],
            },
          ],
          functionName: 'getOwnerOfIdentity',
          args: [username],
        });
        if (!owner || owner === '0x0000000000000000000000000000000000000000') {
          setError(`Username @${username} not found`);
          return;
        }
        router.push(`/evvmscan/address/${(owner as string).toLowerCase()}`);
      }
      setValue('');
    } catch (err: any) {
      setError(err?.message ?? 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className={styles.searchForm} onSubmit={onSubmit}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search by tx hash / block / address / @username"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <button className={styles.searchBtn} type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <div className={styles.searchError}>{error}</div>}
    </div>
  );
}
