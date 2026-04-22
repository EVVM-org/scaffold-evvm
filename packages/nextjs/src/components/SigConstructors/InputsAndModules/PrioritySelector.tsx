import React from 'react';
import { Select } from '@/components/ui';

interface PrioritySelectorProps {
  onPriorityChange: (priority: string) => void;
  marginTop?: string;
}

/**
 * Offers two priority types of execution: sync (low) and async (high).
 */
export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  onPriorityChange,
  marginTop = '1rem',
}) => {
  return (
    <div style={{ marginTop }}>
      <Select
        label="EVVM Nonce Type"
        defaultValue="low"
        onChange={(e) => onPriorityChange(e.target.value)}
        options={[
          { value: 'low', label: 'Synchronous nonce' },
          { value: 'high', label: 'Asynchronous nonce' },
        ]}
      />
    </div>
  );
};
