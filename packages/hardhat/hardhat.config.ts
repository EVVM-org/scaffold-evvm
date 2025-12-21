import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// Note: hardhat-foundry removed due to source name conflicts
// Use forge for compilation, hardhat for deployment
import "hardhat-deploy";
import * as dotenv from "dotenv";

// Load env from project root
dotenv.config({ path: "../../.env" });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const RPC_URL_ETH_SEPOLIA = process.env.RPC_URL_ETH_SEPOLIA || "https://eth-sepolia.api.onfinality.io/public";
const RPC_URL_ARB_SEPOLIA = process.env.RPC_URL_ARB_SEPOLIA || "https://sepolia-rollup.arbitrum.io/rpc";
const ETHERSCAN_API = process.env.ETHERSCAN_API || "";
const ARBISCAN_API = process.env.ARBISCAN_API || ETHERSCAN_API;

// RPC Fallbacks
const ETH_SEPOLIA_FALLBACKS = [
  RPC_URL_ETH_SEPOLIA,
  "https://eth-sepolia.api.onfinality.io/public",
  "https://1rpc.io/sepolia",
  "https://ethereum-sepolia-rpc.publicnode.com",
];

const ARB_SEPOLIA_FALLBACKS = [
  RPC_URL_ARB_SEPOLIA,
  "https://sepolia-rollup.arbitrum.io/rpc",
  "https://arbitrum-sepolia-rpc.publicnode.com",
];

// Get first available RPC
const getWorkingRpc = (fallbacks: string[]): string => {
  for (const rpc of fallbacks) {
    if (rpc && rpc.startsWith("http")) return rpc;
  }
  return fallbacks[0] || "http://localhost:8545";
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 300,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  networks: {
    // Hardhat Network - in-memory for tests
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 0,
      },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10,
        accountsBalance: "10000000000000000000000", // 10,000 ETH
      },
    },

    // Localhost - connects to running Hardhat/Anvil node
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: DEPLOYER_PRIVATE_KEY
        ? [DEPLOYER_PRIVATE_KEY]
        : {
            mnemonic: "test test test test test test test test test test test junk",
            count: 10,
          },
    },

    // Ethereum Sepolia
    sepolia: {
      url: getWorkingRpc(ETH_SEPOLIA_FALLBACKS),
      chainId: 11155111,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasMultiplier: 1.2,
    },

    // Arbitrum Sepolia
    arbitrumSepolia: {
      url: getWorkingRpc(ARB_SEPOLIA_FALLBACKS),
      chainId: 421614,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasMultiplier: 1.2,
    },
  },

  // Named accounts for hardhat-deploy
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },

  // Etherscan verification
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API,
      arbitrumSepolia: ARBISCAN_API,
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io",
        },
      },
    ],
  },

  // Gas reporter
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },

  // TypeChain configuration
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
