'use client';

import { useEffect, useState } from 'react';
import { loadEvvmConfig, clearEvvmConfig } from '@/lib/evvmConfigStorage';

export default function DebugConfigPage() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const loaded = loadEvvmConfig();
    setConfig(loaded);
  }, []);

  const handleClear = () => {
    clearEvvmConfig();
    window.location.reload();
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Debug: Current Configuration</h1>
      
      <button 
        onClick={handleClear}
        style={{
          padding: '1rem',
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          marginBottom: '2rem'
        }}
      >
        Clear Configuration & Reload
      </button>

      <h2>localStorage Configuration:</h2>
      <pre style={{
        backgroundColor: '#1e293b',
        color: '#e2e8f0',
        padding: '1rem',
        borderRadius: '0.375rem',
        overflow: 'auto'
      }}>
        {config ? JSON.stringify(config, null, 2) : 'No configuration found'}
      </pre>

      <h2>Expected Configuration:</h2>
      <pre style={{
        backgroundColor: '#064e3b',
        color: '#d1fae5',
        padding: '1rem',
        borderRadius: '0.375rem',
        overflow: 'auto'
      }}>
{`{
  "chainId": 11155111,
  "networkName": "Ethereum Sepolia",
  "evvm": "0xe08942c436874411161fe76e628c91daf9e2dcd6",
  "nameService": "0x964a3da97683b2aad5a4f90388606df7b91bc5b1",
  "staking": "0xbb7948e571996eba66f949059da7ad91868cd0aa",
  "estimator": "0xdeb54db41b77143b3eb96e12c38411d42dba6b46",
  "treasury": "0xdcaece20ede6e23bc4f5b1aae3f42cc47c818fab",
  "p2pSwap": "0x1b45da2d95ad8180d60616b668f44ac8dc457504",
  "evvmID": 1068,
  "evvmName": "EVVM",
  "admin": "0x9c77c6fafc1eb0821f1de12972ef0199c97c6e45",
  "goldenFisher": "0x9c77c6fafc1eb0821f1de12972ef0199c97c6e45",
  "activator": "0x9c77c6fafc1eb0821f1de12972ef0199c97c6e45"
}`}
      </pre>

      <h2>Instructions:</h2>
      <ol style={{ lineHeight: '2' }}>
        <li>If the configurations don't match, click "Clear Configuration & Reload"</li>
        <li>Go to <a href="/config" style={{ color: '#3b82f6' }}>/config</a> page</li>
        <li>Enter EVVM address: <code>0xe08942c436874411161fe76e628c91daf9e2dcd6</code></li>
        <li>Select chain: Ethereum Sepolia</li>
        <li>Click "Fetch Contracts"</li>
        <li>Verify EVVM ID shows as 1068</li>
        <li>Click "Save Configuration"</li>
        <li>Try golden staking again</li>
      </ol>
    </div>
  );
}
