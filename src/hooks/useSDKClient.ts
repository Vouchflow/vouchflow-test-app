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
  writeKey: string;
  setWriteKey: (key: string) => void;
  readKey: string;
  setReadKey: (key: string) => void;
}

export function useSDKClient(
  onLog: (entry: LogEntry) => void,
): UseSDKClientResult {
  const [env, setEnvState] = useState<EnvName>(DEBUG_CONFIG.defaultEnv);
  const [useMock, setUseMock] = useState<boolean>(DEBUG_CONFIG.useMockSDK);
  const [writeKey, setWriteKey] = useState<string>('');
  const [readKey, setReadKey] = useState<string>('');
  const [client, setClient] = useState<IVouchflowClient | null>(null);
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  function setEnv(newEnv: EnvName) {
    setEnvState(newEnv);
    setWriteKey(ENVIRONMENTS[newEnv].writeKey);
    setReadKey(ENVIRONMENTS[newEnv].readKey);
  }

  useEffect(() => {
    const envConfig = ENVIRONMENTS[env];
    const cfg = {
      baseUrl: envConfig.baseUrl,
      writeKey,
      readKey,
      onLog: (entry: LogEntry) => onLogRef.current(entry),
    };
    if (useMock) {
      setClient(new MockVouchflowClient(cfg));
    } else {
      setClient(new RealVouchflowClient(cfg));
    }
  }, [env, useMock, writeKey, readKey]);

  return { client, env, setEnv, useMock, setUseMock, writeKey, setWriteKey, readKey, setReadKey };
}
