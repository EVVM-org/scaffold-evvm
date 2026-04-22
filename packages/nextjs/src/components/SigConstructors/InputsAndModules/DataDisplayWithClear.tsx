import React from 'react';
import { DetailedData } from '@/components/SigConstructors/InputsAndModules/DetailedData';
import { Button } from '@/components/ui';

interface DataDisplayWithClearProps {
  dataToGet: any;
  onClear: () => void;
  marginTop?: string;
  onExecute?: () => void;
}

export const DataDisplayWithClear: React.FC<DataDisplayWithClearProps> = ({
  dataToGet,
  onClear,
  marginTop = '2rem',
  onExecute,
}) => {
  if (!dataToGet) return null;

  return (
    <div style={{ marginTop }}>
      <DetailedData dataToGet={dataToGet} />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
        {onExecute && (
          <Button variant="primary" size="sm" onClick={onExecute}>
            Execute
          </Button>
        )}
      </div>
    </div>
  );
};
