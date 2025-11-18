'use client';

import { useState, useEffect } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { DebugConsole } from '@/components/DebugConsole';
import { loadDeployments, getExplorerTxUrl, type EvvmDeployment } from '@/lib/evvmConfig';
import { getWalletClient, getPublicClient, getCurrentChainId } from '@/lib/viemClients';
import { buildAndSignPreRegister, buildAndSignRegister } from '@/lib/evvmSignatures';
import { readUsernameOwner } from '@/lib/evvmExecutors';
import type { DebugEntry } from '@/types/evvm';
import styles from '@/styles/pages/NameService.module.css';

// Note: This page demonstrates signature building
// Full execution requires NameService ABI implementation

export default function NameServicePage() {
  const [deployment, setDeployment] = useState<EvvmDeployment | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'preregister' | 'register' | 'lookup'>('lookup');

  const [username, setUsername] = useState('');
  const [nonce, setNonce] = useState('');
  const [lookupUsername, setLookupUsername] = useState('');
  const [lookupResult, setLookupResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDeploymentData();
    checkWalletConnection();
  }, []);

  async function loadDeploymentData() {
    try {
      const deployments = await loadDeployments();
      if (deployments.length > 0) {
        setDeployment(deployments[0]);
      }
    } catch (error) {
      addDebugEntry('error', 'Failed to load deployment', error);
    }
  }

  async function checkWalletConnection() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const currentChainId = await getCurrentChainId();
          setChainId(currentChainId);
        }
      }
    } catch (error) {
      console.error('Failed to check wallet:', error);
    }
  }

  function addDebugEntry(type: DebugEntry['type'], label: string, payload: any) {
    setDebugEntries((prev) => [
      ...prev,
      { type, label, payload, timestamp: Date.now() },
    ]);
  }

  async function handlePreRegister() {
    if (!deployment || !account || !chainId) {
      addDebugEntry('error', 'Missing Requirements', 'Please connect wallet');
      return;
    }

    setLoading(true);
    try {
      const walletClient = getWalletClient(chainId);
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const params = {
        evvmID: BigInt(deployment.evvmID),
        username,
        nonce: BigInt(nonce),
      };

      addDebugEntry('info', 'Building pre-registration message', params);

      const { message, signature } = await buildAndSignPreRegister(walletClient, account, params);

      addDebugEntry('request', 'Pre-Register Message Built', message);
      addDebugEntry('response', 'Signature Generated', signature);

      addDebugEntry('info', 'Pre-Registration Complete', {
        note: 'Use this signature with the NameService contract preRegisterIdentity function',
      });
    } catch (error: any) {
      addDebugEntry('error', 'Pre-Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!deployment || !account || !chainId) {
      addDebugEntry('error', 'Missing Requirements', 'Please connect wallet');
      return;
    }

    setLoading(true);
    try {
      const walletClient = getWalletClient(chainId);
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const params = {
        evvmID: BigInt(deployment.evvmID),
        username,
        nonce: BigInt(nonce),
      };

      addDebugEntry('info', 'Building registration message', params);

      const { message, signature } = await buildAndSignRegister(walletClient, account, params);

      addDebugEntry('request', 'Register Message Built', message);
      addDebugEntry('response', 'Signature Generated', signature);

      addDebugEntry('info', 'Registration Complete', {
        note: 'Use this signature with the NameService contract registerIdentity function',
      });
    } catch (error: any) {
      addDebugEntry('error', 'Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup() {
    if (!deployment || !chainId) {
      addDebugEntry('error', 'Missing Requirements', 'Deployment not loaded');
      return;
    }

    setLoading(true);
    try {
      const publicClient = getPublicClient(chainId);
      const owner = await readUsernameOwner(publicClient, deployment.nameService, lookupUsername);

      setLookupResult(owner);
      addDebugEntry('response', 'Username Lookup', { username: lookupUsername, owner });
    } catch (error: any) {
      addDebugEntry('error', 'Lookup Failed', error.message);
      setLookupResult('Not found or error');
    } finally {
      setLoading(false);
    }
  }

  if (!deployment) {
    return (
      <div className={styles.container}>
        <WalletConnect />
        <div className={styles.error}>No EVVM deployment found.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>EVVM Name Service</h2>
        <WalletConnect />
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'lookup' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('lookup')}
        >
          Username Lookup
        </button>
        <button
          className={activeTab === 'preregister' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('preregister')}
        >
          Pre-Register
        </button>
        <button
          className={activeTab === 'register' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('register')}
        >
          Register
        </button>
      </div>

      {activeTab === 'lookup' && (
        <div className={styles.form}>
          <h3>Look Up Username</h3>
          <div className={styles.formGroup}>
            <label>Username:</label>
            <input
              type="text"
              value={lookupUsername}
              onChange={(e) => setLookupUsername(e.target.value)}
              placeholder="myusername"
            />
          </div>

          <button onClick={handleLookup} disabled={loading} className={styles.submitButton}>
            {loading ? 'Looking up...' : 'Look Up'}
          </button>

          {lookupResult && (
            <div className={styles.result}>
              <p><strong>Owner:</strong> {lookupResult}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'preregister' && (
        <div className={styles.form}>
          <h3>Pre-Register Username</h3>
          <p className={styles.description}>
            Pre-registration reserves a username. You must pre-register before you can register.
          </p>

          <div className={styles.formGroup}>
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="myusername"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Nonce:</label>
            <input
              type="text"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              placeholder="0"
            />
          </div>

          <button
            onClick={handlePreRegister}
            disabled={loading || !account}
            className={styles.submitButton}
          >
            {loading ? 'Processing...' : 'Build & Sign Pre-Registration'}
          </button>
        </div>
      )}

      {activeTab === 'register' && (
        <div className={styles.form}>
          <h3>Register Username</h3>
          <p className={styles.description}>
            Complete registration after pre-registration. This finalizes your username ownership.
          </p>

          <div className={styles.formGroup}>
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="myusername"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Nonce:</label>
            <input
              type="text"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              placeholder="0"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={loading || !account}
            className={styles.submitButton}
          >
            {loading ? 'Processing...' : 'Build & Sign Registration'}
          </button>
        </div>
      )}

      <section className={styles.info}>
        <h3>About Name Service</h3>
        <p>
          The EVVM Name Service allows you to register human-readable usernames that can be used
          instead of addresses in transactions.
        </p>
        <ul>
          <li>Pre-register a username to reserve it</li>
          <li>Complete registration to finalize ownership</li>
          <li>Use usernames in payment transactions</li>
          <li>Usernames are resolved via the NameService contract</li>
        </ul>
      </section>

      <DebugConsole entries={debugEntries} onClear={() => setDebugEntries([])} />
    </div>
  );
}
