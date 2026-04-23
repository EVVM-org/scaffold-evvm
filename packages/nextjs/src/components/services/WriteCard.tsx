'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { Abi } from 'viem';
import { writeContract, waitForTransactionReceipt } from '@wagmi/core';
import { useAccount } from 'wagmi';
import { config } from '@/config';
import { Card, CardHeader, CardBody, Button, Input, Badge } from '@/components/ui';
import type { AbiItem, FunctionSpec } from '@/types/services';
import { coerceInput, placeholderFor, uiInputKind } from './typeHelpers';

interface WriteCardProps {
  address: `0x${string}`;
  abi: AbiItem[];
  fn: FunctionSpec;
}

/**
 * One state-changing function. Renders one input per ABI arg, plus an
 * optional ETH value field for payable functions. EVVM-signed functions
 * (publicPay / publicAction) carry a warning banner — full dual-signature
 * support comes in Phase D; for now the user can still call them if they
 * supply all args including signatures manually.
 */
export function WriteCard({ address, abi, fn }: WriteCardProps) {
  const { isConnected } = useAccount();
  const [values, setValues] = useState<Record<string, string>>({});
  const [ethValue, setEthValue] = useState<string>('');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isPayable = fn.stateMutability === 'payable';
  const isEvvmSigned = fn.role === 'publicPay' || fn.role === 'publicAction';

  const execute = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setTxHash(null);
    try {
      const args = fn.inputs.map((p) => coerceInput(values[p.name] ?? '', p.type));
      const write: Record<string, unknown> = {
        abi: abi as Abi,
        address,
        functionName: fn.name,
        args,
      };
      if (isPayable && ethValue.trim() !== '') {
        write.value = coerceInput(ethValue, 'uint256');
      }
      const hash = await writeContract(config, write as never);
      setTxHash(hash);
      await waitForTransactionReceipt(config, { hash });
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }, [abi, address, ethValue, fn.inputs, fn.name, isPayable, values]);

  return (
    <Card>
      <CardHeader
        title={<span style={{ fontFamily: 'var(--font-mono)' }}>{fn.name}(…)</span>}
        subtitle={fn.inputs.length === 0 ? 'no arguments' : `${fn.inputs.length} arg${fn.inputs.length === 1 ? '' : 's'}`}
        actions={
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {fn.role === 'admin' && <Badge variant="warning">admin</Badge>}
            {isPayable && <Badge variant="info">payable</Badge>}
            {fn.role === 'publicPay' && <Badge variant="evvm">EVVM pay</Badge>}
            {fn.role === 'publicAction' && <Badge variant="evvm">EVVM action</Badge>}
          </div>
        }
      />
      <CardBody>
        {isEvvmSigned && (
          <div
            style={{
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-muted)',
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            This function expects an off-chain EVVM signature. Auto-signing is coming in a later
            scaffold update; until then, supply the {' '}
            <code>signature</code>{fn.role === 'publicPay' ? <> / <code>signatureEvvm</code></> : null} bytes manually.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {fn.inputs.map((p) => (
            <Input
              key={p.name}
              label={
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {p.name} · {p.type}
                  {p.role === 'plumbing' && (
                    <span style={{ color: 'var(--text-faint)', marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
                      (plumbing)
                    </span>
                  )}
                </span>
              }
              placeholder={placeholderFor(p.type)}
              mono={uiInputKind(p.type) !== 'string' && uiInputKind(p.type) !== 'bool'}
              value={values[p.name] ?? ''}
              onChange={(e) => setValues({ ...values, [p.name]: e.target.value })}
            />
          ))}

          {isPayable && (
            <Input
              label="ETH value to send"
              placeholder="0 (in wei, or 0.01 for ether)"
              mono
              value={ethValue}
              onChange={(e) => setEthValue(e.target.value)}
            />
          )}

          <div>
            <Button
              variant="primary"
              size="md"
              onClick={execute}
              loading={submitting}
              disabled={!isConnected}
            >
              {submitting ? 'Sending…' : isConnected ? 'Execute' : 'Connect wallet to execute'}
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: '0.75rem',
              color: 'var(--danger)',
              fontSize: 'var(--fs-sm)',
              fontFamily: 'var(--font-mono)',
              wordBreak: 'break-all',
            }}
          >
            {error}
          </div>
        )}

        {txHash && (
          <div style={{ marginTop: '0.75rem', fontSize: 'var(--fs-sm)' }}>
            <Badge variant="success" dot>Submitted</Badge>{' '}
            <Link href={`/evvmscan/tx/${txHash}`} style={{ fontFamily: 'var(--font-mono)' }}>
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
