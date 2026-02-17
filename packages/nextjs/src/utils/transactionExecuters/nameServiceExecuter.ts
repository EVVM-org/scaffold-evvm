/**
 * NameService Transaction Executor
 *
 * This module provides functions to execute NameService smart contract transactions using wagmi's writeContract.
 * Each function corresponds to a specific NameService action (registration, offer, metadata, etc).
 * All functions return a Promise that resolves on success or rejects on error.
 *
 * Input types are imported from @evvm/evvm-js and match the contract ABI.
 */
import { writeContract } from "@wagmi/core";
import { config } from "@/config";
import {
  NameServiceABI,
  type IPreRegistrationUsernameData as PreRegistrationUsernameInputData,
  type IRegistrationUsernameData as RegistrationUsernameInputData,
  type IMakeOfferData as MakeOfferInputData,
  type IWithdrawOfferData as WithdrawOfferInputData,
  type IAcceptOfferData as AcceptOfferInputData,
  type IRenewUsernameData as RenewUsernameInputData,
  type IAddCustomMetadataData as AddCustomMetadataInputData,
  type IRemoveCustomMetadataData as RemoveCustomMetadataInputData,
  type IFlushCustomMetadataData as FlushCustomMetadataInputData,
  type IFlushUsernameData as FlushUsernameInputData,
} from "@evvm/evvm-js";

/**
 * Executes pre-registration of a username in NameService contract.
 * @param InputData PreRegistrationUsernameInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executePreRegistrationUsername = async (
  InputData: PreRegistrationUsernameInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "preRegistrationUsername",
    args: [
      InputData.user,
      InputData.hashPreRegisteredUsername,
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
 * Executes registration of a username in NameService contract.
 * @param InputData RegistrationUsernameInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeRegistrationUsername = async (
  InputData: RegistrationUsernameInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "registrationUsername",
    args: [
      InputData.user,
      InputData.username,
      InputData.lockNumber,
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
 * Executes making an offer for a username in NameService contract.
 * @param InputData MakeOfferInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeMakeOffer = async (
  InputData: MakeOfferInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "makeOffer",
    args: [
      InputData.user,
      InputData.username,
      InputData.amount,
      InputData.expirationDate,
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
 * Executes withdrawal of an offer for a username in NameService contract.
 * @param InputData WithdrawOfferInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeWithdrawOffer = async (
  InputData: WithdrawOfferInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "withdrawOffer",
    args: [
      InputData.user,
      InputData.username,
      InputData.offerID,
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
 * Executes acceptance of an offer for a username in NameService contract.
 * @param InputData AcceptOfferInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeAcceptOffer = async (
  InputData: AcceptOfferInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "acceptOffer",
    args: [
      InputData.user,
      InputData.username,
      InputData.offerID,
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
 * Executes renewal of a username in NameService contract.
 * @param InputData RenewUsernameInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeRenewUsername = async (
  InputData: RenewUsernameInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "renewUsername",
    args: [
      InputData.user,
      InputData.username,
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
 * Executes addition of custom metadata for a username in NameService contract.
 * @param InputData AddCustomMetadataInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeAddCustomMetadata = async (
  InputData: AddCustomMetadataInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "addCustomMetadata",
    args: [
      InputData.user,
      InputData.identity,
      InputData.value,
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
 * Executes removal of custom metadata for a username in NameService contract.
 * @param InputData RemoveCustomMetadataInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeRemoveCustomMetadata = async (
  InputData: RemoveCustomMetadataInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "removeCustomMetadata",
    args: [
      InputData.user,
      InputData.identity,
      InputData.key,
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
 * Executes flush of all custom metadata for a username in NameService contract.
 * @param InputData FlushCustomMetadataInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeFlushCustomMetadata = async (
  InputData: FlushCustomMetadataInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "flushCustomMetadata",
    args: [
      InputData.user,
      InputData.identity,
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
 * Executes flush of a username in NameService contract.
 * @param InputData FlushUsernameInputData
 * @param nameServiceAddress Contract address
 * @returns Promise<void>
 */
const executeFlushUsername = async (
  InputData: FlushUsernameInputData,
  nameServiceAddress: `0x${string}`
) => {
  if (!InputData) {
    return Promise.reject("No input to execute");
  }

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "flushUsername",
    args: [
      InputData.user,
      InputData.username,
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
 * Exports all NameService transaction executor functions.
 */
export {
  executePreRegistrationUsername, // Pre-register username
  executeRegistrationUsername,    // Register username
  executeMakeOffer,               // Make offer for username
  executeWithdrawOffer,           // Withdraw offer for username
  executeAcceptOffer,             // Accept offer for username
  executeRenewUsername,           // Renew username
  executeAddCustomMetadata,       // Add custom metadata
  executeRemoveCustomMetadata,    // Remove custom metadata
  executeFlushCustomMetadata,     // Flush all custom metadata
  executeFlushUsername,           // Flush username
};
