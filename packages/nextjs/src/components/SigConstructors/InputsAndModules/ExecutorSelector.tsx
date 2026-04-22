import React from 'react';
import { Select, Input } from '@/components/ui';

interface ExecutorSelectorProps {
  label?: string;
  inputId: string;
  placeholder?: string;
  onExecutorToggle: (isUsing: boolean) => void;
  isUsingExecutor: boolean;
}

export const ExecutorSelector: React.FC<ExecutorSelectorProps> = ({
  label = 'Are you using an executor?',
  inputId,
  placeholder = 'Enter executor address',
  onExecutorToggle,
  isUsingExecutor,
}) => {
  return (
    <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Select
        label={label}
        defaultValue={isUsingExecutor ? 'true' : 'false'}
        onChange={(e) => onExecutorToggle(e.target.value === 'true')}
        options={[
          { value: 'false', label: 'No' },
          { value: 'true', label: 'Yes' },
        ]}
      />
      {isUsingExecutor && (
        <Input
          id={inputId}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          mono
        />
      )}
    </div>
  );
};
