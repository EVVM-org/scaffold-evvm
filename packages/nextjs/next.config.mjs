import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
// This ensures frontend uses the same .env file as contracts
dotenv.config({ path: join(__dirname, '..', '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: join(__dirname, '..'),

  // Make root environment variables available to Next.js
  env: {
    NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
    NEXT_PUBLIC_EVVM_ADDRESS: process.env.NEXT_PUBLIC_EVVM_ADDRESS,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_EVVM_ID: process.env.NEXT_PUBLIC_EVVM_ID,
  },

  // Suppress punycode deprecation warning
  webpack: (config, { isServer }) => {
    // Set up fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      punycode: false,
      '@react-native-async-storage/async-storage': false,
    };

    // Externalize packages that cause issues
    if (isServer) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding', 'punycode');
    }

    // Ignore React Native modules in browser builds
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': join(__dirname, 'src', 'polyfills', 'async-storage.ts'),
      };
    }

    // Handle module resolution
    config.resolve.extensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.mjs'];

    return config;
  },

  // Experimental features
  experimental: {
    esmExternals: 'loose',
  },
};

export default nextConfig;
