'use client';

import Link from 'next/link';
import { useCustomServices } from '@/hooks/useCustomServices';
import { Card, CardHeader, CardBody, Badge, EmptyState, CodeBlock, Skeleton } from '@/components/ui';
import { AddressDisplay } from '@/components/explorer/AddressDisplay';

export default function CustomServicesIndex() {
  const { registry, loading, error } = useCustomServices();

  const entries = registry ? Object.values(registry.services) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-4) 0 var(--space-10)' }}>
      <div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Services
        </span>
        <h1 style={{ fontSize: 'clamp(1.5rem, 2vw, 1.875rem)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0.25rem 0 0.375rem' }}>
          Battle-test your services locally
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', maxWidth: '65ch', lineHeight: 'var(--lh-relaxed)' }}>
          Drop a Solidity file under <code>services/&lt;Name&gt;/</code>, run{' '}
          <code>npm run wizard</code>, and scaffold-evvm compiles it, deploys it
          against the local protocol stack, and generates a read / write / events
          UI from your ABI — zero wagmi/viem code, zero testnet gas. Extend{' '}
          <code>EvvmService</code> for full gasless dual-signature flows;{' '}
          <a
            href="/docs/custom-services/overview"
            style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            see the docs
          </a>{' '}
          for the full walkthrough.
        </p>
      </div>

      {loading && (
        <Card>
          <CardBody>
            <Skeleton shape="title" width="40%" />
            <div style={{ height: '0.5rem' }} />
            <Skeleton shape="text" width="70%" />
          </CardBody>
        </Card>
      )}

      {error && (
        <Card>
          <CardBody>
            <Badge variant="danger">Error</Badge>{' '}
            <span style={{ fontFamily: 'var(--font-mono)' }}>{error}</span>
          </CardBody>
        </Card>
      )}

      {!loading && !error && entries.length === 0 && (
        <Card>
          <EmptyState
            title="No custom services deployed yet"
            description={
              <>
                Drop a Solidity file under <code>services/&lt;Name&gt;/</code>, then run
                the wizard. The auto-UI will appear at <code>/services/&lt;Name&gt;</code>{' '}
                with read panel, write panel (admin / publicAction / publicPay forms),
                and a live event tail.
              </>
            }
            action={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                <CodeBlock copyable copyValue="npm run wizard">
                  {'npm run wizard'}
                </CodeBlock>
                <a
                  href="/docs/custom-services/overview"
                  style={{
                    color: 'var(--accent)',
                    fontSize: 'var(--fs-sm)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  How to make an EVVM service →
                </a>
              </div>
            }
          />
        </Card>
      )}

      {entries.map((svc) => {
        const writeCount = svc.manifest.functions.filter((f) => f.role !== 'read').length;
        const readCount = svc.manifest.functions.filter((f) => f.role === 'read').length;
        const hasEvvm = svc.manifest.contract.extendsEvvmService;
        return (
          <Card key={svc.slug} elevated>
            <CardHeader
              title={
                <Link
                  href={`/services/${svc.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {svc.name}
                </Link>
              }
              subtitle={svc.manifest.description ?? svc.manifest.contract.sourceFile}
              actions={
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {hasEvvm && <Badge variant="evvm">EvvmService</Badge>}
                  <Badge variant="neutral">{readCount} reads</Badge>
                  <Badge variant="neutral">{writeCount} writes</Badge>
                </div>
              }
            />
            <CardBody>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Address
                </span>
                <AddressDisplay address={svc.address} />
                <span style={{ marginLeft: 'auto' }}>
                  <Link
                    href={`/services/${svc.slug}`}
                    className="link"
                    style={{ color: 'var(--accent)', fontSize: 'var(--fs-sm)', fontWeight: 500 }}
                  >
                    Open →
                  </Link>
                </span>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
