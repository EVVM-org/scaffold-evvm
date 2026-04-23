'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Abi } from 'viem';
import { readContract } from '@wagmi/core';
import { config } from '@/config';
import { Card, CardHeader, CardBody, Button, Skeleton, Input } from '@/components/ui';
import type { AbiItem, FunctionSpec } from '@/types/services';
import { coerceInput, formatReturnValue, placeholderFor, uiInputKind } from './typeHelpers';

interface ReadCardProps {
  address: `0x${string}`;
  abi: AbiItem[];
  fn: FunctionSpec;
}

/**
 * One view/pure function. Zero-arg functions auto-execute on mount; otherwise
 * the user fills in arguments and clicks Read.
 */
export function ReadCard({ address, abi, fn }: ReadCardProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const args = fn.inputs.map((p) => coerceInput(values[p.name] ?? '', p.type));
      const data = await readContract(config, {
        abi: abi as Abi,
        address,
        functionName: fn.name,
        args,
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? String(err));
      setResult(undefined);
    } finally {
      setLoading(false);
    }
  }, [abi, address, fn.inputs, fn.name, values]);

  // Auto-run zero-arg reads on mount so the page renders like a dashboard.
  useEffect(() => {
    if (fn.inputs.length === 0) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader
        title={<span style={{ fontFamily: 'var(--font-mono)' }}>{fn.name}()</span>}
        subtitle={fn.outputs.map((o) => `${o.name || '_'}: ${o.type}`).join(', ') || 'void'}
      />
      <CardBody>
        {fn.inputs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {fn.inputs.map((p) => (
              <Input
                key={p.name}
                label={<span style={{ fontFamily: 'var(--font-mono)' }}>{p.name} · {p.type}</span>}
                placeholder={placeholderFor(p.type)}
                mono={uiInputKind(p.type) !== 'string' && uiInputKind(p.type) !== 'bool'}
                value={values[p.name] ?? ''}
                onChange={(e) => setValues({ ...values, [p.name]: e.target.value })}
              />
            ))}
            <div>
              <Button variant="secondary" size="sm" onClick={execute} loading={loading}>
                Read
              </Button>
            </div>
          </div>
        )}

        {loading && fn.inputs.length === 0 && <Skeleton shape="text" width="40%" />}

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font-mono)' }}>
            {error}
          </div>
        )}

        {!loading && !error && result !== undefined && (
          <pre
            style={{
              margin: 0,
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.625rem 0.75rem',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-sm)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {formatReturnValue(result, fn.outputs[0])}
          </pre>
        )}
      </CardBody>
    </Card>
  );
}
