/**
 * NameService Transaction Executor
 *
 * This module provides functions to execute NameService smart contract transactions using wagmi's writeContract.
 * Each function corresponds to a specific NameService action (registration, offer, metadata, etc).
 * All functions return a Promise that resolves on success or rejects on error.
 *
 * Input types are imported from @evvm/viem-signature-library and match the contract ABI.
 */
import { writeContract } from "@wagmi/core";
import { config } from "@/config";
import {
  NameServiceABI,
  PreRegistrationUsernameInputData,
  RegistrationUsernameInputData,
  MakeOfferInputData,
  WithdrawOfferInputData,
  AcceptOfferInputData,
  RenewUsernameInputData,
  AddCustomMetadataInputData,
  RemoveCustomMetadataInputData,
  FlushCustomMetadataInputData,
  FlushUsernameInputData,
} from "@evvm/viem-signature-library";

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

  // Validate signature before execution
  if (!InputData.signature || typeof InputData.signature !== 'string') {
    console.error("Invalid actionSignature:", InputData.signature);
    return Promise.reject(`Invalid action signature: ${InputData.signature}`);
  }

  if (!InputData.signature_EVVM || typeof InputData.signature_EVVM !== 'string') {
    console.error("Invalid EVVM signature:", InputData.signature_EVVM);
    return Promise.reject(`Invalid EVVM signature: ${InputData.signature_EVVM}`);
  }

  console.log("Executing preRegistrationUsername with args:", {
    user: InputData.user,
    hash: InputData.hashPreRegisteredUsername,
    nonce: InputData.nonce.toString(),
    signature: InputData.signature,
    priorityFee: InputData.priorityFee_EVVM.toString(),
    nonceEVVM: InputData.nonce_EVVM.toString(),
    priorityFlag: InputData.priorityFlag_EVVM,
    signatureEVVM: InputData.signature_EVVM,
  });

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "preRegistrationUsername",
    args: [
      InputData.user,
      InputData.hashPreRegisteredUsername,
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
    ],
  })
    .then((hash) => {
      console.log("Pre-registration transaction submitted:", hash);
      return Promise.resolve();
    })
    .catch((error) => {
      console.error("Pre-registration transaction failed:", error);
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

  // Validate signature before execution
  if (!InputData.signature || typeof InputData.signature !== 'string') {
    console.error("Invalid actionSignature:", InputData.signature);
    return Promise.reject(`Invalid action signature: ${InputData.signature}`);
  }

  if (!InputData.signature_EVVM || typeof InputData.signature_EVVM !== 'string') {
    console.error("Invalid EVVM signature:", InputData.signature_EVVM);
    return Promise.reject(`Invalid EVVM signature: ${InputData.signature_EVVM}`);
  }

  console.log("Executing registrationUsername with args:", {
    user: InputData.user,
    username: InputData.username,
    clowNumber: InputData.clowNumber.toString(),
    nonce: InputData.nonce.toString(),
    signature: InputData.signature,
    priorityFee: InputData.priorityFee_EVVM.toString(),
    nonceEVVM: InputData.nonce_EVVM.toString(),
    priorityFlag: InputData.priorityFlag_EVVM,
    signatureEVVM: InputData.signature_EVVM,
  });

  return writeContract(config, {
    abi: NameServiceABI,
    address: nameServiceAddress,
    functionName: "registrationUsername",
    args: [
      InputData.user,
      InputData.username,
      InputData.clowNumber,
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
    ],
  })
    .then((hash) => {
      console.log("Registration transaction submitted:", hash);
      return Promise.resolve();
    })
    .catch((error) => {
      console.error("Registration transaction failed:", error);
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
      InputData.expireDate,
      InputData.amount,
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
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
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
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
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
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
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
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
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
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
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
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
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
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
      InputData.nonce,
      InputData.signature,
      InputData.priorityFee_EVVM,
      InputData.nonce_EVVM,
      InputData.priorityFlag_EVVM,
      InputData.signature_EVVM,
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
