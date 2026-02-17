/**
 * Staking Transaction Executor
 *
 * Functions to execute Staking transactions (golden, presale, public, service).
 * Each function calls the contract for a specific staking action using wagmi's writeContract.
 * Returns a Promise that resolves on success or rejects on error.
 * Input types match the contract ABI.
 */
import { writeContract } from "@wagmi/core";
import { config } from "@/config";
import {
  StakingABI,
  type IGoldenStakingData as GoldenStakingInputData,
  type IPresaleStakingData as PresaleStakingInputData,
  type IPublicStakingData as PublicStakingInputData,
} from "@evvm/evvm-js";

const executeGoldenStaking = async (
  InputData: GoldenStakingInputData,
  stakingAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No data to execute payment");
  }

  return writeContract(config, {
    abi: StakingABI,
    address: stakingAddress,
    functionName: "goldenStaking",
    args: [
      InputData.isStaking,
      InputData.amountOfStaking,
      InputData.signaturePay,
    ],
  })
    .then(() => {
      return Promise.resolve();
    })
    .catch((error) => {
      console.error("Golden staking transaction failed:", error);
      return Promise.reject(error);
    });
};

/**
 * Executes presale staking transaction.
 * @param InputData PresaleStakingInputData containing staking details
 * @param stakingAddress Staking contract address
 * @returns Promise<void>
 */
const executePresaleStaking = async (
  InputData: PresaleStakingInputData,
  stakingAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No data to execute payment");
  }

  return writeContract(config, {
    abi: StakingABI,
    address: stakingAddress,
    functionName: "presaleStaking",
    args: [
      InputData.user,
      InputData.isStaking,
      InputData.originExecutor,
      InputData.nonce,
      InputData.signature,
      InputData.priorityFeePay,
      InputData.noncePay,
      InputData.signaturePay,
    ],
  })
    .then(() => {
      return Promise.resolve();
    })
    .catch((error) => {
      return Promise.reject(error);
    });
};

/**
 * Executes public staking transaction.
 * @param InputData PublicStakingInputData containing staking details
 * @param stakingAddress Staking contract address
 * @returns Promise<void>
 */
const executePublicStaking = async (
  InputData: PublicStakingInputData,
  stakingAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No data to execute payment");
  }

  return writeContract(config, {
    abi: StakingABI,
    address: stakingAddress,
    functionName: "publicStaking",
    args: [
      InputData.user,
      InputData.isStaking,
      InputData.amountOfStaking,
      InputData.originExecutor,
      InputData.nonce,
      InputData.signature,
      InputData.priorityFeePay,
      InputData.noncePay,
      InputData.signaturePay,
    ],
  })
    .then(() => {
      return Promise.resolve();
    })
    .catch((error) => {
      return Promise.reject(error);
    });
};

export {
  executeGoldenStaking,
  executePresaleStaking,
  executePublicStaking,
};
