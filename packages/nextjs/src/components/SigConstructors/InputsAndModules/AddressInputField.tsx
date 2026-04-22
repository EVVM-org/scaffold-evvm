import React from 'react';
import { Input } from '@/components/ui';

interface AddressInputFieldProps {
  label: string;
  inputId: string;
  placeholder?: string;
  defaultValue?: string;
}

export const AddressInputField: React.FC<AddressInputFieldProps> = ({
  label,
  inputId,
  placeholder = '0x…',
  defaultValue,
}) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Input
        id={inputId}
        label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        spellCheck={false}
        autoComplete="off"
        mono
      />
    </div>
  );
};
