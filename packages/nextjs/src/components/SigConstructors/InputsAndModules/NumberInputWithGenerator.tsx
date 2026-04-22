'use client';

import React from 'react';
import mersenneTwister from '@/utils/mersenneTwister';
import { Input, Button } from '@/components/ui';

interface NumberInputWithGeneratorProps {
  label: string;
  inputId: string;
  placeholder?: string;
  buttonText?: string;
  showRandomBtn?: boolean;
}

export const NumberInputWithGenerator: React.FC<NumberInputWithGeneratorProps> = ({
  label,
  inputId,
  placeholder = 'Enter number',
  buttonText,
  showRandomBtn = true,
}) => {
  const generateRandomNumber = () => {
    const seed = Math.floor(Math.random() + Date.now());
    const mt = mersenneTwister(seed);
    const number = mt.int32();
    const el = document.getElementById(inputId) as HTMLInputElement | null;
    if (el) el.value = number.toString();
  };

  return (
    <div style={{ marginBottom: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Input
        id={inputId}
        type="number"
        label={label}
        placeholder={placeholder}
        mono
      />
      {showRandomBtn && (
        <Button variant="secondary" size="sm" onClick={generateRandomNumber} type="button">
          {buttonText ?? `Generate random ${label.toLowerCase()}`}
        </Button>
      )}
    </div>
  );
};
