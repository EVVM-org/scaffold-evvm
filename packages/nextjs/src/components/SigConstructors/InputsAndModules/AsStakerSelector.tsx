import React from 'react';
import { Select } from '@/components/ui';

interface AsStakerSelectorProps {
  onAsStakerChange: (asStaker: boolean) => void;
  marginTop?: string;
}

export const AsStakerSelector: React.FC<AsStakerSelectorProps> = ({
  onAsStakerChange,
  marginTop = '1rem',
}) => {
  return (
    <div style={{ marginTop }}>
      <Select
        label="Execute as staker"
        defaultValue="false"
        onChange={(e) => onAsStakerChange(e.target.value === 'true')}
        options={[
          { value: 'false', label: 'No' },
          { value: 'true', label: 'Yes' },
        ]}
      />
    </div>
  );
};
