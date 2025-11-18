# Environment Variables Setup

## Overview

This project uses a **unified environment configuration** approach. All environment variables are stored in a **single `.env` file at the project root**.

```
The New Scaffold-EVVM/
├── .env                    ← Single source of truth (DO NOT COMMIT)
├── .env.example            ← Template with all variables
├── contracts/
│   └── .env.example        ← Points to root .env
└── frontend/
    └── .env.example        ← Points to root .env
```

## Why Unified Configuration?

- **Single source of truth**: One place to manage all environment variables
- **No duplication**: Avoid conflicts between multiple .env files
- **Easier maintenance**: Update once, applies everywhere
- **Better organization**: Clear separation of concerns with comments

## Setup Instructions

### 1. Copy the example file

```bash
cp .env.example .env
```

### 2. Fill in your values

Edit `.env` and replace the placeholder values:

```bash
# Required: Get from https://cloud.reown.com
NEXT_PUBLIC_PROJECT_ID=your_actual_project_id

# Required for Ethereum: Get from https://etherscan.io/myapikey
ETHERSCAN_API=your_actual_etherscan_api_key

# Optional: Only needed if deploying to Arbitrum
ARBISCAN_API=your_actual_arbiscan_api_key
```

### 3. Secure your API keys

```bash
# Never commit your .env file!
# It should already be in .gitignore
chmod 600 .env
```

## Environment Variables Reference

### Frontend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_PROJECT_ID` | Yes | Reown (WalletConnect) Project ID for wallet connections |

### Contracts Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RPC_URL_ETH_SEPOLIA` | Yes | Ethereum Sepolia testnet RPC endpoint |
| `RPC_URL_ARB_SEPOLIA` | No | Arbitrum Sepolia testnet RPC endpoint |
| `ETHERSCAN_API` | Yes | Etherscan API key for contract verification |
| `ARBISCAN_API` | No | Arbiscan API key (only if using Arbitrum) |
| `DEFAULT_NETWORK` | No | Default deployment network (eth or arb) |
| `EVVM_NAME` | No | Your EVVM instance name for identification |

## How It Works

### Contracts Workspace

The contracts workspace loads environment variables from the root `.env` file via the TypeScript scripts:

```typescript
// contracts/scripts/wizard.ts
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: path.join(projectRoot, '.env') });
```

Foundry automatically loads environment variables from `.env` for commands like:
```bash
forge script --rpc-url $RPC_URL_ETH_SEPOLIA
```

### Frontend Workspace

The frontend loads environment variables through `next.config.mjs`:

```javascript
// frontend/next.config.mjs
import dotenv from 'dotenv';
dotenv.config({ path: join(__dirname, '..', '.env') });
```

Next.js automatically exposes variables prefixed with `NEXT_PUBLIC_` to the browser.

## Development Workflow

1. **Update variables**: Edit the root `.env` file
2. **Restart dev server**: Changes require restarting `npm run dev`
3. **Check loading**: Verify variables are loaded:

```bash
# Test contracts can access variables
cd contracts && npm run wizard

# Test frontend can access variables
cd frontend && npm run dev
```

## Troubleshooting

### Variables not loading in frontend

- Ensure `dotenv` is installed: `npm install`
- Restart the Next.js dev server
- Check that variable starts with `NEXT_PUBLIC_`

### Variables not loading in contracts

- Verify `.env` exists in project root
- Check variable names match exactly (case-sensitive)
- Ensure no spaces around `=` in `.env` file

### "Project ID Not Configured" warning

- Add your Reown project ID to `NEXT_PUBLIC_PROJECT_ID`
- Get one free at https://cloud.reown.com

## Best Practices

1. **Never commit** `.env` files with real credentials
2. **Use `.env.example`** to document required variables
3. **Prefix frontend variables** with `NEXT_PUBLIC_`
4. **Use separate API keys** for development and production
5. **Rotate keys** if they're accidentally committed

## Security Notes

- ✅ `.env` is in `.gitignore`
- ✅ Private keys are managed via `cast wallet import`
- ✅ API keys are read from environment variables
- ❌ Never put private keys in `.env` files
- ❌ Never commit `.env` to version control

## Need Help?

- Check `.env.example` for all available variables
- See `README.md` for general project setup
- Open an issue if you encounter problems
