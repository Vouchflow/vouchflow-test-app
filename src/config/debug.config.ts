import { Platform } from 'react-native';

export const ENVIRONMENTS = {
  local: {
    baseUrl: 'http://localhost:3000',
    apiKey: 'debug_local_key',
  },
  staging: {
    baseUrl: 'https://api-staging.vouchflow.io',
    apiKey: process.env.VOUCHFLOW_STAGING_KEY ?? 'REPLACE_ME',
  },
  production: {
    baseUrl: 'https://api.vouchflow.io',
    apiKey: process.env.VOUCHFLOW_PROD_KEY ?? '',
  },
} as const;

export const DEBUG_CONFIG = {
  defaultEnv: 'local' as const,
  useMockSDK: true,
  defaultUserId: 'test_user_001',
  defaultNetworkNamespace: 'vouchflow_internal',
  rateLimitThreshold: 10,
  sessionTTLSeconds: 300,
  simulatorWarning: Platform.OS === 'ios',
};
