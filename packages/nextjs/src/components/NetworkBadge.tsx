import styles from '@/styles/components/NetworkBadge.module.css';

interface NetworkBadgeProps {
  chainId: number;
  networkName: string;
}

export function NetworkBadge({ chainId, networkName }: NetworkBadgeProps) {
  const getNetworkClass = (id: number): string => {
    if (id === 11155111) return styles.sepolia;
    if (id === 421614) return styles.arbitrum;
    if (id === 31337) return styles.localhost;
    return styles.unknown;
  };

  return (
    <span className={`${styles.badge} ${getNetworkClass(chainId)}`}>
      {networkName}
    </span>
  );
}
