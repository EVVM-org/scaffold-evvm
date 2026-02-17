/**
 * EVVM Transaction Executor
 *
 * Functions to execute EVVM payment and disperse payment transactions via smart contract.
 * Each function calls the contract for a specific EVVM action using wagmi's writeContract.
 * Returns a Promise that resolves on success or rejects on error.
 * Input types match the contract ABI.
 */
import { writeContract } from "@wagmi/core";
import {
  type IDispersePayData as DispersePayInputData,
  type IPayData as PayInputData,
  CoreABI,
} from "@evvm/evvm-js";
import { config } from "@/config";

/**
 * Executes a payment transaction on the EVVM contract.
 * @param InputData PayInputData containing payment details
 * @param evvmAddress EVVM contract address
 * @returns Promise<void>
 */
const executePay = async (
  InputData: PayInputData,
  evvmAddress: `0x${string}`,
) => {
  if (!InputData) {
    return Promise.reject("No data to execute payment");
  }

  console.log('🔄 [evvm-js] executePay: Using CoreABI from @evvm/evvm-js');
  console.log('📋 [evvm-js] executePay: Transaction details:', {
    from: InputData.from,
    to: InputData.to_address || InputData.to_identity,
    token: InputData.token,
    amount: InputData.amount.toString(),
    nonce: InputData.nonce.toString(),
  });

  const hash = await writeContract(config, {
    abi: CoreABI,
    address: evvmAddress,
    functionName: "pay",
    args: [
      InputData.from,
      InputData.to_address,
      InputData.to_identity,
      InputData.token,
      InputData.amount,
      InputData.priorityFee,
      InputData.senderExecutor,
      InputData.nonce,
      InputData.isAsyncExec,
      InputData.signature,
    ],
  });
  return hash as `0x${string}`;
};

/**
 * Executes a disperse payment transaction on the EVVM contract.
 * Allows payment to multiple recipients in a single transaction.
 * @param InputData DispersePayInputData containing payment details
 * @param evvmAddress EVVM contract address
 * @returns Promise<void>
 */
const executeDispersePay = async (
  InputData: DispersePayInputData,
  evvmAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No data to execute payment");
  }

  const hash = await writeContract(config, {
    abi: CoreABI,
    address: evvmAddress,
    functionName: "dispersePay",
    args: [
      InputData.from,
      InputData.toData,
      InputData.token,
      InputData.amount,
      InputData.priorityFee,
      InputData.senderExecutor,
      InputData.nonce,
      InputData.isAsyncExec,
      InputData.signature,
    ],
  });
  return hash as `0x${string}`;
};

export { executePay, executeDispersePay };
