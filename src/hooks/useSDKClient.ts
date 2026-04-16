import { useState, useEffect, useRef } from 'react';
import { DEBUG_CONFIG, ENVIRONMENTS } from '../config/debug.config';
import { MockVouchflowClient } from '../sdk/MockVouchflowClient';
import { RealVouchflowClient } from '../sdk/RealVouchflowClient';
import type { IVouchflowClient } from '../sdk/VouchflowClient';
import type { LogEntry, EnvName } from '../sdk/types';

export interface UseSDKClientResult {
  client: IVouchflowClient | null;
  env: EnvName;
  setEnv: (env: EnvName) => void;
  useMock: boolean;
  setUseMock: (val: boolean) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  customerId: string;
  setCustomerId: (id: string) => void;
}

export function useSDKClient(
  onLog: (entry: LogEntry) => void,
): UseSDKClientResult {
  const [env, setEnvState] = useState<EnvName>(DEBUG_CONFIG.defaultEnv);
  const [useMock, setUseMock] = useState<boolean>(DEBUG_CONFIG.useMockSDK);
  const [apiKey, setApiKey] = useState<string>(ENVIRONMENTS[DEBUG_CONFIG.defaultEnv].apiKey);
  const [customerId, setCustomerId] = useState<string>('');
  const [client, setClient] = useState<IVouchflowClient | null>(null);
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  // When env changes, reset apiKey to the new env's default
  function setEnv(newEnv: EnvName) {
    setEnvState(newEnv);
    setApiKey(ENVIRONMENTS[newEnv].apiKey);
  }

  useEffect(() => {
    const envConfig = ENVIRONMENTS[env];
    if (useMock) {
      setClient(new MockVouchflowClient({
        baseUrl: envConfig.baseUrl,
        apiKey,
        customerId,
        onLog: (entry: LogEntry) => onLogRef.current(entry),
      }));
    } else {
      setClient(new RealVouchflowClient({
        baseUrl: envConfig.baseUrl,
        apiKey,
        customerId,
        onLog: (entry: LogEntry) => onLogRef.current(entry),
      }));
    }
  }, [env, useMock, apiKey, customerId]);

  return { client, env, setEnv, useMock, setUseMock, apiKey, setApiKey, customerId, setCustomerId };
}
