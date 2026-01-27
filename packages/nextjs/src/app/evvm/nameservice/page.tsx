"use client";
import React, { useState } from "react";
import { config } from "@/config/index";
import { getWalletClient, readContract } from "@wagmi/core";
import { NetworkWarning } from "@/components/NetworkWarning";
import {
  TitleAndLink,
  NumberInputWithGenerator,
  PrioritySelector,
  DataDisplayWithClear,
  HelperInfo,
  NumberInputField,
  TextInputField,
  DateInputField,
} from "@/components/SigConstructors/InputsAndModules";
import { getAccountWithRetry } from "@/utils/getAccountWithRetry";
import { dateToUnixTimestamp } from "@/utils/dateToUnixTimestamp";
import {
  executePreRegistrationUsername,
  executeRegistrationUsername,
  executeRenewUsername,
  executeMakeOffer,
  executeAcceptOffer,
  executeWithdrawOffer,
  executeAddCustomMetadata,
  executeRemoveCustomMetadata,
  executeFlushCustomMetadata,
  executeFlushUsername,
} from "@/utils/transactionExecuters";
import {
  NameServiceABI,
  EvvmABI,
  createSignerWithViem,
  EVVM,
  NameService,
  type IPayData as PayInputData,
  type IPreRegistrationUsernameData as PreRegistrationUsernameInputData,
  type IRegistrationUsernameData as RegistrationUsernameInputData,
  type IRenewUsernameData as RenewUsernameInputData,
  type IMakeOfferData as MakeOfferInputData,
  type IAcceptOfferData as AcceptOfferInputData,
  type IWithdrawOfferData as WithdrawOfferInputData,
  type IAddCustomMetadataData as AddCustomMetadataInputData,
  type IRemoveCustomMetadataData as RemoveCustomMetadataInputData,
  type IFlushCustomMetadataData as FlushCustomMetadataInputData,
  type IFlushUsernameData as FlushUsernameInputData,
} from "@evvm/evvm-js";
import { keccak256, encodePacked } from "viem";

// Local implementation of hash function (not exported from evvm-js)
function hashPreRegisteredUsername(username: string, clowNumber: bigint): string {
  return keccak256(encodePacked(['string', 'uint256'], [username, clowNumber]));
}
import { useEvvmDeployment } from "@/hooks/useEvvmDeployment";
import styles from "@/styles/pages/NameService.module.css";

type InfoData = {
  PayInputData: PayInputData;
  ActionInputData: any;
};

export default function NameServicePage() {
  const { deployment, loading: deploymentLoading, error: deploymentError } = useEvvmDeployment();
  const [activeTab, setActiveTab] = useState<string>("preRegistration");
  const [priority, setPriority] = useState("low");
  const [dataToGet, setDataToGet] = useState<InfoData | null>(null);
  const [rewardAmount, setRewardAmount] = useState<bigint | null>(null);
  const [renewAmount, setRenewAmount] = useState<bigint | null>(null);
  const [addMetadataPrice, setAddMetadataPrice] = useState<bigint | null>(null);

  const getValue = (id: string): string => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) {
      throw new Error(`Input element with id '${id}' not found`);
    }
    return el.value;
  };

  const validateRequiredFields = (fields: { [key: string]: string }) => {
    for (const [name, value] of Object.entries(fields)) {
      if (!value || value.trim() === "") {
        throw new Error(`${name} is required`);
      }
    }
  };

  // PRE-REGISTRATION USERNAME
  const handlePreRegistrationUsername = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        username: getValue("usernameInput_preRegistration"),
        clowNumber: getValue("clowNumberInput_preRegistration"),
        nonce: getValue("nonceNameServiceInput_preRegistration"),
        priorityFee_EVVM: getValue("priorityFeeInput_preRegistration"),
        nonce_EVVM: getValue("nonceEVVMInput_preRegistration"),
        priorityFlag_EVVM: priority === "high",
      };

      validateRequiredFields({
        Username: formData.username,
        "Clow Number": formData.clowNumber,
        "NameService Nonce": formData.nonce,
        "EVVM Nonce": formData.nonce_EVVM,
      });

      const walletClient = await getWalletClient(config);

      if (!walletClient) {
        throw new Error("Wallet client not available. Please connect your wallet.");
      }

      console.log("Creating nameservice with:", {
        walletClient,
        walletData,
        evvmID: deployment.evvmID,
        nameService: deployment.nameService
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      // Create EVVM pay action first (with 0 amount for pre-registration)
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: 0n,
        priorityFee: BigInt(formData.priorityFee_EVVM || "0"),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: formData.priorityFlag_EVVM,
        executor: deployment.nameService as `0x${string}`,
      });

      // Hash the username with clowNumber for pre-registration
      const hashUsername = hashPreRegisteredUsername(
        formData.username,
        BigInt(formData.clowNumber)
      );

      // Create pre-registration action
      const nsAction = await nameService.preRegistrationUsername({
        hashPreRegisteredUsername: hashUsername,
        nonce: BigInt(formData.nonce),
        evvmSignedAction: evvmAction,
      });

      console.log("Signature handling:", {
        priorityFee: formData.priorityFee_EVVM,
        paySignature: evvmAction.data.signature,
        actionSignature: nsAction.data.signature,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(0),
          priorityFee: BigInt(formData.priorityFee_EVVM || "0"),
          nonce: BigInt(formData.nonce_EVVM),
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error creating signature:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // REGISTRATION USERNAME
  const handleRegistrationUsername = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        nonceNameService: getValue("nonceNameServiceInput_registrationUsername"),
        username: getValue("usernameInput_registrationUsername"),
        clowNumber: getValue("clowNumberInput_registrationUsername"),
        priorityFee_EVVM: getValue("priorityFeeInput_registrationUsername"),
        nonceEVVM: getValue("nonceEVVMInput_registrationUsername"),
        priorityFlag: priority === "high",
      };

      validateRequiredFields({
        Username: formData.username,
        "Clow Number": formData.clowNumber,
        "NameService Nonce": formData.nonceNameService,
        "EVVM Nonce": formData.nonceEVVM,
      });

      const walletClient = await getWalletClient(config);

      if (!walletClient) {
        throw new Error("Wallet client not available. Please connect your wallet.");
      }

      await readRewardAmount();

      console.log("Creating registration signature with:", {
        evvmID: deployment.evvmID,
        username: formData.username,
        clowNumber: formData.clowNumber,
        rewardAmount
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      // Create EVVM pay action first
      const payAmount = rewardAmount ? rewardAmount * BigInt(100) : BigInt(0);
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: payAmount,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonceEVVM),
        priorityFlag: formData.priorityFlag,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create registration action
      const nsAction = await nameService.registrationUsername({
        username: formData.username,
        clowNumber: BigInt(formData.clowNumber),
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      console.log("Registration signatures created:", {
        paySignature: evvmAction.data.signature,
        actionSignature: nsAction.data.signature,
        note: "Both signatures are required for registration"
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: payAmount,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error creating signatures:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const readRewardAmount = async () => {
    if (!deployment) {
      setRewardAmount(null);
      return;
    }

    try {
      const evvmAddress = await readContract(config, {
        abi: NameServiceABI,
        address: deployment.nameService as `0x${string}`,
        functionName: "getEvvmAddress",
        args: [],
      });

      if (!evvmAddress) {
        setRewardAmount(null);
        return;
      }

      const reward = await readContract(config, {
        abi: EvvmABI,
        address: evvmAddress as `0x${string}`,
        functionName: "getRewardAmount",
        args: [],
      });

      setRewardAmount(reward ? BigInt(reward.toString()) : null);
    } catch (error) {
      console.error("Error reading reward amount:", error);
      setRewardAmount(null);
    }
  };

  // RENEW USERNAME
  const handleRenewUsername = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        username: getValue("usernameInput_renewUsername"),
        nonceNameService: BigInt(getValue("nonceNameServiceInput_renewUsername")),
        amountToRenew: BigInt(getValue("amountToRenew_renewUsername")),
        priorityFee_EVVM: BigInt(getValue("priorityFeeInput_renewUsername")),
        nonceEVVM: BigInt(getValue("nonceEVVMInput_renewUsername")),
        priorityFlag: priority === "high",
      };

      const walletClient = await getWalletClient(config);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: formData.amountToRenew,
        priorityFee: formData.priorityFee_EVVM,
        nonce: formData.nonceEVVM,
        priorityFlag: formData.priorityFlag,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create renew action
      const nsAction = await nameService.renewUsername({
        username: formData.username,
        nonce: formData.nonceNameService,
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: formData.amountToRenew,
          priorityFee: BigInt(0),
          nonce: formData.nonceEVVM,
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error signing renew username:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const readAmountToRenew = async () => {
    if (!deployment) {
      setRenewAmount(null);
      return;
    }

    try {
      const username = getValue("usernameInput_renewUsername");
      const result = await readContract(config, {
        abi: NameServiceABI,
        address: deployment.nameService as `0x${string}`,
        functionName: "seePriceToRenew",
        args: [username],
      });
      setRenewAmount(result ? BigInt(result.toString()) : null);
    } catch (error) {
      console.error("Error reading amount to renew:", error);
      setRenewAmount(null);
    }
  };

  // MAKE OFFER
  const handleMakeOffer = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        nonceNameService: getValue("nonceNameServiceInput_makeOffer"),
        username: getValue("usernameInput_makeOffer"),
        amount: getValue("amountInput_makeOffer"),
        expireDate: dateToUnixTimestamp(getValue("expireDateInput_makeOffer")),
        priorityFee_EVVM: getValue("priorityFeeInput_makeOffer"),
        nonceEVVM: getValue("nonceEVVMInput_makeOffer"),
        priorityFlag: priority === "high",
      };

      const walletClient = await getWalletClient(config);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: BigInt(formData.amount),
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonceEVVM),
        priorityFlag: formData.priorityFlag,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create make offer action
      const nsAction = await nameService.makeOffer({
        username: formData.username,
        expireDate: BigInt(formData.expireDate),
        amount: BigInt(formData.amount),
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(formData.amount),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error creating signature:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // ACCEPT OFFER
  const handleAcceptOffer = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        username: getValue("usernameInput_acceptOffer"),
        offerId: getValue("offerIdInput_acceptOffer"),
        nonce: getValue("nonceInput_acceptOffer"),
        priorityFee_EVVM: getValue("priorityFeeEVVMInput_acceptOffer"),
        priorityFlag_EVVM: priority === "high",
        nonce_EVVM: getValue("nonceEVVMInput_acceptOffer"),
      };

      const walletClient = await getWalletClient(config);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      // Create EVVM pay action first (with 0 amount for accept offer)
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: 0n,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: formData.priorityFlag_EVVM,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create accept offer action
      const nsAction = await nameService.acceptOffer({
        username: formData.username,
        offerID: BigInt(formData.offerId),
        nonce: BigInt(formData.nonce),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(0),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error signing accept offer:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // WITHDRAW OFFER
  const handleWithdrawOffer = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        nonceNameService: getValue("nonceNameServiceInput_withdrawOffer"),
        username: getValue("usernameInput_withdrawOffer"),
        offerId: getValue("offerIdInput_withdrawOffer"),
        priorityFee_EVVM: getValue("priorityFeeInput_withdrawOffer"),
        nonce_EVVM: getValue("nonceEVVMInput_withdrawOffer"),
        priorityFlag_EVVM: priority === "high",
      };

      const walletClient = await getWalletClient(config);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      // Create EVVM pay action first (with 0 amount for withdraw offer)
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: 0n,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: formData.priorityFlag_EVVM,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create withdraw offer action
      const nsAction = await nameService.withdrawOffer({
        username: formData.username,
        offerID: BigInt(formData.offerId),
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: BigInt(0),
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error signing withdraw offer:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // ADD CUSTOM METADATA
  const handleAddCustomMetadata = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        nonceNameService: getValue("nonceNameServiceInput_addCustomMetadata"),
        identity: getValue("identityInput_addCustomMetadata"),
        schema: getValue("schemaInput_addCustomMetadata"),
        subschema: getValue("subschemaInput_addCustomMetadata"),
        value: getValue("valueInput_addCustomMetadata"),
        priorityFee_EVVM: getValue("priorityFeeInput_addCustomMetadata"),
        nonceEVVM: getValue("nonceEVVMInput_addCustomMetadata"),
        priorityFlag: priority === "high",
      };

      const valueCustomMetadata = `${formData.schema}:${formData.subschema}>${formData.value}`;

      const walletClient = await getWalletClient(config);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      await getPriceToAddCustomMetadata();

      const payAmount = addMetadataPrice
        ? BigInt(addMetadataPrice)
        : BigInt(5000000000000000000 * 10);

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: payAmount,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonceEVVM),
        priorityFlag: formData.priorityFlag,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create add custom metadata action
      const nsAction = await nameService.addCustomMetadata({
        identity: formData.identity,
        value: valueCustomMetadata,
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: payAmount,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error creating signature:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const getPriceToAddCustomMetadata = async () => {
    if (!deployment) {
      setAddMetadataPrice(null);
      return;
    }

    try {
      const price = await readContract(config, {
        abi: NameServiceABI,
        address: deployment.nameService as `0x${string}`,
        functionName: "getPriceToAddCustomMetadata",
        args: [],
      });
      setAddMetadataPrice(price ? BigInt(price.toString()) : null);
    } catch (error) {
      console.error("Error reading price to add custom metadata:", error);
      setAddMetadataPrice(null);
    }
  };

  // REMOVE CUSTOM METADATA
  const handleRemoveCustomMetadata = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        nonceNameService: getValue("nonceNameServiceInput_removeCustomMetadata"),
        identity: getValue("identityInput_removeCustomMetadata"),
        key: getValue("keyInput_removeCustomMetadata"),
        priorityFee_EVVM: getValue("priorityFeeInput_removeCustomMetadata"),
        nonceEVVM: getValue("nonceEVVMInput_removeCustomMetadata"),
        priorityFlag: priority === "high",
      };

      const walletClient = await getWalletClient(config);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      const price = await readContract(config, {
        abi: NameServiceABI,
        address: deployment.nameService as `0x${string}`,
        functionName: "getPriceToRemoveCustomMetadata",
        args: [],
      });

      if (!price) {
        throw new Error("Price to remove custom metadata is not available");
      }

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: price as bigint,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonceEVVM),
        priorityFlag: formData.priorityFlag,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create remove custom metadata action
      const nsAction = await nameService.removeCustomMetadata({
        identity: formData.identity,
        key: BigInt(formData.key),
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: price as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonceEVVM),
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error signing accept offer:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // FLUSH CUSTOM METADATA
  const handleFlushCustomMetadata = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        nonceNameService: getValue("nonceNameServiceInput_flushCustomMetadata"),
        identity: getValue("identityInput_flushCustomMetadata"),
        priorityFee_EVVM: getValue("priorityFeeInput_flushCustomMetadata"),
        nonce_EVVM: getValue("nonceEVVMInput_flushCustomMetadata"),
        priorityFlag_EVVM: priority === "high",
      };

      const walletClient = await getWalletClient(config);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      const price = await readContract(config, {
        abi: NameServiceABI,
        address: deployment.nameService as `0x${string}`,
        functionName: "getPriceToFlushCustomMetadata",
        args: [formData.identity],
      });

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: price as bigint,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: formData.priorityFlag_EVVM,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create flush custom metadata action
      const nsAction = await nameService.flushCustomMetadata({
        identity: formData.identity,
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: price as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priorityFlag: priority === "high",
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error creating signature:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // FLUSH USERNAME
  const handleFlushUsername = async () => {
    if (!deployment) {
      alert("Deployment information not available");
      return;
    }

    const walletData = await getAccountWithRetry(config);
    if (!walletData) return;

    try {
      const formData = {
        nonceNameService: getValue("nonceNameServiceInput_flushUsername"),
        username: getValue("usernameInput_flushUsername"),
        priorityFee_EVVM: getValue("priorityFeeInput_flushUsername"),
        nonce_EVVM: getValue("nonceEVVMInput_flushUsername"),
        priorityFlag_EVVM: priority === "high",
      };

      const walletClient = await getWalletClient(config);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = await createSignerWithViem(walletClient as any);
      const evvm = new EVVM(signer, deployment.evvm as `0x${string}`);
      const nameService = new NameService(signer, deployment.nameService as `0x${string}`);

      const priceToFlushUsername = await readContract(config, {
        abi: NameServiceABI,
        address: deployment.nameService as `0x${string}`,
        functionName: "getPriceToFlushUsername",
        args: [formData.username],
      });

      if (!priceToFlushUsername) {
        throw new Error("Price to flush username is not available");
      }

      // Create EVVM pay action first
      const evvmAction = await evvm.pay({
        to: deployment.nameService as `0x${string}`,
        tokenAddress: "0x0000000000000000000000000000000000000001" as `0x${string}`,
        amount: priceToFlushUsername as bigint,
        priorityFee: BigInt(formData.priorityFee_EVVM),
        nonce: BigInt(formData.nonce_EVVM),
        priorityFlag: formData.priorityFlag_EVVM,
        executor: deployment.nameService as `0x${string}`,
      });

      // Create flush username action
      const nsAction = await nameService.flushUsername({
        username: formData.username,
        nonce: BigInt(formData.nonceNameService),
        evvmSignedAction: evvmAction,
      });

      setDataToGet({
        PayInputData: {
          from: walletData.address as `0x${string}`,
          to_address: deployment.nameService as `0x${string}`,
          to_identity: "",
          token: "0x0000000000000000000000000000000000000001" as `0x${string}`,
          amount: priceToFlushUsername as bigint,
          priorityFee: BigInt(formData.priorityFee_EVVM),
          nonce: BigInt(formData.nonce_EVVM),
          priorityFlag: formData.priorityFlag_EVVM,
          executor: deployment.nameService as `0x${string}`,
          signature: evvmAction.data.signature,
        },
        ActionInputData: nsAction.data,
      });
    } catch (error) {
      console.error("Error creating signature:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // EXECUTE TRANSACTION
  const executeTransaction = async () => {
    if (!dataToGet || !deployment) {
      console.error("No data to execute");
      return;
    }

    try {
      switch (activeTab) {
        case "preRegistration":
          await executePreRegistrationUsername(
            dataToGet.ActionInputData as PreRegistrationUsernameInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "registration":
          await executeRegistrationUsername(
            dataToGet.ActionInputData as RegistrationUsernameInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "renew":
          await executeRenewUsername(
            dataToGet.ActionInputData as RenewUsernameInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "makeOffer":
          await executeMakeOffer(
            dataToGet.ActionInputData as MakeOfferInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "acceptOffer":
          await executeAcceptOffer(
            dataToGet.ActionInputData as AcceptOfferInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "withdrawOffer":
          await executeWithdrawOffer(
            dataToGet.ActionInputData as WithdrawOfferInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "addMetadata":
          await executeAddCustomMetadata(
            dataToGet.ActionInputData as AddCustomMetadataInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "removeMetadata":
          await executeRemoveCustomMetadata(
            dataToGet.ActionInputData as RemoveCustomMetadataInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "flushMetadata":
          await executeFlushCustomMetadata(
            dataToGet.ActionInputData as FlushCustomMetadataInputData,
            deployment.nameService as `0x${string}`
          );
          break;
        case "flushUsername":
          await executeFlushUsername(
            dataToGet.ActionInputData as FlushUsernameInputData,
            deployment.nameService as `0x${string}`
          );
          break;
      }
      alert("Transaction executed successfully!");
    } catch (error) {
      console.error("Error executing transaction:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  if (deploymentLoading) {
    return <div className={styles.container}>Loading deployment information...</div>;
  }

  if (deploymentError || !deployment) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Error: {deploymentError || "No deployment found"}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Name Service Signature Constructor</h1>
        <p>EVVM ID: {deployment.evvmID} | Network: {deployment.networkName}</p>
      </div>

      <NetworkWarning deployment={deployment} />

      <div className={styles.tabs}>
        <button
          className={activeTab === "preRegistration" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("preRegistration");
            setDataToGet(null);
          }}
        >
          Pre-Registration
        </button>
        <button
          className={activeTab === "registration" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("registration");
            setDataToGet(null);
          }}
        >
          Registration
        </button>
        <button
          className={activeTab === "renew" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("renew");
            setDataToGet(null);
          }}
        >
          Renew
        </button>
        <button
          className={activeTab === "makeOffer" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("makeOffer");
            setDataToGet(null);
          }}
        >
          Make Offer
        </button>
        <button
          className={activeTab === "acceptOffer" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("acceptOffer");
            setDataToGet(null);
          }}
        >
          Accept Offer
        </button>
        <button
          className={activeTab === "withdrawOffer" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("withdrawOffer");
            setDataToGet(null);
          }}
        >
          Withdraw Offer
        </button>
        <button
          className={activeTab === "addMetadata" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("addMetadata");
            setDataToGet(null);
          }}
        >
          Add Metadata
        </button>
        <button
          className={activeTab === "removeMetadata" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("removeMetadata");
            setDataToGet(null);
          }}
        >
          Remove Metadata
        </button>
        <button
          className={activeTab === "flushMetadata" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("flushMetadata");
            setDataToGet(null);
          }}
        >
          Flush Metadata
        </button>
        <button
          className={activeTab === "flushUsername" ? styles.activeTab : styles.tab}
          onClick={() => {
            setActiveTab("flushUsername");
            setDataToGet(null);
          }}
        >
          Flush Username
        </button>
      </div>

      <div className={styles.formContainer}>
        {/* PRE-REGISTRATION TAB */}
        {activeTab === "preRegistration" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Pre-registration of username"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/preRegistrationUsernameStructure"
            />
            <p className={styles.note}>
              If this name was registered before, you may need to flush the custom metadata first.
            </p>

            <NumberInputWithGenerator
              label="Clow Number"
              inputId="clowNumberInput_preRegistration"
              placeholder="Enter clow number"
            />

            <TextInputField
              label="Username"
              inputId="usernameInput_preRegistration"
              placeholder="Enter username"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_preRegistration"
              placeholder="Enter priority fee"
            />

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_preRegistration"
              placeholder="Enter nonce"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_preRegistration"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handlePreRegistrationUsername} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* REGISTRATION TAB */}
        {activeTab === "registration" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Registration of username"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/registrationUsernameStructure"
            />
            <p className={styles.note}>
              This functionality does not consider username offers when calculating registration fees.
            </p>

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_registrationUsername"
              placeholder="Enter nonce"
            />

            <NumberInputField
              label="Clow Number"
              inputId="clowNumberInput_registrationUsername"
              placeholder="Enter clow number"
            />

            <TextInputField
              label="Username"
              inputId="usernameInput_registrationUsername"
              placeholder="Enter username"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_registrationUsername"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_registrationUsername"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleRegistrationUsername} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* RENEW USERNAME TAB */}
        {activeTab === "renew" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Renewal of username"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/renewUsernameStructure"
            />

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_renewUsername"
              placeholder="Enter nonce"
            />

            <TextInputField
              label="Username"
              inputId="usernameInput_renewUsername"
              placeholder="Enter username"
              onChange={readAmountToRenew}
            />

            <NumberInputField
              label="Cost to Renew (in MATE)"
              inputId="amountToRenew_renewUsername"
              placeholder="Enter amount to renew"
              defaultValue={renewAmount !== null ? renewAmount.toString() : ""}
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_renewUsername"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_renewUsername"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleRenewUsername} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* MAKE OFFER TAB */}
        {activeTab === "makeOffer" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Make offer of username"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/makeOfferStructure"
            />

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_makeOffer"
              placeholder="Enter nonce"
            />

            <TextInputField
              label="Username"
              inputId="usernameInput_makeOffer"
              placeholder="Enter username"
            />

            <NumberInputField
              label="Amount to offer (in MATE)"
              inputId="amountInput_makeOffer"
              placeholder="Enter amount to offer"
            />

            <DateInputField
              label="Expiration Date"
              inputId="expireDateInput_makeOffer"
              defaultValue="2025-12-31"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_makeOffer"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_makeOffer"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleMakeOffer} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* ACCEPT OFFER TAB */}
        {activeTab === "acceptOffer" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Accept offer of username"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/acceptOfferStructure"
            />

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceInput_acceptOffer"
              placeholder="Enter nonce"
            />

            <TextInputField
              label="Username"
              inputId="usernameInput_acceptOffer"
              placeholder="Enter username"
            />

            <NumberInputField
              label="Offer ID"
              inputId="offerIdInput_acceptOffer"
              placeholder="Enter offer ID"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeEVVMInput_acceptOffer"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_acceptOffer"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleAcceptOffer} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* WITHDRAW OFFER TAB */}
        {activeTab === "withdrawOffer" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Withdraw offer of username"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/withdrawOfferStructure"
            />

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_withdrawOffer"
              placeholder="Enter nonce"
            />

            <TextInputField
              label="Username"
              inputId="usernameInput_withdrawOffer"
              placeholder="Enter username"
            />

            <NumberInputField
              label="Offer ID"
              inputId="offerIdInput_withdrawOffer"
              placeholder="Enter offer ID"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_withdrawOffer"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_withdrawOffer"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleWithdrawOffer} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* ADD CUSTOM METADATA TAB */}
        {activeTab === "addMetadata" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Add custom metadata of identity"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/addCustomMetadataStructure"
            />

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_addCustomMetadata"
              placeholder="Enter nonce"
            />

            <TextInputField
              label="Identity"
              inputId="identityInput_addCustomMetadata"
              placeholder="Enter identity"
            />

            <TextInputField
              label="Schema"
              inputId="schemaInput_addCustomMetadata"
              placeholder="Enter schema"
            />

            <TextInputField
              label="Subschema"
              inputId="subschemaInput_addCustomMetadata"
              placeholder="Enter subschema"
            />

            <TextInputField
              label="Value"
              inputId="valueInput_addCustomMetadata"
              placeholder="Enter value"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_addCustomMetadata"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_addCustomMetadata"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleAddCustomMetadata} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* REMOVE CUSTOM METADATA TAB */}
        {activeTab === "removeMetadata" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Remove custom metadata of identity"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/removeCustomMetadataStructure"
            />

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_removeCustomMetadata"
              placeholder="Enter nonce"
            />

            <TextInputField
              label="Identity"
              inputId="identityInput_removeCustomMetadata"
              placeholder="Enter identity"
            />

            <TextInputField
              label="Key"
              inputId="keyInput_removeCustomMetadata"
              placeholder="Enter key"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_removeCustomMetadata"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_removeCustomMetadata"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleRemoveCustomMetadata} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* FLUSH CUSTOM METADATA TAB */}
        {activeTab === "flushMetadata" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Flush Custom Metadata of Identity"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/flushCustomMetadataStructure"
            />

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_flushCustomMetadata"
              placeholder="Enter nonce"
            />

            <TextInputField
              label="Identity"
              inputId="identityInput_flushCustomMetadata"
              placeholder="Enter identity"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_flushCustomMetadata"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_flushCustomMetadata"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleFlushCustomMetadata} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}

        {/* FLUSH USERNAME TAB */}
        {activeTab === "flushUsername" && (
          <div className={styles.form}>
            <TitleAndLink
              title="Delete Username"
              link="https://www.evvm.info/docs/SignatureStructures/NameService/flushUsernameStructure"
            />
            <p className={styles.note}>
              This function deletes all metadata associated with a username but does not remove the
              offers made on that username.
            </p>

            <NumberInputWithGenerator
              label="NameService Nonce"
              inputId="nonceNameServiceInput_flushUsername"
              placeholder="Enter nonce"
            />

            <TextInputField
              label="Username"
              inputId="usernameInput_flushUsername"
              placeholder="Enter username"
            />

            <NumberInputField
              label="Priority fee"
              inputId="priorityFeeInput_flushUsername"
              placeholder="Enter priority fee"
            />

            <PrioritySelector onPriorityChange={setPriority} />

            <NumberInputWithGenerator
              label="EVVM Nonce"
              inputId="nonceEVVMInput_flushUsername"
              placeholder="Enter nonce"
              showRandomBtn={priority !== "low"}
            />

            {priority === "low" && (
              <HelperInfo label="How to find my sync nonce?">
                <div>
                  You can retrieve your next sync nonce from the EVVM contract using the{" "}
                  <code>getNextCurrentSyncNonce</code> function.
                </div>
              </HelperInfo>
            )}

            <button onClick={handleFlushUsername} className={styles.submitButton}>
              Create signature
            </button>

            <DataDisplayWithClear
              dataToGet={dataToGet}
              onClear={() => setDataToGet(null)}
              onExecute={executeTransaction}
            />
          </div>
        )}
      </div>
    </div>
  );
}
