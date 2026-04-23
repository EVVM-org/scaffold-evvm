'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useCustomService } from '@/hooks/useCustomServices';
import { Card, CardHeader, CardBody, Badge, EmptyState, Skeleton, Stat, StatGroup } from '@/components/ui';
import { AddressDisplay } from '@/components/explorer/AddressDisplay';
import { ReadCard } from '@/components/services/ReadCard';
import { WriteCard } from '@/components/services/WriteCard';
import { EvvmSignedForm } from '@/components/services/EvvmSignedForm';

export default function CustomServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { service, loading, error } = useCustomService(slug);

  const groups = useMemo(() => {
    if (!service) return { reads: [], writes: [], admin: [], events: [] };
    const reads = service.manifest.functions.filter((f) => f.role === 'read');
    const admin = service.manifest.functions.filter((f) => f.role === 'admin');
    const writes = service.manifest.functions.filter(
      (f) => f.role !== 'read' && f.role !== 'admin',
    );
    return { reads, writes, admin, events: service.manifest.events };
  }, [service]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6) 0' }}>
        <Skeleton shape="title" width="30%" />
        <div style={{ height: '0.5rem' }} />
        <Skeleton shape="text" width="60%" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <Badge variant="danger">Error</Badge>{' '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>{error}</span>
        </CardBody>
      </Card>
    );
  }

  if (!service) {
    return (
      <Card>
        <EmptyState
          title={`No deployed service "${slug}"`}
          description="The registry has no entry for that slug. Did the wizard deploy it? Check deployments/customservices.json."
        />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-4) 0 var(--space-10)' }}>
      <div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Service · {service.manifest.contract.contractName}
        </span>
        <h1 style={{ fontSize: 'clamp(1.5rem, 2vw, 1.875rem)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0.25rem 0 0.375rem' }}>
          {service.name}
        </h1>
        {service.manifest.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)', maxWidth: '65ch', lineHeight: 'var(--lh-relaxed)' }}>
            {service.manifest.description}
          </p>
        )}
      </div>

      <Card>
        <StatGroup>
          <Stat label="Address" value={<AddressDisplay address={service.address} />} />
          <Stat label="Chain" value={service.chainId} mono />
          <Stat
            label="EvvmService"
            value={
              service.manifest.contract.extendsEvvmService ? (
                <Badge variant="success" dot>Yes</Badge>
              ) : (
                <Badge variant="neutral">No</Badge>
              )
            }
          />
          <Stat label="Functions" value={service.manifest.functions.length} mono />
        </StatGroup>
      </Card>

      {groups.reads.length > 0 && (
        <section>
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-3)' }}>Read</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
            {groups.reads.map((fn) => (
              <ReadCard key={fn.name} address={service.address} abi={service.abi} fn={fn} />
            ))}
          </div>
        </section>
      )}

      {groups.writes.length > 0 && (
        <section>
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-3)' }}>Write</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {groups.writes.map((fn) =>
              fn.role === 'publicPay' || fn.role === 'publicAction' ? (
                <EvvmSignedForm key={fn.name} address={service.address} abi={service.abi} fn={fn} />
              ) : (
                <WriteCard key={fn.name} address={service.address} abi={service.abi} fn={fn} />
              ),
            )}
          </div>
        </section>
      )}

      {groups.admin.length > 0 && (
        <section>
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-3)' }}>
            Admin{' '}
            <Badge variant="warning">restricted</Badge>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {groups.admin.map((fn) => (
              <WriteCard key={fn.name} address={service.address} abi={service.abi} fn={fn} />
            ))}
          </div>
        </section>
      )}

      {groups.events.length > 0 && (
        <section>
          <h2 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-3)' }}>Events</h2>
          <Card>
            <CardBody>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {groups.events.map((ev) => (
                  <li key={ev.name} style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                    <Badge variant="primary">event</Badge>{' '}
                    {ev.name}(
                    {ev.inputs
                      .map((p) => `${p.indexed ? 'indexed ' : ''}${p.type} ${p.name}`)
                      .join(', ')}
                    )
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  );
}
