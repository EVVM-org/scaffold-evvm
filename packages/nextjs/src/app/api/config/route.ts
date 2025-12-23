import { NextResponse } from 'next/server';

/**
 * API Route: /api/config
 * 
 * Returns EVVM configuration from environment variables at runtime.
 * This allows the frontend to load configuration without rebuilding.
 * 
 * Reads from:
 * - NEXT_PUBLIC_* variables (available in client bundle)
 * - Regular env variables (server-only, safe to expose as intended)
 */
export async function GET() {
  try {
    const config = {
      // Core EVVM configuration
      evvmAddress: process.env.NEXT_PUBLIC_EVVM_ADDRESS || null,
      chainId: process.env.NEXT_PUBLIC_CHAIN_ID ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) : null,
      evvmId: process.env.NEXT_PUBLIC_EVVM_ID ? parseInt(process.env.NEXT_PUBLIC_EVVM_ID) : 0,
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID || null,
      
      // Contract addresses (populated by CLI deployment)
      stakingAddress: process.env.NEXT_PUBLIC_STAKING_ADDRESS || null,
      estimatorAddress: process.env.NEXT_PUBLIC_ESTIMATOR_ADDRESS || null,
      nameServiceAddress: process.env.NEXT_PUBLIC_NAMESERVICE_ADDRESS || null,
      treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || null,
      p2pSwapAddress: process.env.NEXT_PUBLIC_P2PSWAP_ADDRESS || null,
      
      // RPC URLs
      rpcUrlLocalhost: process.env.NEXT_PUBLIC_RPC_URL_LOCALHOST || 'http://localhost:8545',
      rpcUrlEthSepolia: process.env.RPC_URL_ETH_SEPOLIA || 'https://1rpc.io/sepolia',
      rpcUrlArbSepolia: process.env.RPC_URL_ARB_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc',
      
      // Config version for cache invalidation
      configVersion: process.env.NEXT_PUBLIC_CONFIG_VERSION || null,
      
      // Validation
      isConfigured: !!(
        process.env.NEXT_PUBLIC_EVVM_ADDRESS && 
        process.env.NEXT_PUBLIC_CHAIN_ID
      ),
    };

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error loading configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}
