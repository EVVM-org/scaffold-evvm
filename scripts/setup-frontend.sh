#!/bin/bash

# EVVM Development Setup Script
# 
# This script initializes the Next.js frontend for EVVM development
# Run it after cloning or when you need to reset the development environment

set -e

echo "🚀 Setting up EVVM Frontend Development Environment"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NEXTJS_DIR="$( cd "$SCRIPT_DIR/../packages/nextjs" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "📁 Workspace: $ROOT_DIR"
echo "📁 Frontend: $NEXTJS_DIR"
echo ""

# Check if .env exists
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo "⚠️  .env file not found"
    if [ -f "$ROOT_DIR/.env.example" ]; then
        echo "📋 Creating .env from .env.example..."
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
        echo "✅ .env created. Please edit it with your configuration values."
        echo ""
    fi
else
    echo "✅ .env file found"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "$NEXTJS_DIR/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd "$NEXTJS_DIR"
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Clear Next.js cache to ensure fresh build
if [ -d "$NEXTJS_DIR/.next" ]; then
    echo "🧹 Clearing Next.js cache..."
    rm -rf "$NEXTJS_DIR/.next"
    echo "✅ Cache cleared"
    echo ""
fi

# Validate configuration
echo "📋 Validating EVVM configuration..."
if command -v npx &> /dev/null; then
    cd "$ROOT_DIR"
    npx tsx scripts/validate-evvm-config.ts || true
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📚 Next steps:"
echo ""
echo "1. Configure your environment:"
echo "   - Edit .env with your EVVM deployment details"
echo "   - Set NEXT_PUBLIC_EVVM_ADDRESS and NEXT_PUBLIC_CHAIN_ID"
echo ""
echo "2. Start development server:"
echo "   cd packages/nextjs && npm run dev"
echo ""
echo "3. Open browser:"
echo "   http://localhost:3000"
echo ""
echo "💡 Need to deploy EVVM? Run in the contracts directory:"
echo "   npm run wizard"
echo ""
