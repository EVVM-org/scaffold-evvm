'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import type { Abi } from 'viem';
import { writeContract, waitForTransactionReceipt, getWalletClient } from '@wagmi/core';
import { useAccount } from 'wagmi';
import { config } from '@/config';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Badge,
} from '@/components/ui';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { buildActionSignature, buildPaySignature, ZERO_ADDRESS } from '@/utils/services/signing';
import { coerceInput, placeholderFor, uiInputKind } from './typeHelpers';
import type { AbiItem, FunctionSpec } from '@/types/services';

interface Props {
  address: `0x${string}`;
  abi: AbiItem[];
  fn: FunctionSpec;
}

/**
 * Specialized form for `publicPay` and `publicAction` functions.
 *
 * Plumbing args (signature, nonce, senderExecutor, originExecutor,
 * isAsyncExec, plus their *Evvm/*Pay variants) are never shown to the
 * user — they're auto-filled or derived. The user only fills the
 * business args (the ones that go into the action hash payload), the
 * pay amount (for publicPay), the priority fee, and the nonces.
 *
 * Built on top of `@evvm/evvm-js` so the signature envelopes match the
 * rest of the scaffold's EVVM flows.
 */
export function EvvmSignedForm({ address, abi, fn }: Props) {
  const { deployment } = useEvvmDeployment();
  const { address: walletAddr, isConnected } = useAccount();

  const isPay = fn.role === 'publicPay';

  // Business args — everything not marked as plumbing/user by the manifest.
  const businessArgs = useMemo(
    () => fn.inputs.filter((p) => p.role === 'business'),
    [fn.inputs],
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [nonce, setNonce] = useState<string>('');
  const [isAsync, setIsAsync] = useState<'sync' | 'async'>('async');
  // Pay-only inputs
  const [priorityFee, setPriorityFee] = useState<string>('0');
  const [payNonce, setPayNonce] = useState<string>('');
  const [payIsAsync, setPayIsAsync] = useState<'sync' | 'async'>('async');

  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const execute = useCallback(async () => {
    setError(null);
    setTxHash(null);
    setSubmitting(true);
    try {
      if (!deployment?.evvm || !deployment.evvmID) {
        throw new Error('EVVM not deployed — cannot sign');
      }
      if (!walletAddr) throw new Error('Connect a wallet first');

      const walletClient = await getWalletClient(config);
      if (!walletClient) throw new Error('Wallet client unavailable');

      // Coerce business arg values by ABI type.
      const businessValues = businessArgs.map((p) => coerceInput(values[p.name] ?? '', p.type));
      const businessTypes = businessArgs.map((p) => p.type);

      // Action signature — hashes the business payload.
      const actionNonce = BigInt(nonce || '0');
      const action = await buildActionSignature({
        walletClient,
        evvmId: BigInt(deployment.evvmID),
        serviceAddress: address,
        originExecutor: walletAddr as `0x${string}`,
        nonce: actionNonce,
        isAsyncExec: isAsync === 'async',
        functionName: fn.name,
        businessArgTypes: businessTypes,
        businessArgValues: businessValues,
      });

      // Pay signature (only for publicPay).
      // For the pay amount we use either the manifest-hinted amountArg or
      // fall back to 0 (the service may be collecting a fixed fee).
      let payData: Awaited<ReturnType<typeof buildPaySignature>> | null = null;
      if (isPay) {
        const amountArgName = fn.payMetadata?.amountArg;
        const amountValue =
          amountArgName && values[amountArgName]
            ? (coerceInput(values[amountArgName], 'uint256') as bigint)
            : 0n;
        payData = await buildPaySignature({
          walletClient,
          evvmAddress: deployment.evvm as `0x${string}`,
          evvmId: BigInt(deployment.evvmID),
          serviceAddress: address,
          originExecutor: walletAddr as `0x${string}`,
          amount: amountValue,
          priorityFee: BigInt(priorityFee || '0'),
          nonce: BigInt(payNonce || '0'),
          isAsyncExec: payIsAsync === 'async',
        });
      }

      // Build the final ABI arg array by filling each input slot from
      // either the business values, the plumbing we derived, or the pay
      // signature bundle.
      const finalArgs = fn.inputs.map((p) => {
        switch (p.name) {
          case 'user':
            return walletAddr;
          case 'senderExecutor':
            return action.plumbing.senderExecutor;
          case 'originExecutor':
            return action.plumbing.originExecutor;
          case 'nonce':
            return action.plumbing.nonce;
          case 'isAsyncExec':
            return action.plumbing.isAsyncExec;
          case 'signature':
            return action.signature;
          case 'priorityFeeEvvm':
          case 'priorityFee_EVVM':
          case 'priorityFeePay':
            return payData?.data.priorityFee ?? 0n;
          case 'nonceEvvm':
          case 'nonce_EVVM':
          case 'noncePay':
            return payData?.data.nonce ?? 0n;
          case 'isAsyncExecEvvm':
          case 'isAsyncExec_EVVM':
            return payData?.data.isAsyncExec ?? true;
          case 'signatureEvvm':
          case 'signature_EVVM':
          case 'signaturePay':
            return payData?.data.signature ?? '0x';
          default:
            // business arg
            return coerceInput(values[p.name] ?? '', p.type);
        }
      });

      const write: Record<string, unknown> = {
        abi: abi as Abi,
        address,
        functionName: fn.name,
        args: finalArgs,
      };
      const hash = await writeContract(config, write as never);
      setTxHash(hash);
      await waitForTransactionReceipt(config, { hash });
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }, [
    abi,
    address,
    businessArgs,
    deployment,
    fn.inputs,
    fn.name,
    fn.payMetadata?.amountArg,
    isAsync,
    isPay,
    nonce,
    payIsAsync,
    payNonce,
    priorityFee,
    values,
    walletAddr,
  ]);

  return (
    <Card>
      <CardHeader
        title={<span style={{ fontFamily: 'var(--font-mono)' }}>{fn.name}(…)</span>}
        subtitle={
          isPay
            ? 'EVVM pay — dual signature (action + pay) built for you'
            : 'EVVM action — single signature built for you'
        }
        actions={
          <Badge variant="evvm">{isPay ? 'publicPay' : 'publicAction'}</Badge>
        }
      />
      <CardBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {businessArgs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
              No business arguments — only plumbing (signatures, nonces) will be sent.
            </p>
          ) : (
            businessArgs.map((p) => (
              <Input
                key={p.name}
                label={
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {p.name} · {p.type}
                    {fn.payMetadata?.amountArg === p.name && (
                      <span style={{ color: 'var(--accent)', marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
                        (pay amount)
                      </span>
                    )}
                  </span>
                }
                placeholder={placeholderFor(p.type)}
                mono={uiInputKind(p.type) !== 'string' && uiInputKind(p.type) !== 'bool'}
                value={values[p.name] ?? ''}
                onChange={(e) => setValues({ ...values, [p.name]: e.target.value })}
              />
            ))
          )}

          <div
            style={{
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px dashed var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <Input
              label="Action nonce"
              placeholder="0"
              mono
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              helper="Service-tracked nonce. Pick any unused value in async mode."
            />
            <Select
              label="Action nonce mode"
              value={isAsync}
              onChange={(e) => setIsAsync(e.target.value as 'sync' | 'async')}
              options={[
                { value: 'async', label: 'async' },
                { value: 'sync', label: 'sync' },
              ]}
            />
            {isPay && (
              <>
                <Input
                  label="Priority fee"
                  placeholder="0"
                  mono
                  value={priorityFee}
                  onChange={(e) => setPriorityFee(e.target.value)}
                  helper="MATE paid to the fisher relaying your tx."
                />
                <Input
                  label="Pay nonce (EVVM)"
                  placeholder="0"
                  mono
                  value={payNonce}
                  onChange={(e) => setPayNonce(e.target.value)}
                />
                <Select
                  label="Pay nonce mode"
                  value={payIsAsync}
                  onChange={(e) => setPayIsAsync(e.target.value as 'sync' | 'async')}
                  options={[
                    { value: 'async', label: 'async' },
                    { value: 'sync', label: 'sync' },
                  ]}
                />
              </>
            )}
          </div>

          <div>
            <Button
              variant="primary"
              onClick={execute}
              loading={submitting}
              disabled={!isConnected || submitting}
            >
              {submitting ? 'Signing & sending…' : isConnected ? 'Sign & execute' : 'Connect wallet'}
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

// Re-export the zero-address constant for call sites that want to show it as
// a default for originExecutor.
export { ZERO_ADDRESS };
