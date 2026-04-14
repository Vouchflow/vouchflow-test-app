import { useState, useEffect, useRef } from 'react';
import { DEBUG_CONFIG, ENVIRONMENTS } from '../config/debug.config';
import { MockVouchflowClient } from '../sdk/MockVouchflowClient';
import type { IVouchflowClient } from '../sdk/VouchflowClient';
import type { LogEntry, EnvName } from '../sdk/types';

export interface UseSDKClientResult {
  client: IVouchflowClient | null;
  env: EnvName;
  setEnv: (env: EnvName) => void;
  useMock: boolean;
  setUseMock: (val: boolean) => void;
}

export function useSDKClient(
  onLog: (entry: LogEntry) => void,
): UseSDKClientResult {
  const [env, setEnv] = useState<EnvName>(DEBUG_CONFIG.defaultEnv);
  const [useMock, setUseMock] = useState<boolean>(DEBUG_CONFIG.useMockSDK);
  const [client, setClient] = useState<IVouchflowClient | null>(null);
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  useEffect(() => {
    const envConfig = ENVIRONMENTS[env];
    if (useMock) {
      setClient(new MockVouchflowClient({
        baseUrl: envConfig.baseUrl,
        apiKey: envConfig.apiKey,
        onLog: (entry: LogEntry) => onLogRef.current(entry),
      }));
    } else {
      // Real SDK integration point — swap MockVouchflowClient for your real client here
      setClient(new MockVouchflowClient({
        baseUrl: envConfig.baseUrl,
        apiKey: envConfig.apiKey,
        onLog: (entry: LogEntry) => onLogRef.current(entry),
      }));
    }
  }, [env, useMock]);

  return { client, env, setEnv, useMock, setUseMock };
}
