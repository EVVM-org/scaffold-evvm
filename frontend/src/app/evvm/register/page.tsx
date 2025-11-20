'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { writeContract, waitForTransactionReceipt, readContract } from '@wagmi/core';
import { config } from '@/config';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import { EvvmABI } from '@evvm/viem-signature-library';
import styles from '@/styles/pages/Register.module.css';

const REGISTRY_ADDRESS = '0x389dC8fb09211bbDA841D59f4a51160dA2377832' as const;
const REGISTRY_ABI = [
  {
    inputs: [
      { name: 'chainId', type: 'uint256' },
      { name: 'evvmAddress', type: 'address' }
    ],
    name: 'registerEvvm',
    outputs: [{ name: 'evvmID', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'evvmID', type: 'uint256' }],
    name: 'getEvvmIdMetadata',
    outputs: [
      { name: 'chainId', type: 'uint256' },
      { name: 'evvmAddress', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export default function RegisterPage() {
  const { deployment, loading: deploymentLoading, error: deploymentError } = useEvvmDeployment();
  const { address, isConnected } = useAccount();

  const [isRegistering, setIsRegistering] = useState(false);
  const [isSettingId, setIsSettingId] = useState(false);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [currentEvvmId, setCurrentEvvmId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (deployment?.evvm) {
      fetchCurrentEvvmId();
    }
  }, [deployment]);

  const fetchCurrentEvvmId = async () => {
    if (!deployment?.evvm) return;

    try {
      const id = await readContract(config, {
        abi: EvvmABI,
        address: deployment.evvm as `0x${string}`,
        functionName: 'getEvvmID',
      });

      setCurrentEvvmId(id?.toString() || '0');
    } catch (err) {
      console.error('Error fetching EVVM ID:', err);
      setCurrentEvvmId('0');
    }
  };

  const handleRegister = async () => {
    if (!deployment || !isConnected || !address) {
      setError('Please connect your wallet and ensure deployment is loaded');
      return;
    }

    if (address !== deployment.admin) {
      setError('Only the admin can register the EVVM instance');
      return;
    }

    setIsRegistering(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      // Register on EVVM registry (Ethereum Sepolia)
      const hash = await writeContract(config, {
        abi: REGISTRY_ABI,
        address: REGISTRY_ADDRESS,
        functionName: 'registerEvvm',
        args: [BigInt(deployment.chainId), deployment.evvm as `0x${string}`],
        chainId: 11155111,
      });

      setTxHash(hash);

      // Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, { hash, chainId: 11155111 });

      // Extract assigned ID from logs (event emission)
      // In production, you'd parse the event logs to get the exact ID
      // For now, we'll ask the user to check Etherscan
      setSuccess('Registration successful! Check Etherscan for your assigned EVVM ID.');
      setAssignedId(null); // User needs to input the ID from registry
    } catch (err: any) {
      console.error('Error registering EVVM:', err);
      setError(err.message || 'Failed to register EVVM');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSetEvvmId = async () => {
    if (!deployment || !isConnected || !address) {
      setError('Please connect your wallet and ensure deployment is loaded');
      return;
    }

    if (!assignedId) {
      setError('Please enter the assigned EVVM ID from the registry');
      return;
    }

    if (address !== deployment.admin) {
      setError('Only the admin can set the EVVM ID');
      return;
    }

    setIsSettingId(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      // Set EVVM ID on the deployed contract
      const hash = await writeContract(config, {
        abi: EvvmABI,
        address: deployment.evvm as `0x${string}`,
        functionName: 'setEvvmID',
        args: [BigInt(assignedId)],
      });

      setTxHash(hash);

      // Wait for confirmation
      await waitForTransactionReceipt(config, { hash });

      setSuccess(`Successfully activated EVVM with ID ${assignedId}!`);
      setCurrentEvvmId(assignedId);

      // Refresh deployment info
      setTimeout(() => {
        fetchCurrentEvvmId();
      }, 2000);
    } catch (err: any) {
      console.error('Error setting EVVM ID:', err);
      setError(err.message || 'Failed to set EVVM ID');
    } finally {
      setIsSettingId(false);
    }
  };

  if (deploymentLoading) {
    return (
      <div className={styles.container}>
        <h1>EVVM Registration</h1>
        <p>Loading deployment information...</p>
      </div>
    );
  }

  if (deploymentError || !deployment) {
    return (
      <div className={styles.container}>
        <h1>EVVM Registration</h1>
        <div className={styles.error}>
          <p>⚠️ No EVVM deployment found</p>
          <p>Please deploy an EVVM instance first using: <code>npm run wizard</code></p>
        </div>
      </div>
    );
  }

  const isRegistered = currentEvvmId && parseInt(currentEvvmId) >= 1000;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🔐 EVVM Registration & Activation</h1>
        <p>Register your EVVM instance on the official registry and activate it</p>
      </div>

      <div className={styles.infoCard}>
        <h3>Current Deployment Info</h3>
        <div className={styles.infoGrid}>
          <div><strong>Network:</strong> {deployment.networkName}</div>
          <div><strong>EVVM Name:</strong> {deployment.evvmName}</div>
          <div><strong>EVVM Address:</strong> {deployment.evvm}</div>
          <div><strong>Chain ID:</strong> {deployment.chainId}</div>
          <div><strong>Current EVVM ID:</strong> {currentEvvmId || '0 (Not activated)'}</div>
          <div><strong>Admin:</strong> {deployment.admin}</div>
        </div>
      </div>

      {isRegistered && (
        <div className={styles.success}>
          <p>✅ Your EVVM is registered and activated with ID: {currentEvvmId}</p>
          <p>You can now use all EVVM ecosystem features!</p>
        </div>
      )}

      {!isConnected && (
        <div className={styles.warning}>
          <p>⚠️ Please connect your wallet to register and activate your EVVM</p>
        </div>
      )}

      {isConnected && address !== deployment.admin && (
        <div className={styles.warning}>
          <p>⚠️ You are not the admin. Only the admin can register and activate.</p>
          <p><strong>Admin:</strong> {deployment.admin}</p>
          <p><strong>Your address:</strong> {address}</p>
        </div>
      )}

      <div className={styles.formCard}>
        <h2>Step 1: Register on EVVM Registry</h2>
        <p className={styles.helper}>
          This registers your EVVM instance on the official registry contract.
          You will receive an assigned EVVM ID (≥1000).
        </p>

        <div className={styles.registryInfo}>
          <p><strong>Registry Contract:</strong></p>
          <p className={styles.address}>{REGISTRY_ADDRESS}</p>
          <p><strong>Network:</strong> Ethereum Sepolia</p>
          <p><strong>Function:</strong> registerEvvm(chainId: {deployment.chainId}, evvmAddress: {deployment.evvm})</p>
        </div>

        <button
          onClick={handleRegister}
          disabled={!isConnected || isRegistering || address !== deployment.admin || !!isRegistered}
          className={styles.registerButton}
        >
          {isRegistering ? '⏳ Registering...' : '📝 Register EVVM on Sepolia'}
        </button>

        {error && (
          <div className={styles.error}>
            <p>❌ {error}</p>
          </div>
        )}

        {success && !isSettingId && (
          <div className={styles.success}>
            <p>✅ {success}</p>
            {txHash && (
              <p>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Etherscan →
                </a>
              </p>
            )}
            <p className={styles.helper}>
              Check the transaction on Etherscan to find your assigned EVVM ID in the logs/events.
            </p>
          </div>
        )}
      </div>

      <div className={styles.formCard}>
        <h2>Step 2: Activate Your EVVM ID</h2>
        <p className={styles.helper}>
          After registration, enter your assigned EVVM ID here to activate it.
          ⚠️ You have only 1 hour to set the ID after registration, then it becomes permanent.
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="evvmId">Assigned EVVM ID (from registry)</label>
          <input
            id="evvmId"
            type="number"
            placeholder="Enter your assigned EVVM ID (≥1000)"
            value={assignedId || ''}
            onChange={(e) => setAssignedId(e.target.value)}
            className={styles.input}
            min="1000"
          />
          <div className={styles.helper}>
            IDs 1-999 are reserved. Public registrations start from 1000.
          </div>
        </div>

        <button
          onClick={handleSetEvvmId}
          disabled={!isConnected || isSettingId || !assignedId || address !== deployment.admin || !!isRegistered}
          className={styles.activateButton}
        >
          {isSettingId ? '⏳ Activating...' : '🚀 Activate EVVM ID'}
        </button>

        {success && isSettingId && (
          <div className={styles.success}>
            <p>✅ {success}</p>
            {txHash && (
              <p>
                <a
                  href={`https://${deployment.networkName.toLowerCase().includes('sepolia') ? 'sepolia.' : ''}etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Explorer →
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.infoCard}>
        <h3>ℹ️ Registration Requirements</h3>
        <ul>
          <li><strong>ETH Sepolia Required:</strong> You need Sepolia ETH for gas fees (even if EVVM deployed elsewhere)</li>
          <li><strong>Admin Only:</strong> Only the admin address can register and activate</li>
          <li><strong>One-Time Registration:</strong> Each EVVM can only be registered once</li>
          <li><strong>ID Lock:</strong> EVVM ID can only be changed within 1 hour of setting, then permanent</li>
          <li><strong>Public IDs:</strong> IDs 1000+ are for public registrations (1-999 reserved)</li>
          <li><strong>Ecosystem Benefits:</strong> Registration enables service discovery and ecosystem integration</li>
        </ul>
      </div>
    </div>
  );
}
