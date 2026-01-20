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

    return {
      evvm: new EVVM(signer, evvmAddress as HexString),
      staking: new Staking(signer, (staking || evvmAddress) as HexString),
      nameService: new NameService(signer, (nameService || evvmAddress) as HexString),
      p2pSwap: new P2PSwap(signer, (p2pSwap || evvmAddress) as HexString),
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

    return {
      evvm: new EVVM(signer, deployment.evvm as HexString),
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

    return {
      staking: new Staking(signer, deployment.staking as HexString),
      evvm: new EVVM(signer, deployment.evvm as HexString),
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

    return {
      nameService: new NameService(signer, deployment.nameService as HexString),
      evvm: new EVVM(signer, deployment.evvm as HexString),
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

    return {
      p2pSwap: new P2PSwap(signer, deployment.p2pSwap as HexString),
      evvm: new EVVM(signer, deployment.evvm as HexString),
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
