import React from 'react';
import { Input } from '@/components/ui';

interface NumberInputFieldProps {
  label: string;
  inputId: string;
  placeholder?: string;
  defaultValue?: string;
}

export const NumberInputField: React.FC<NumberInputFieldProps> = ({
  label,
  inputId,
  placeholder = 'Enter number',
  defaultValue,
}) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Input
        id={inputId}
        label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        inputMode="decimal"
        mono
      />
    </div>
  );
};
