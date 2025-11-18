.PHONY: install compile anvil deployLocalTestnet deployTestnet test clean seeSizes help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RESET := \033[0m

help:
	@echo "$(BLUE)Scaffold-EVVM Contracts Makefile$(RESET)"
	@echo ""
	@echo "$(GREEN)Available commands:$(RESET)"
	@echo "  make install           - Install dependencies and submodules"
	@echo "  make compile           - Compile contracts"
	@echo "  make anvil             - Start local Anvil blockchain"
	@echo "  make deployLocalTestnet - Deploy EVVM to local Anvil"
	@echo "  make deployTestnet NETWORK=eth|arb - Deploy to testnet"
	@echo "  make test              - Run contract tests"
	@echo "  make clean             - Clean build artifacts"
	@echo "  make seeSizes          - Show contract sizes"

install:
	@echo "$(BLUE)Installing dependencies...$(RESET)"
	@npm install
	@echo "$(BLUE)Initializing git submodules...$(RESET)"
	@git submodule update --init --recursive || echo "Note: Submodules may need manual initialization"
	@echo "$(GREEN)Installation complete!$(RESET)"

compile:
	@echo "$(BLUE)Compiling contracts...$(RESET)"
	@forge build
	@echo "$(GREEN)Compilation complete!$(RESET)"

anvil:
	@echo "$(BLUE)Starting Anvil local blockchain...$(RESET)"
	@anvil --host 0.0.0.0

deployLocalTestnet:
	@echo "$(BLUE)Deploying to local Anvil...$(RESET)"
	@forge script lib/Testnet-Contracts/script/DeployTestnetOnAnvil.s.sol:DeployTestnetOnAnvil \
		--rpc-url localhost \
		--broadcast \
		--legacy
	@echo "$(GREEN)Local deployment complete!$(RESET)"
	@npm run generate-summary

deployTestnet:
	@if [ "$(NETWORK)" = "eth" ]; then \
		echo "$(BLUE)Deploying to Ethereum Sepolia...$(RESET)"; \
		forge script lib/Testnet-Contracts/script/DeployTestnet.s.sol:DeployTestnet \
			--rpc-url sepolia \
			--account defaultKey \
			--broadcast \
			--verify \
			--legacy \
			--etherscan-api-key $(ETHERSCAN_API); \
	elif [ "$(NETWORK)" = "arb" ]; then \
		echo "$(BLUE)Deploying to Arbitrum Sepolia...$(RESET)"; \
		forge script lib/Testnet-Contracts/script/DeployTestnet.s.sol:DeployTestnet \
			--rpc-url arbitrumSepolia \
			--account defaultKey \
			--broadcast \
			--verify \
			--legacy \
			--etherscan-api-key $(ETHERSCAN_API); \
	else \
		echo "$(RED)Error: NETWORK must be 'eth' or 'arb'$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Testnet deployment complete!$(RESET)"
	@npm run generate-summary

test:
	@echo "$(BLUE)Running tests...$(RESET)"
	@forge test -vv

clean:
	@echo "$(BLUE)Cleaning build artifacts...$(RESET)"
	@forge clean
	@echo "$(GREEN)Clean complete!$(RESET)"

seeSizes:
	@forge build --sizes
