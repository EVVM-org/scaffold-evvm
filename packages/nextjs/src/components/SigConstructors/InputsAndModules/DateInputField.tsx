import React from 'react';
import { Input } from '@/components/ui';

interface DateInputFieldProps {
  label: string;
  inputId: string;
  placeholder?: string;
  defaultValue?: string;
}

export const DateInputField: React.FC<DateInputFieldProps> = ({
  label,
  inputId,
  defaultValue,
}) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <Input
        id={inputId}
        label={label}
        type="datetime-local"
        defaultValue={defaultValue}
      />
    </div>
  );
};
