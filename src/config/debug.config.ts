import { Platform } from 'react-native';

export const ENVIRONMENTS = {
  sandbox: {
    baseUrl: 'https://sandbox.api.vouchflow.dev',
    writeKey: 'vsk_sandbox_9fd2cea1f3f39efafc21efbc3adec6d9584813de',
    readKey: 'vsk_sandbox_read_87811e2ecaaaba62ff89173d104dfc2398b1e02f',
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
