/**
 * EVVM Deployment Script using Foundry Artifacts
 *
 * This script deploys EVVM contracts using Foundry-compiled artifacts.
 * Run `forge build` in packages/foundry before running this script.
 *
 * Usage:
 *   npx ts-node scripts/deploy.ts --network localhost
 *   npx ts-node scripts/deploy.ts --network sepolia
 *   npx ts-node scripts/deploy.ts --network arbitrumSepolia
 */

import { ethers } from "ethers";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../.env" });

// Network configurations
const NETWORKS: Record<string, { rpc: string; chainId: number }> = {
  localhost: {
    rpc: "http://127.0.0.1:8545",
    chainId: 31337,
  },
  hardhat: {
    rpc: "http://127.0.0.1:8545",
    chainId: 31337,
  },
  sepolia: {
    rpc: process.env.RPC_URL_ETH_SEPOLIA || "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: 11155111,
  },
  arbitrumSepolia: {
    rpc: process.env.RPC_URL_ARB_SEPOLIA || "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: 421614,
  },
};

interface AddressConfig {
  admin: string;
  goldenFisher: string;
  activator: string;
}

interface BasicMetadata {
  EvvmName: string;
  principalTokenName: string;
  principalTokenSymbol: string;
}

interface AdvancedMetadata {
  eraTokens: string;
  reward: string;
  totalSupply: string;
}

interface EvvmMetadata {
  EvvmName: string;
  EvvmID: bigint;
  principalTokenName: string;
  principalTokenSymbol: string;
  principalTokenAddress: string;
  totalSupply: bigint;
  eraTokens: bigint;
  reward: bigint;
}

interface FoundryArtifact {
  abi: any[];
  bytecode: { object: string };
  deployedBytecode: { object: string };
}

function getNetwork(): string {
  const args = process.argv.slice(2);
  const networkIdx = args.indexOf("--network");
  if (networkIdx === -1 || !args[networkIdx + 1]) {
    console.error("Usage: npx ts-node scripts/deploy.ts --network <network>");
    console.error("Available networks: localhost, sepolia, arbitrumSepolia");
    process.exit(1);
  }
  return args[networkIdx + 1];
}

function loadFoundryArtifact(contractName: string): FoundryArtifact {
  const foundryOutDir = join(__dirname, "../../foundry/out");
  const artifactPath = join(foundryOutDir, `${contractName}.sol`, `${contractName}.json`);

  if (!existsSync(artifactPath)) {
    throw new Error(
      `Foundry artifact not found: ${artifactPath}\n` +
        `Run 'cd packages/foundry && forge build' first.`
    );
  }

  return JSON.parse(readFileSync(artifactPath, "utf-8"));
}

function loadConfig(): { addresses: AddressConfig; basic: BasicMetadata; advanced: AdvancedMetadata } {
  const inputPaths = [
    join(__dirname, "..", "input"),
    join(__dirname, "..", "..", "input"),
    join(__dirname, "..", "..", "..", "input"),
  ];

  let inputDir: string | null = null;
  for (const path of inputPaths) {
    if (existsSync(path)) {
      inputDir = path;
      break;
    }
  }

  if (!inputDir) {
    throw new Error("Configuration files not found. Run 'npm run wizard' to configure.");
  }

  const addressPath = join(inputDir, "address.json");
  const basicPath = join(inputDir, "evvmBasicMetadata.json");
  const advancedPath = join(inputDir, "evvmAdvancedMetadata.json");

  if (!existsSync(addressPath)) {
    throw new Error("address.json not found. Run 'npm run wizard' to configure.");
  }

  const addresses: AddressConfig = JSON.parse(readFileSync(addressPath, "utf-8"));

  const basic: BasicMetadata = existsSync(basicPath)
    ? JSON.parse(readFileSync(basicPath, "utf-8"))
    : { EvvmName: "EVVM", principalTokenName: "Mate token", principalTokenSymbol: "MATE" };

  const advanced: AdvancedMetadata = existsSync(advancedPath)
    ? JSON.parse(readFileSync(advancedPath, "utf-8"))
    : {
        eraTokens: "1016666666500000000000000000",
        reward: "5000000000000000000",
        totalSupply: "2033333333000000000000000000",
      };

  return { addresses, basic, advanced };
}

// Global nonce tracker for sequential deployments
let currentNonce: number | null = null;

async function deployContract(
  signer: ethers.Signer,
  contractName: string,
  args: any[],
  provider: ethers.JsonRpcProvider
): Promise<ethers.BaseContract> {
  const artifact = loadFoundryArtifact(contractName);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer);

  console.log(`  Deploying ${contractName}...`);

  // Get and manage nonce explicitly
  if (currentNonce === null) {
    currentNonce = await provider.getTransactionCount(await signer.getAddress());
  }

  const contract = await factory.deploy(...args, { nonce: currentNonce });
  currentNonce++;

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`  ${contractName} deployed at: ${address}`);

  return contract;
}

async function main() {
  const networkName = getNetwork();
  const networkConfig = NETWORKS[networkName];

  if (!networkConfig) {
    console.error(`Unknown network: ${networkName}`);
    console.error("Available networks:", Object.keys(NETWORKS).join(", "));
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("EVVM Contract Deployment (Hardhat + Foundry Artifacts)");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (Chain ID: ${networkConfig.chainId})`);
  console.log(`RPC: ${networkConfig.rpc}`);
  console.log("");

  // Connect to network
  const provider = new ethers.JsonRpcProvider(networkConfig.rpc);

  // Get signer
  let signer: ethers.Signer;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (networkName === "localhost" || networkName === "hardhat") {
    // Use Hardhat/Anvil default account for local development
    const testMnemonic = "test test test test test test test test test test test junk";
    const hdWallet = ethers.Wallet.fromPhrase(testMnemonic);
    signer = hdWallet.connect(provider);
    console.log("Using test mnemonic for local deployment");
  } else if (privateKey) {
    signer = new ethers.Wallet(privateKey, provider);
  } else {
    console.error("ERROR: DEPLOYER_PRIVATE_KEY not set in .env");
    console.error("Set DEPLOYER_PRIVATE_KEY=0x... in your .env file");
    process.exit(1);
  }

  const deployerAddress = await signer.getAddress();
  console.log(`Deployer: ${deployerAddress}`);

  const balance = await provider.getBalance(deployerAddress);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  console.log("");

  // Verify Foundry artifacts exist
  const foundryOutDir = join(__dirname, "../../foundry/out");
  if (!existsSync(foundryOutDir)) {
    console.error("ERROR: Foundry artifacts not found!");
    console.error("Run 'cd packages/foundry && forge build' first.");
    process.exit(1);
  }

  // Load configuration
  const config = loadConfig();

  console.log("Configuration:");
  console.log(`  Admin: ${config.addresses.admin}`);
  console.log(`  Golden Fisher: ${config.addresses.goldenFisher}`);
  console.log(`  Activator: ${config.addresses.activator}`);
  console.log(`  EVVM Name: ${config.basic.EvvmName}`);
  console.log(`  Token: ${config.basic.principalTokenName} (${config.basic.principalTokenSymbol})`);
  console.log("");

  // Prepare metadata struct
  const metadata: EvvmMetadata = {
    EvvmName: config.basic.EvvmName,
    EvvmID: 0n,
    principalTokenName: config.basic.principalTokenName,
    principalTokenSymbol: config.basic.principalTokenSymbol,
    principalTokenAddress: "0x0000000000000000000000000000000000000001",
    totalSupply: BigInt(config.advanced.totalSupply),
    eraTokens: BigInt(config.advanced.eraTokens),
    reward: BigInt(config.advanced.reward),
  };

  console.log("Deploying contracts...\n");

  // 1. Deploy Staking
  console.log("1. Deploying Staking...");
  const staking = await deployContract(signer, "Staking", [
    config.addresses.admin,
    config.addresses.goldenFisher,
  ], provider);
  const stakingAddress = await staking.getAddress();

  // 2. Deploy Evvm
  console.log("\n2. Deploying Evvm...");
  const evvm = await deployContract(signer, "Evvm", [
    config.addresses.admin,
    stakingAddress,
    [
      metadata.EvvmName,
      metadata.EvvmID,
      metadata.principalTokenName,
      metadata.principalTokenSymbol,
      metadata.principalTokenAddress,
      metadata.totalSupply,
      metadata.eraTokens,
      metadata.reward,
    ],
  ], provider);
  const evvmAddress = await evvm.getAddress();

  // 3. Deploy Estimator
  console.log("\n3. Deploying Estimator...");
  const estimator = await deployContract(signer, "Estimator", [
    config.addresses.activator,
    evvmAddress,
    stakingAddress,
    config.addresses.admin,
  ], provider);
  const estimatorAddress = await estimator.getAddress();

  // 4. Deploy NameService
  console.log("\n4. Deploying NameService...");
  const nameService = await deployContract(signer, "NameService", [
    evvmAddress,
    config.addresses.admin,
  ], provider);
  const nameServiceAddress = await nameService.getAddress();

  // 5. Setup Staking with Estimator and Evvm
  console.log("\n5. Setting up Staking with Estimator and Evvm...");
  const setupStakingFn = staking.getFunction("_setupEstimatorAndEvvm");
  const setupStakingTx = await setupStakingFn(estimatorAddress, evvmAddress, { nonce: currentNonce });
  currentNonce!++;
  await setupStakingTx.wait();
  console.log("  Staking setup complete");

  // 6. Deploy Treasury
  console.log("\n6. Deploying Treasury...");
  const treasury = await deployContract(signer, "Treasury", [evvmAddress], provider);
  const treasuryAddress = await treasury.getAddress();

  // 7. Setup Evvm with NameService and Treasury
  console.log("\n7. Setting up Evvm with NameService and Treasury...");
  const setupEvvmFn = evvm.getFunction("_setupNameServiceAndTreasuryAddress");
  const setupEvvmTx = await setupEvvmFn(nameServiceAddress, treasuryAddress, { nonce: currentNonce });
  currentNonce!++;
  await setupEvvmTx.wait();
  console.log("  Evvm setup complete");

  // 8. Deploy P2PSwap
  console.log("\n8. Deploying P2PSwap...");
  const p2pSwap = await deployContract(signer, "P2PSwap", [
    evvmAddress,
    stakingAddress,
    config.addresses.admin,
  ], provider);
  const p2pSwapAddress = await p2pSwap.getAddress();

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: ${networkName} (Chain ID: ${networkConfig.chainId})`);
  console.log("");
  console.log("Deployed Contracts:");
  console.log(`  Staking:     ${stakingAddress}`);
  console.log(`  Evvm:        ${evvmAddress}`);
  console.log(`  Estimator:   ${estimatorAddress}`);
  console.log(`  NameService: ${nameServiceAddress}`);
  console.log(`  Treasury:    ${treasuryAddress}`);
  console.log(`  P2PSwap:     ${p2pSwapAddress}`);
  console.log("=".repeat(60));

  // Save deployment summary
  const deploymentSummary = {
    network: networkName,
    chainId: networkConfig.chainId,
    deployer: deployerAddress,
    contracts: {
      staking: stakingAddress,
      evvm: evvmAddress,
      estimator: estimatorAddress,
      nameService: nameServiceAddress,
      treasury: treasuryAddress,
      p2pSwap: p2pSwapAddress,
    },
    timestamp: new Date().toISOString(),
  };

  // Save to deployments folder
  const deploymentsDir = join(__dirname, "..", "deployments", networkName);
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }
  writeFileSync(
    join(deploymentsDir, "deployment-summary.json"),
    JSON.stringify(deploymentSummary, null, 2)
  );

  console.log(`\nDeployment summary saved to deployments/${networkName}/deployment-summary.json`);

  // Generate ABIs for frontend
  console.log("\nGenerating ABIs for frontend...");
  const abisDir = join(__dirname, "..", "..", "..", "packages", "nextjs", "contracts", "deployedContracts.ts");
  // ABIs would be generated here if needed

  console.log("\nDeployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
