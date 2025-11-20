'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { type Address, isAddress } from 'viem';
import { NetworkBadge } from '@/components/NetworkBadge';
import { NetworkWarning } from '@/components/NetworkWarning';
import { useEvvmDeployment } from '@/hooks/useEvvmDeployment';
import {
  useTokenMetadata,
  useTokenBalance,
  useTokenAllowance,
  useTokenApprove,
  useValidateToken,
} from '@/hooks/useERC20Token';
import {
  useTreasuryDeposit,
  useTreasuryWithdraw,
  useNeedsApproval,
} from '@/hooks/useTreasury';
import {
  getCachedToken,
  cacheToken,
  getCachedTokensByChain,
  clearTokenCache,
  type CachedToken,
} from '@/utils/tokenCache';
import { getExplorerUrl } from '@/lib/evvmConfig';
import styles from '@/styles/pages/Treasury.module.css';

export default function TreasuryPage() {
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const { deployment, loading: deploymentLoading } = useEvvmDeployment();

  // Token input and discovery
  const [tokenInput, setTokenInput] = useState('');
  const [selectedToken, setSelectedToken] = useState<Address | undefined>(undefined);
  const [cachedTokens, setCachedTokens] = useState<CachedToken[]>([]);

  // Amounts
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Token validation and metadata
  const validation = useValidateToken(tokenInput);
  const tokenMetadata = useTokenMetadata(selectedToken);

  // Balances
  const walletBalance = useTokenBalance(selectedToken);
  const allowance = useTokenAllowance(
    selectedToken,
    deployment?.treasury as Address | undefined
  );

  // Actions
  const approve = useTokenApprove(selectedToken);
  const deposit = useTreasuryDeposit(
    deployment?.treasury as Address | undefined,
    selectedToken
  );
  const withdraw = useTreasuryWithdraw(
    deployment?.treasury as Address | undefined,
    selectedToken
  );

  const needsApproval = useNeedsApproval(allowance.formatted, depositAmount);

  // Load cached tokens on mount
  useEffect(() => {
    if (chainId) {
      loadCachedTokens();
    }
  }, [chainId]);

  // Auto-refetch after successful transactions
  useEffect(() => {
    if (approve.isSuccess) {
      setTimeout(() => {
        allowance.refetch();
      }, 1000);
    }
  }, [approve.isSuccess]);

  useEffect(() => {
    if (deposit.isSuccess) {
      setTimeout(() => {
        walletBalance.refetch();
        allowance.refetch();
        setDepositAmount('');
      }, 1000);
    }
  }, [deposit.isSuccess]);

  useEffect(() => {
    if (withdraw.isSuccess) {
      setTimeout(() => {
        walletBalance.refetch();
        setWithdrawAmount('');
      }, 1000);
    }
  }, [withdraw.isSuccess]);

  const loadCachedTokens = () => {
    if (!chainId) return;
    const tokens = getCachedTokensByChain(chainId);
    setCachedTokens(tokens);
  };

  const handleGetTokenInfo = () => {
    if (!tokenInput || !isAddress(tokenInput)) {
      alert('Please enter a valid token address');
      return;
    }

    setSelectedToken(tokenInput as Address);
  };

  const handleSelectCachedToken = (token: CachedToken) => {
    setTokenInput(token.address);
    setSelectedToken(token.address);
  };

  const handleCacheToken = () => {
    if (!selectedToken || !tokenMetadata.metadata || !chainId) return;

    cacheToken({
      address: tokenMetadata.metadata.address,
      name: tokenMetadata.metadata.name,
      symbol: tokenMetadata.metadata.symbol,
      decimals: tokenMetadata.metadata.decimals,
      chainId,
    });

    loadCachedTokens();
    alert('Token cached successfully!');
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached tokens?')) {
      clearTokenCache();
      loadCachedTokens();
    }
  };

  const handleApprove = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }

    if (!deployment?.treasury) {
      alert('Treasury address not found');
      return;
    }

    approve.approve(deployment.treasury as Address, depositAmount);
  };

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }

    deposit.deposit(depositAmount);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid withdraw amount');
      return;
    }

    withdraw.withdraw(withdrawAmount);
  };

  const handleMaxDeposit = () => {
    if (walletBalance.formatted) {
      setDepositAmount(walletBalance.formatted);
    }
  };

  if (deploymentLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading deployment...</div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>No EVVM Deployment Found</h2>
          <p>Please deploy an EVVM instance first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>💰 Treasury</h1>
        <p>Deposit and withdraw ERC20 tokens to your EVVM instance</p>
        <NetworkBadge chainId={deployment.chainId} networkName={deployment.networkName} />
      </div>

      {deployment.chainId !== chainId && <NetworkWarning deployment={deployment} />}

      {!isConnected && (
        <div className={styles.warning}>
          <p>⚠️ Please connect your wallet to use the Treasury</p>
        </div>
      )}

      {/* Treasury Info */}
      <div className={styles.section}>
        <h2>📋 Treasury Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Treasury Address:</span>
            <a
              href={getExplorerUrl(deployment.chainId, deployment.treasury)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {deployment.treasury}
            </a>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>EVVM Address:</span>
            <a
              href={getExplorerUrl(deployment.chainId, deployment.evvm)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {deployment.evvm}
            </a>
          </div>
        </div>
      </div>

      {/* Token Discovery */}
      <div className={styles.section}>
        <h2>🔍 Select Token</h2>

        <div className={styles.tokenInput}>
          <label>Token Contract Address</label>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="0x..."
              className={styles.input}
              disabled={!isConnected}
            />
            <button
              onClick={handleGetTokenInfo}
              disabled={!tokenInput || !isConnected || validation.isLoading}
              className={styles.button}
            >
              {validation.isLoading ? 'Loading...' : 'Get Info'}
            </button>
          </div>

          {validation.error && (
            <div className={styles.error}>
              <p>❌ {validation.error}</p>
            </div>
          )}

          {validation.isValid && validation.metadata && (
            <div className={styles.tokenInfo}>
              <h3>✅ Token Found</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Name:</span>
                  <span>{validation.metadata.name}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Symbol:</span>
                  <span>{validation.metadata.symbol}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Decimals:</span>
                  <span>{validation.metadata.decimals}</span>
                </div>
              </div>
              <button onClick={handleCacheToken} className={styles.buttonSecondary}>
                💾 Save to Cache
              </button>
            </div>
          )}
        </div>

        {/* Cached Tokens */}
        {cachedTokens.length > 0 && (
          <div className={styles.cachedTokens}>
            <div className={styles.cacheHeader}>
              <h3>📦 Cached Tokens ({cachedTokens.length})</h3>
              <button onClick={loadCachedTokens} className={styles.buttonSmall}>
                🔄 Refresh
              </button>
              <button onClick={handleClearCache} className={styles.buttonSmall}>
                🗑️ Clear All
              </button>
            </div>
            <div className={styles.tokenList}>
              {cachedTokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => handleSelectCachedToken(token)}
                  className={`${styles.tokenCard} ${
                    selectedToken === token.address ? styles.selected : ''
                  }`}
                >
                  <div className={styles.tokenSymbol}>{token.symbol}</div>
                  <div className={styles.tokenName}>{token.name}</div>
                  <div className={styles.tokenAddress}>
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Balance & Operations */}
      {selectedToken && tokenMetadata.metadata && isConnected && (
        <>
          {/* Balance */}
          <div className={styles.section}>
            <h2>💳 Your Balance</h2>
            <div className={styles.balanceCard}>
              <div className={styles.balanceAmount}>
                {walletBalance.isLoading ? (
                  'Loading...'
                ) : (
                  <>
                    {parseFloat(walletBalance.formatted).toFixed(4)}{' '}
                    {tokenMetadata.metadata.symbol}
                  </>
                )}
              </div>
              <div className={styles.balanceLabel}>Wallet Balance</div>
            </div>
          </div>

          {/* Deposit */}
          <div className={styles.section}>
            <h2>⬇️ Deposit</h2>

            <div className={styles.form}>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.0"
                  className={styles.input}
                  step="any"
                  min="0"
                />
                <button onClick={handleMaxDeposit} className={styles.buttonSmall}>
                  Max
                </button>
              </div>

              <div className={styles.allowanceInfo}>
                <span>Current Allowance:</span>
                <span>
                  {parseFloat(allowance.formatted).toFixed(4)} {tokenMetadata.metadata.symbol}
                </span>
              </div>

              <div className={styles.buttonGroup}>
                {needsApproval ? (
                  <button
                    onClick={handleApprove}
                    disabled={
                      !depositAmount ||
                      approve.isPending ||
                      approve.isConfirming ||
                      parseFloat(depositAmount) <= 0
                    }
                    className={styles.button}
                  >
                    {approve.isPending || approve.isConfirming
                      ? 'Approving...'
                      : `Approve ${tokenMetadata.metadata.symbol}`}
                  </button>
                ) : (
                  <button
                    onClick={handleDeposit}
                    disabled={
                      !depositAmount ||
                      deposit.isPending ||
                      deposit.isConfirming ||
                      parseFloat(depositAmount) <= 0 ||
                      parseFloat(depositAmount) > parseFloat(walletBalance.formatted)
                    }
                    className={styles.button}
                  >
                    {deposit.isPending || deposit.isConfirming
                      ? 'Depositing...'
                      : 'Deposit to Treasury'}
                  </button>
                )}
              </div>

              {approve.isSuccess && (
                <div className={styles.success}>
                  ✅ Approval successful! You can now deposit.
                </div>
              )}

              {deposit.isSuccess && (
                <div className={styles.success}>
                  ✅ Deposit successful!
                  {deposit.hash && (
                    <a
                      href={getExplorerUrl(chainId!, deposit.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      View transaction
                    </a>
                  )}
                </div>
              )}

              {(approve.error || deposit.error) && (
                <div className={styles.error}>
                  ❌ {(approve.error || deposit.error)?.message}
                </div>
              )}
            </div>
          </div>

          {/* Withdraw */}
          <div className={styles.section}>
            <h2>⬆️ Withdraw</h2>

            <div className={styles.form}>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                className={styles.input}
                step="any"
                min="0"
              />

              <button
                onClick={handleWithdraw}
                disabled={
                  !withdrawAmount ||
                  withdraw.isPending ||
                  withdraw.isConfirming ||
                  parseFloat(withdrawAmount) <= 0
                }
                className={styles.button}
              >
                {withdraw.isPending || withdraw.isConfirming
                  ? 'Withdrawing...'
                  : 'Withdraw from Treasury'}
              </button>

              {withdraw.isSuccess && (
                <div className={styles.success}>
                  ✅ Withdrawal successful!
                  {withdraw.hash && (
                    <a
                      href={getExplorerUrl(chainId!, withdraw.hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      View transaction
                    </a>
                  )}
                </div>
              )}

              {withdraw.error && (
                <div className={styles.error}>❌ {withdraw.error.message}</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Help */}
      <div className={styles.section}>
        <h2>ℹ️ How it Works</h2>
        <ol className={styles.steps}>
          <li>
            <strong>Enter Token Address</strong> - Input the contract address of any ERC20
            token
          </li>
          <li>
            <strong>Get Token Info</strong> - Fetch token metadata (name, symbol, decimals)
          </li>
          <li>
            <strong>Cache Token</strong> - Save token info for quick access later
          </li>
          <li>
            <strong>Check Balance</strong> - See how much of the token you have
          </li>
          <li>
            <strong>Approve</strong> - Allow Treasury contract to spend your tokens
          </li>
          <li>
            <strong>Deposit</strong> - Transfer tokens to the EVVM Treasury
          </li>
          <li>
            <strong>Use in EVVM</strong> - Tokens are now available for payments in your
            EVVM
          </li>
        </ol>
      </div>
    </div>
  );
}
