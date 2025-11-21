'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia, sepolia, baseSepolia } from 'viem/chains';
import { EvvmABI, StakingABI } from '@evvm/viem-signature-library';
import { saveEvvmConfig, loadEvvmConfig, clearEvvmConfig, hasStoredConfig, formatConfigAge, getConfigAge } from '@/lib/evvmConfigStorage';
import styles from '@/styles/pages/Config.module.css';

// Supported chains for configuration
const SUPPORTED_CHAINS = [
  { id: 421614, name: 'Arbitrum Sepolia', chain: arbitrumSepolia },
  { id: 11155111, name: 'Ethereum Sepolia', chain: sepolia },
  { id: 84532, name: 'Base Sepolia', chain: baseSepolia },
];

interface FetchedContracts {
  evvmID: bigint;
  evvmName: string;
  staking: string;
  nameService: string;
  estimator: string;
  admin: string;
  goldenFisher: string;
  // Optional contracts
  treasury?: string;
  p2pSwap?: string;
}

export default function ConfigPage() {
  const [evvmAddress, setEvvmAddress] = useState('');
  const [chainId, setChainId] = useState('421614');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchedContracts, setFetchedContracts] = useState<FetchedContracts | null>(null);
  const [hasConfig, setHasConfig] = useState(false);
  const [configAge, setConfigAge] = useState<string | null>(null);

  // Optional contract addresses (can be filled manually)
  const [treasuryAddress, setTreasuryAddress] = useState('');
  const [p2pSwapAddress, setP2pSwapAddress] = useState('');

  // Check for existing configuration on mount
  useEffect(() => {
    const stored = hasStoredConfig();
    setHasConfig(stored);

    if (stored) {
      const age = getConfigAge();
      if (age !== null) {
        setConfigAge(formatConfigAge(age));
      }

      // Load existing config to show in form
      const config = loadEvvmConfig();
      if (config) {
        setEvvmAddress(config.evvm);
        setChainId(config.chainId.toString());
        setTreasuryAddress(config.treasury || '');
        setP2pSwapAddress(config.p2pSwap || '');
      }
    }
  }, []);

  const handleFetchContracts = async () => {
    if (!evvmAddress || !chainId) {
      setError('Please provide both EVVM address and chain ID');
      return;
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(evvmAddress)) {
      setError('Invalid EVVM address format');
      return;
    }

    setIsFetching(true);
    setError(null);
    setSuccess(null);
    setFetchedContracts(null);

    try {
      // Find the chain configuration
      const selectedChain = SUPPORTED_CHAINS.find((c) => c.id === parseInt(chainId));
      if (!selectedChain) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      console.log('🔍 Fetching contracts for EVVM:', evvmAddress);
      console.log('  Chain:', selectedChain.name, `(${chainId})`);

      // Create public client for the selected chain
      const publicClient = createPublicClient({
        chain: selectedChain.chain,
        transport: http(),
      });

      // Fetch from EVVM contract
      console.log('  Fetching EVVM ID...');
      const evvmID = await publicClient.readContract({
        address: evvmAddress as `0x${string}`,
        abi: EvvmABI,
        functionName: 'getEvvmID',
      });

      console.log('  Fetching EVVM metadata...');
      const evvmMetadata = await publicClient.readContract({
        address: evvmAddress as `0x${string}`,
        abi: EvvmABI,
        functionName: 'getEvvmMetadata',
      });

      console.log('  Fetching staking address...');
      const stakingAddress = await publicClient.readContract({
        address: evvmAddress as `0x${string}`,
        abi: EvvmABI,
        functionName: 'getStakingContractAddress',
      });

      console.log('  Fetching name service address...');
      const nameServiceAddress = await publicClient.readContract({
        address: evvmAddress as `0x${string}`,
        abi: EvvmABI,
        functionName: 'getNameServiceAddress',
      });

      console.log('  Fetching current admin...');
      const adminAddress = await publicClient.readContract({
        address: evvmAddress as `0x${string}`,
        abi: EvvmABI,
        functionName: 'getCurrentAdmin',
      });

      // Fetch from Staking contract
      console.log('  Fetching estimator address from staking...');
      const estimatorAddress = await publicClient.readContract({
        address: stakingAddress as `0x${string}`,
        abi: StakingABI,
        functionName: 'getEstimatorAddress',
      });

      console.log('  Fetching golden fisher address from staking...');
      const goldenFisherAddress = await publicClient.readContract({
        address: stakingAddress as `0x${string}`,
        abi: StakingABI,
        functionName: 'getGoldenFisher',
      });

      const contracts: FetchedContracts = {
        evvmID: evvmID as bigint,
        evvmName: (evvmMetadata as any)[0] as string,
        staking: stakingAddress as string,
        nameService: nameServiceAddress as string,
        estimator: estimatorAddress as string,
        admin: adminAddress as string,
        goldenFisher: goldenFisherAddress as string,
      };

      console.log('✅ Successfully fetched contracts:');
      console.log('  EVVM ID:', contracts.evvmID.toString());
      console.log('  EVVM Name:', contracts.evvmName);
      console.log('  Staking:', contracts.staking);
      console.log('  NameService:', contracts.nameService);
      console.log('  Estimator:', contracts.estimator);
      console.log('  Admin:', contracts.admin);
      console.log('  Golden Fisher:', contracts.goldenFisher);

      setFetchedContracts(contracts);
      setSuccess('Successfully fetched contract addresses!');
    } catch (err: any) {
      console.error('Error fetching contracts:', err);
      setError(err.message || 'Failed to fetch contracts');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveConfiguration = () => {
    if (!fetchedContracts) {
      setError('Please fetch contracts first');
      return;
    }

    try {
      const selectedChain = SUPPORTED_CHAINS.find((c) => c.id === parseInt(chainId));

      const deploymentConfig = {
        chainId: parseInt(chainId),
        networkName: selectedChain?.name || 'Unknown Network',
        evvm: evvmAddress.toLowerCase() as `0x${string}`,
        nameService: fetchedContracts.nameService.toLowerCase() as `0x${string}`,
        staking: fetchedContracts.staking.toLowerCase() as `0x${string}`,
        estimator: fetchedContracts.estimator.toLowerCase() as `0x${string}`,
        treasury: (treasuryAddress.toLowerCase() || '0x0000000000000000000000000000000000000000') as `0x${string}`,
        p2pSwap: (p2pSwapAddress.toLowerCase() || '0x0000000000000000000000000000000000000000') as `0x${string}`,
        evvmID: Number(fetchedContracts.evvmID),
        evvmName: fetchedContracts.evvmName,
        registry: '0x389dC8fb09211bbDA841D59f4a51160dA2377832' as `0x${string}`,
        admin: fetchedContracts.admin.toLowerCase() as `0x${string}`,
        goldenFisher: fetchedContracts.goldenFisher.toLowerCase() as `0x${string}`,
        activator: fetchedContracts.admin.toLowerCase() as `0x${string}`,
      };

      // Save to localStorage
      saveEvvmConfig(deploymentConfig);

      setSuccess('Configuration saved successfully! You can now use all EVVM features with this instance.');
      setHasConfig(true);
      setConfigAge('just now');

      console.log('✅ Configuration saved:', deploymentConfig);
    } catch (err: any) {
      console.error('Error saving configuration:', err);
      setError(err.message || 'Failed to save configuration');
    }
  };

  const handleClearConfiguration = () => {
    try {
      clearEvvmConfig();

      // Reset form fields
      setEvvmAddress('');
      setChainId('421614');
      setTreasuryAddress('');
      setP2pSwapAddress('');
      setFetchedContracts(null);
      setHasConfig(false);
      setConfigAge(null);
      setSuccess('Configuration cleared! You can now configure a different EVVM instance.');
      setError(null);

      console.log('🗑️  Configuration cleared');
    } catch (err: any) {
      console.error('Error clearing configuration:', err);
      setError(err.message || 'Failed to clear configuration');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>⚙️ EVVM Configuration</h1>
        <p>Connect to an existing EVVM deployment by providing the core contract address</p>
      </div>

      {hasConfig && (
        <div className={styles.infoCard}>
          <h3>Current Configuration Status</h3>
          <p>✅ You have a saved EVVM configuration (saved {configAge})</p>
          <p className={styles.helper}>
            You can clear this configuration to load a different EVVM instance without restarting the server.
          </p>
          <button onClick={handleClearConfiguration} className={styles.clearButton}>
            🗑️ Clear Configuration
          </button>
        </div>
      )}

      <div className={styles.formCard}>
        <h2>Input Configuration</h2>

        <div className={styles.formGroup}>
          <label htmlFor="evvmAddress">EVVM Core Contract Address</label>
          <input
            id="evvmAddress"
            type="text"
            placeholder="0x..."
            value={evvmAddress}
            onChange={(e) => setEvvmAddress(e.target.value)}
            className={styles.input}
          />
          <div className={styles.helper}>
            <small>The main EVVM contract address on the target chain</small>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="chainId">Chain ID</label>
          <select
            id="chainId"
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            className={styles.select}
          >
            {SUPPORTED_CHAINS.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name} ({chain.id})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleFetchContracts}
          disabled={isFetching || !evvmAddress}
          className={styles.fetchButton}
        >
          {isFetching ? '⏳ Fetching...' : '🔍 Fetch Contracts'}
        </button>

        {error && (
          <div className={styles.error}>
            <p>❌ {error}</p>
          </div>
        )}

        {success && (
          <div className={styles.success}>
            <p>✅ {success}</p>
          </div>
        )}
      </div>

      {fetchedContracts && (
        <>
          <div className={styles.resultsCard}>
            <h2>Fetched Contracts</h2>

            <div className={styles.contractsList}>
              <div className={styles.contractItem}>
                <strong>EVVM ID:</strong>
                <code>{fetchedContracts.evvmID.toString()}</code>
              </div>

              <div className={styles.contractItem}>
                <strong>EVVM Name:</strong>
                <code>{fetchedContracts.evvmName}</code>
              </div>

              <div className={styles.contractItem}>
                <strong>Core (EVVM):</strong>
                <code>{evvmAddress}</code>
              </div>

              <div className={styles.contractItem}>
                <strong>Staking:</strong>
                <code>{fetchedContracts.staking}</code>
              </div>

              <div className={styles.contractItem}>
                <strong>Name Service:</strong>
                <code>{fetchedContracts.nameService}</code>
              </div>

              <div className={styles.contractItem}>
                <strong>Estimator:</strong>
                <code>{fetchedContracts.estimator}</code>
              </div>

              <div className={styles.contractItem}>
                <strong>Admin:</strong>
                <code>{fetchedContracts.admin}</code>
              </div>

              <div className={styles.contractItem}>
                <strong>Golden Fisher:</strong>
                <code>{fetchedContracts.goldenFisher}</code>
              </div>
            </div>
          </div>

          <div className={styles.formCard}>
            <h2>Optional Contracts</h2>
            <p className={styles.helper}>
              Treasury and P2P Swap addresses cannot be fetched automatically. Provide them manually if needed.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="treasury">Treasury Address (Optional)</label>
              <input
                id="treasury"
                type="text"
                placeholder="0x... (optional)"
                value={treasuryAddress}
                onChange={(e) => setTreasuryAddress(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="p2pSwap">P2P Swap Address (Optional)</label>
              <input
                id="p2pSwap"
                type="text"
                placeholder="0x... (optional)"
                value={p2pSwapAddress}
                onChange={(e) => setP2pSwapAddress(e.target.value)}
                className={styles.input}
              />
            </div>

            <button onClick={handleSaveConfiguration} className={styles.saveButton}>
              💾 Save Configuration
            </button>
          </div>
        </>
      )}

      <div className={styles.infoCard}>
        <h3>ℹ️ How It Works</h3>
        <ul>
          <li>
            <strong>Automatic Fetching:</strong> The tool queries the EVVM and Staking contracts to fetch related
            addresses
          </li>
          <li>
            <strong>No Deployment Needed:</strong> Connect to existing deployments without running deployment scripts
          </li>
          <li>
            <strong>Chain Support:</strong> Works with Arbitrum Sepolia, Ethereum Sepolia, and Base Sepolia
          </li>
          <li>
            <strong>Optional Contracts:</strong> Treasury and P2P Swap must be provided manually if needed
          </li>
        </ul>
      </div>
    </div>
  );
}
