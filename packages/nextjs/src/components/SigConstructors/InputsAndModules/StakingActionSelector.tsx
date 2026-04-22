import React from 'react';
import { Select } from '@/components/ui';

interface StakingActionSelectorProps {
  onChange: (isStaking: boolean) => void;
  defaultValue?: boolean;
}

export const StakingActionSelector: React.FC<StakingActionSelectorProps> = ({
  onChange,
  defaultValue = true,
}) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Select
        label="Action"
        defaultValue={defaultValue.toString()}
        onChange={(e) => onChange(e.target.value === 'true')}
        options={[
          { value: 'true', label: 'Stake' },
          { value: 'false', label: 'Unstake' },
        ]}
      />
    </div>
  );
};
