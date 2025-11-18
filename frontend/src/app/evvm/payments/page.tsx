'use client';

import { useState, useEffect } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { DebugConsole } from '@/components/DebugConsole';
import { loadDeployments, getExplorerTxUrl, type EvvmDeployment } from '@/lib/evvmConfig';
import { getWalletClient, getPublicClient, getCurrentChainId } from '@/lib/viemClients';
import { buildAndSignPay, buildAndSignDispersePay } from '@/lib/evvmSignatures';
import { executePay, executeDispersePay } from '@/lib/evvmExecutors';
import type { DebugEntry, DispersePayRecipient } from '@/types/evvm';
import styles from '@/styles/pages/Payments.module.css';

export default function PaymentsPage() {
  const [deployment, setDeployment] = useState<EvvmDeployment | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'single' | 'disperse'>('single');

  // Single pay state
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('0x0000000000000000000000000000000000000001'); // MATE
  const [priorityFee, setPriorityFee] = useState('0');
  const [nonce, setNonce] = useState('');
  const [priority, setPriority] = useState(false);
  const [executor, setExecutor] = useState('0x0000000000000000000000000000000000000000');

  // Disperse pay state
  const [recipients, setRecipients] = useState<DispersePayRecipient[]>([
    { address: '' as `0x${string}`, amount: 0n },
  ]);

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

  async function handleBuildAndSignPay() {
    if (!deployment || !account || !chainId) {
      addDebugEntry('error', 'Missing Requirements', 'Please connect wallet and ensure deployment exists');
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
        to: recipientAddress,
        token: token as `0x${string}`,
        amount: BigInt(amount),
        priorityFee: BigInt(priorityFee),
        nonce: BigInt(nonce),
        priority,
        executor: executor as `0x${string}`,
      };

      addDebugEntry('info', 'Building pay message', params);

      const { message, signature } = await buildAndSignPay(walletClient, account, params);

      addDebugEntry('request', 'Message Built', message);
      addDebugEntry('response', 'Signature Generated', signature);

      // Auto-execute
      await executeSinglePay(signature, message);
    } catch (error: any) {
      addDebugEntry('error', 'Build & Sign Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function executeSinglePay(signature: `0x${string}`, message: string) {
    if (!deployment || !account || !chainId) return;

    try {
      const walletClient = getWalletClient(chainId);
      const publicClient = getPublicClient(chainId);
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const payData = {
        from: account,
        to_address: recipientAddress.startsWith('0x')
          ? (recipientAddress as `0x${string}`)
          : '0x0000000000000000000000000000000000000000' as `0x${string}`,
        to_identity: recipientAddress.startsWith('0x') ? '' : recipientAddress,
        token: token as `0x${string}`,
        amount: BigInt(amount),
        priorityFee: BigInt(priorityFee),
        nonce: BigInt(nonce),
        priority,
        executor,
        signature,
      };

      addDebugEntry('info', 'Executing pay transaction', payData);

      const txHash = await executePay(walletClient, publicClient, deployment.evvm, payData);

      addDebugEntry('response', 'Transaction Submitted', {
        hash: txHash,
        explorer: getExplorerTxUrl(chainId, txHash),
      });

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      addDebugEntry('response', 'Transaction Confirmed', receipt);
    } catch (error: any) {
      addDebugEntry('error', 'Execution Failed', error.message);
    }
  }

  async function handleBuildAndSignDispersePay() {
    if (!deployment || !account || !chainId) {
      addDebugEntry('error', 'Missing Requirements', 'Please connect wallet and ensure deployment exists');
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
        token: token as `0x${string}`,
        recipients: recipients.map(r => ({
          address: r.address,
          amount: BigInt(r.amount)
        })),
        priorityFee: BigInt(priorityFee),
        nonce: BigInt(nonce),
        priority,
        executor: executor as `0x${string}`,
      };

      addDebugEntry('info', 'Building disperse pay message', params);

      const { message, signature } = await buildAndSignDispersePay(walletClient, account, params);

      addDebugEntry('request', 'Message Built', message);
      addDebugEntry('response', 'Signature Generated', signature);

      // Auto-execute
      await executeDispersePayTx(signature);
    } catch (error: any) {
      addDebugEntry('error', 'Build & Sign Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function executeDispersePayTx(signature: `0x${string}`) {
    if (!deployment || !account || !chainId) return;

    try {
      const walletClient = getWalletClient(chainId);
      const publicClient = getPublicClient(chainId);
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      const disperseData = {
        from: account,
        token: token as `0x${string}`,
        recipients: recipients.map(r => ({
          address: r.address,
          amount: BigInt(r.amount)
        })),
        priorityFee: BigInt(priorityFee),
        nonce: BigInt(nonce),
        priority,
        executor,
        signature,
      };

      addDebugEntry('info', 'Executing disperse pay transaction', disperseData);

      const txHash = await executeDispersePay(walletClient, publicClient, deployment.evvm, disperseData);

      addDebugEntry('response', 'Transaction Submitted', {
        hash: txHash,
        explorer: getExplorerTxUrl(chainId, txHash),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      addDebugEntry('response', 'Transaction Confirmed', receipt);
    } catch (error: any) {
      addDebugEntry('error', 'Execution Failed', error.message);
    }
  }

  function addRecipient() {
    setRecipients([...recipients, { address: '' as `0x${string}`, amount: 0n }]);
  }

  function removeRecipient(index: number) {
    setRecipients(recipients.filter((_, i) => i !== index));
  }

  function updateRecipient(index: number, field: 'address' | 'amount', value: string) {
    const updated = [...recipients];
    if (field === 'address') {
      updated[index].address = value as `0x${string}`;
    } else {
      updated[index].amount = BigInt(value || '0');
    }
    setRecipients(updated);
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
        <h2>EVVM Payments</h2>
        <WalletConnect />
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'single' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('single')}
        >
          Single Pay
        </button>
        <button
          className={activeTab === 'disperse' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('disperse')}
        >
          Disperse Pay
        </button>
      </div>

      {activeTab === 'single' && (
        <div className={styles.form}>
          <h3>Single Payment</h3>
          <div className={styles.formGroup}>
            <label>Recipient (address or username):</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x... or username"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Amount:</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000000000000000"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Token Address:</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="0x0000000000000000000000000000000000000001"
            />
            <small>MATE: 0x...001, ETH: 0x...000</small>
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

          <div className={styles.formGroup}>
            <label>Priority Fee:</label>
            <input
              type="text"
              value={priorityFee}
              onChange={(e) => setPriorityFee(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={priority}
                onChange={(e) => setPriority(e.target.checked)}
              />
              Priority Transaction
            </label>
          </div>

          <div className={styles.formGroup}>
            <label>Executor:</label>
            <input
              type="text"
              value={executor}
              onChange={(e) => setExecutor(e.target.value)}
              placeholder="0x0000000000000000000000000000000000000000"
            />
          </div>

          <button
            onClick={handleBuildAndSignPay}
            disabled={loading || !account}
            className={styles.submitButton}
          >
            {loading ? 'Processing...' : 'Build, Sign & Execute'}
          </button>
        </div>
      )}

      {activeTab === 'disperse' && (
        <div className={styles.form}>
          <h3>Disperse Payment (Multiple Recipients)</h3>

          {recipients.map((recipient, index) => (
            <div key={index} className={styles.recipientRow}>
              <input
                type="text"
                value={recipient.address}
                onChange={(e) => updateRecipient(index, 'address', e.target.value)}
                placeholder="Recipient address"
              />
              <input
                type="text"
                value={recipient.amount.toString()}
                onChange={(e) => updateRecipient(index, 'amount', e.target.value)}
                placeholder="Amount"
              />
              {recipients.length > 1 && (
                <button onClick={() => removeRecipient(index)} className={styles.removeButton}>
                  ✕
                </button>
              )}
            </div>
          ))}

          <button onClick={addRecipient} className={styles.addButton}>
            + Add Recipient
          </button>

          <div className={styles.formGroup}>
            <label>Token Address:</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Nonce:</label>
            <input type="text" value={nonce} onChange={(e) => setNonce(e.target.value)} />
          </div>

          <div className={styles.formGroup}>
            <label>Priority Fee:</label>
            <input
              type="text"
              value={priorityFee}
              onChange={(e) => setPriorityFee(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={priority}
                onChange={(e) => setPriority(e.target.checked)}
              />
              Priority Transaction
            </label>
          </div>

          <button
            onClick={handleBuildAndSignDispersePay}
            disabled={loading || !account}
            className={styles.submitButton}
          >
            {loading ? 'Processing...' : 'Build, Sign & Execute Disperse'}
          </button>
        </div>
      )}

      <DebugConsole entries={debugEntries} onClear={() => setDebugEntries([])} />
    </div>
  );
}
