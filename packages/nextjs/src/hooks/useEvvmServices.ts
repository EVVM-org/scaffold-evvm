'use client';

import { useCallback } from 'react';
import { EVVM, NameService, Staking, P2PSwap, type ISigner } from '@evvm/evvm-js';
import { useEvvmSigner } from './useEvvmSigner';
import { useEvvmDeployment } from './useEvvmDeployment';

type HexString = `0x${string}`;

export interface EvvmServices {
  evvm: EVVM;
  staking: Staking;
  nameService: NameService;
  p2pSwap: P2PSwap;
  signer: ISigner;
}

/**
 * Hook to create EVVM service instances
 * Uses the connected wallet and deployed contract addresses
 */
export function useEvvmServices() {
  const { getSigner, isConnected, address } = useEvvmSigner();
  const { deployment, loading: deploymentLoading, error: deploymentError } = useEvvmDeployment();

  /**
   * Get all EVVM service instances
   * Returns EVVM, Staking, NameService, and P2PSwap services
   */
  const getServices = useCallback(async (): Promise<EvvmServices> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!deployment) {
      throw new Error('EVVM deployment not loaded');
    }

    const { evvm: evvmAddress, staking, nameService, p2pSwap } = deployment;

    if (!evvmAddress) {
      throw new Error('EVVM contract address not configured');
    }

    const signer = await getSigner();
    const chainId = await signer.getChainId();

    return {
      evvm: new EVVM({ signer, address: evvmAddress as HexString, chainId }),
      staking: new Staking({ signer, address: (staking || evvmAddress) as HexString, chainId }),
      nameService: new NameService({ signer, address: (nameService || evvmAddress) as HexString, chainId }),
      p2pSwap: new P2PSwap({ signer, address: (p2pSwap || evvmAddress) as HexString, chainId }),
      signer,
    };
  }, [getSigner, isConnected, deployment]);

  /**
   * Get EVVM service instance only
   */
  const getEvvmService = useCallback(async (): Promise<{ evvm: EVVM; signer: ISigner }> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!deployment?.evvm) {
      throw new Error('EVVM contract address not configured');
    }

    const signer = await getSigner();
    const chainId = await signer.getChainId();

    return {
      evvm: new EVVM({ signer, address: deployment.evvm as HexString, chainId }),
      signer,
    };
  }, [getSigner, isConnected, deployment]);

  /**
   * Get Staking service instance only
   */
  const getStakingService = useCallback(async (): Promise<{ staking: Staking; evvm: EVVM; signer: ISigner }> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!deployment?.evvm || !deployment?.staking) {
      throw new Error('EVVM or Staking contract address not configured');
    }

    const signer = await getSigner();
    const chainId = await signer.getChainId();

    return {
      staking: new Staking({ signer, address: deployment.staking as HexString, chainId }),
      evvm: new EVVM({ signer, address: deployment.evvm as HexString, chainId }),
      signer,
    };
  }, [getSigner, isConnected, deployment]);

  /**
   * Get NameService service instance only
   */
  const getNameServiceService = useCallback(async (): Promise<{ nameService: NameService; evvm: EVVM; signer: ISigner }> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!deployment?.evvm || !deployment?.nameService) {
      throw new Error('EVVM or NameService contract address not configured');
    }

    const signer = await getSigner();
    const chainId = await signer.getChainId();

    return {
      nameService: new NameService({ signer, address: deployment.nameService as HexString, chainId }),
      evvm: new EVVM({ signer, address: deployment.evvm as HexString, chainId }),
      signer,
    };
  }, [getSigner, isConnected, deployment]);

  /**
   * Get P2PSwap service instance only
   */
  const getP2PSwapService = useCallback(async (): Promise<{ p2pSwap: P2PSwap; evvm: EVVM; signer: ISigner }> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    if (!deployment?.evvm || !deployment?.p2pSwap) {
      throw new Error('EVVM or P2PSwap contract address not configured');
    }

    const signer = await getSigner();
    const chainId = await signer.getChainId();

    return {
      p2pSwap: new P2PSwap({ signer, address: deployment.p2pSwap as HexString, chainId }),
      evvm: new EVVM({ signer, address: deployment.evvm as HexString, chainId }),
      signer,
    };
  }, [getSigner, isConnected, deployment]);

  return {
    getServices,
    getEvvmService,
    getStakingService,
    getNameServiceService,
    getP2PSwapService,
    deployment,
    deploymentLoading,
    deploymentError,
    isConnected,
    address,
  };
}
