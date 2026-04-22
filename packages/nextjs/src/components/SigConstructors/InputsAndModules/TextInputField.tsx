import React from 'react';
import { Input } from '@/components/ui';

interface TextInputFieldProps {
  label: string;
  inputId: string;
  placeholder?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  inputId,
  placeholder = 'Enter text',
  defaultValue,
  onChange,
}) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Input
        id={inputId}
        label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={onChange}
      />
    </div>
  );
};
