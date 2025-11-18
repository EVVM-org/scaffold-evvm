# Getting Your Reown Project ID

The Scaffold-EVVM uses **Reown AppKit** (formerly WalletConnect) for wallet connectivity. You need a free Project ID to enable wallet connections.

## Steps to Get Your Project ID

1. **Visit Reown Cloud**: Go to https://cloud.reown.com

2. **Sign Up/Sign In**: Create a free account or sign in if you already have one

3. **Create a New Project**:
   - Click "Create New Project"
   - Name it something like "Scaffold-EVVM" or "My EVVM DApp"
   - Select "AppKit" as the product

4. **Get Your Project ID**:
   - Once created, you'll see your **Project ID** on the dashboard
   - It looks like: `b56e18d47c72ab683b10814fe9495694`

5. **Add to Environment**:
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your Project ID
   # Change: NEXT_PUBLIC_PROJECT_ID=your_reown_project_id_here
   # To:     NEXT_PUBLIC_PROJECT_ID=b56e18d47c72ab683b10814fe9495694
   ```

6. **Alternative - Use Test ID** (Localhost Only):
   If you're just testing locally, you can use the default test ID already in the config:
   `b56e18d47c72ab683b10814fe9495694`

   ⚠️ **Warning**: This test ID only works on localhost and should NOT be used in production!

## Why Do I Need This?

Reown (WalletConnect) enables your users to connect their wallets (MetaMask, Rainbow, etc.) to your dApp. The Project ID:
- Is completely **free**
- Identifies your dApp in the WalletConnect network
- Enables cross-wallet compatibility
- Provides analytics on your dashboard

## Troubleshooting

**"Project ID is not defined" error**:
- Make sure you've copied `.env.example` to `.env`
- Verify that `NEXT_PUBLIC_PROJECT_ID` is set in `.env`
- Restart your development server after adding the ID

**Wallet won't connect**:
- Check that your Project ID is valid
- Ensure you're on a supported network (Sepolia or Arbitrum Sepolia)
- Try clearing your browser cache

## Need Help?

- [Reown Documentation](https://docs.reown.com/)
- [Scaffold-EVVM Setup Guide](./SETUP.md)
