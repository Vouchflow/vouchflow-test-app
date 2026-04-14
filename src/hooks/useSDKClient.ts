import { useState, useEffect, useRef, useCallback } from 'react';
import { DEBUG_CONFIG, ENVIRONMENTS } from '../config/debug.config';
import { MockVouchflowClient } from '../sdk/MockVouchflowClient';
import type { IVouchflowClient } from '../sdk/VouchflowClient';
import type { LogEntry, EnvName } from '../sdk/types';

export interface UseSDKClientResult {
  client: IVouchflowClient | null;
  env: EnvName;
  setEnv: (env: EnvName) => void;
}

export function useSDKClient(
  onLog: (entry: LogEntry) => void,
): UseSDKClientResult {
  const [env, setEnv] = useState<EnvName>(DEBUG_CONFIG.defaultEnv);
  const [client, setClient] = useState<IVouchflowClient | null>(null);
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  useEffect(() => {
    const envConfig = ENVIRONMENTS[env];
    if (DEBUG_CONFIG.useMockSDK) {
      const mock = new MockVouchflowClient({
        baseUrl: envConfig.baseUrl,
        apiKey: envConfig.apiKey,
        onLog: (entry: LogEntry) => onLogRef.current(entry),
      });
      setClient(mock);
    } else {
      // Real SDK integration point — swap in your real client here
      const mock = new MockVouchflowClient({
        baseUrl: envConfig.baseUrl,
        apiKey: envConfig.apiKey,
        onLog: (entry: LogEntry) => onLogRef.current(entry),
      });
      setClient(mock);
    }
  }, [env]);

  return { client, env, setEnv };
}
