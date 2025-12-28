'use client';

import { useEffect, useState, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { createPublicClient, http, formatEther, type Block, type Transaction } from 'viem';
import { hardhat } from 'viem/chains';
import { useDebug } from '@/context/DebugContext';
import { DebugConsole } from './DebugConsole';
import styles from '@/styles/components/BlockchainMonitor.module.css';

interface BlockchainMonitorProps {
  enabled?: boolean;
  showConsole?: boolean;
}

export function BlockchainMonitor({ enabled = true, showConsole = true }: BlockchainMonitorProps) {
  const chainId = useChainId();
  const { entries, logBlock, logTransaction, logInfo, clearEntries } = useDebug();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastBlockNumber, setLastBlockNumber] = useState<bigint | null>(null);
  const [blockCount, setBlockCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [rpcUrl, setRpcUrl] = useState('http://127.0.0.1:8545');

  // Only monitor on localhost chain
  const isLocalChain = chainId === 31337;

  const fetchNewBlocks = useCallback(async () => {
    if (!isMonitoring || !isLocalChain) return;

    try {
      const client = createPublicClient({
        chain: { ...hardhat, id: chainId },
        transport: http(rpcUrl),
      });

      const currentBlockNumber = await client.getBlockNumber();

      if (lastBlockNumber === null) {
        setLastBlockNumber(currentBlockNumber);
        logInfo('Blockchain Monitor', {
          message: 'Connected to local blockchain',
          blockNumber: currentBlockNumber.toString(),
          rpcUrl,
        });
        return;
      }

      // Check for new blocks
      if (currentBlockNumber > lastBlockNumber) {
        for (let i = lastBlockNumber + 1n; i <= currentBlockNumber; i++) {
          const block = await client.getBlock({ blockNumber: i, includeTransactions: true });

          setBlockCount(prev => prev + 1);

          logBlock(
            `Block #${block.number}`,
            {
              number: block.number?.toString(),
              hash: block.hash,
              timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
              gasUsed: block.gasUsed?.toString(),
              gasLimit: block.gasLimit?.toString(),
              transactionCount: block.transactions.length,
              miner: block.miner,
            },
            Number(block.number)
          );

          // Log each transaction in the block
          if (block.transactions && block.transactions.length > 0) {
            for (const tx of block.transactions) {
              if (typeof tx === 'object') {
                setTxCount(prev => prev + 1);

                const txDetails = {
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to || 'Contract Creation',
                  value: formatEther(tx.value) + ' ETH',
                  gasPrice: tx.gasPrice?.toString(),
                  nonce: tx.nonce,
                  input: tx.input.length > 66
                    ? tx.input.slice(0, 66) + '...'
                    : tx.input,
                };

                logTransaction(
                  tx.to ? `TX to ${tx.to.slice(0, 10)}...` : 'Contract Deployment',
                  txDetails,
                  tx.hash
                );
              }
            }
          }
        }
        setLastBlockNumber(currentBlockNumber);
      }
    } catch (error: any) {
      // Silently ignore connection errors during polling
      if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
        // Local blockchain not running, that's ok
      } else {
        console.error('[EVVM] Blockchain monitor error:', error.message);
      }
    }
  }, [isMonitoring, isLocalChain, lastBlockNumber, chainId, rpcUrl, logBlock, logTransaction, logInfo]);

  // Poll for new blocks
  useEffect(() => {
    if (!isMonitoring || !isLocalChain) return;

    // Initial fetch
    fetchNewBlocks();

    // Set up polling interval (every 1 second)
    const interval = setInterval(fetchNewBlocks, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, isLocalChain, fetchNewBlocks]);

  // Auto-start monitoring when enabled and on local chain
  useEffect(() => {
    if (enabled && isLocalChain) {
      setIsMonitoring(true);
    } else {
      setIsMonitoring(false);
    }
  }, [enabled, isLocalChain]);

  // Don't render anything if not on local chain
  if (!isLocalChain) {
    return null;
  }

  return (
    <div className={styles.monitor}>
      <div className={styles.header}>
        <h4 className={styles.title}>Blockchain Monitor</h4>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Blocks:</span>
            <span className={styles.statValue}>{blockCount}</span>
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>TXs:</span>
            <span className={styles.statValue}>{txCount}</span>
          </span>
          <span className={`${styles.status} ${isMonitoring ? styles.active : styles.inactive}`}>
            {isMonitoring ? 'Monitoring' : 'Paused'}
          </span>
        </div>
        <div className={styles.controls}>
          <button
            className={`${styles.button} ${isMonitoring ? styles.stopButton : styles.startButton}`}
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {showConsole && (
        <DebugConsole
          entries={entries}
          onClear={clearEntries}
          title="Blockchain Events"
          maxHeight="400px"
        />
      )}
    </div>
  );
}
