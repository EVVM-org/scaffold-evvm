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
          Custom EVVM services
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', maxWidth: '65ch', lineHeight: 'var(--lh-relaxed)' }}>
          Contracts you dropped into the project&apos;s <code>services/</code> folder, auto-deployed by
          the wizard and auto-rendered here. Drop another and re-run{' '}
          <code>npm run wizard</code> to get a new page.
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
            description="Drop a Solidity file under services/<Name>/, then run:"
            action={
              <CodeBlock copyable copyValue="npm run wizard">
                {'npm run wizard'}
              </CodeBlock>
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
