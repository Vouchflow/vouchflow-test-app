import { Platform } from 'react-native';

export const ENVIRONMENTS = {
  sandbox: {
    baseUrl: 'https://sandbox.api.vouchflow.dev',
    writeKey: '',
    readKey: '',
  },
  production: {
    baseUrl: 'https://api.vouchflow.dev',
    writeKey: '',
    readKey: '',
  },
} as const;

export const DEBUG_CONFIG = {
  defaultEnv: 'sandbox' as const,
  useMockSDK: false,
  defaultUserId: 'test_user_001',
  defaultNetworkNamespace: 'vouchflow_internal',
  rateLimitThreshold: 10,
  sessionTTLSeconds: 300,
  simulatorWarning: Platform.OS === 'ios',
};
