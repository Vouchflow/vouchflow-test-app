import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import type { DeviceInfo } from '../sdk/types';
import type { IVouchflowClient } from '../sdk/VouchflowClient';

export interface UseDeviceStateResult {
  deviceInfo: DeviceInfo | null;
  isSimulator: boolean;
  refresh: (client: IVouchflowClient) => Promise<void>;
  wipe: (client: IVouchflowClient) => Promise<void>;
  setDeviceInfo: (info: DeviceInfo | null) => void;
}

// Heuristic: emulators typically report brand as 'generic' or 'unknown' on Android
const IS_SIMULATOR = Platform.OS === 'ios'
  ? false // Can't truly detect on iOS without native module
  : false; // Will be updated via device info

export function useDeviceState(): UseDeviceStateResult {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isSimulator, setIsSimulator] = useState<boolean>(IS_SIMULATOR);

  const refresh = useCallback(async (client: IVouchflowClient) => {
    try {
      const info = await client.getDeviceInfo();
      setDeviceInfo(info);
    } catch {
      // Device not enrolled yet — that's okay
      setDeviceInfo(null);
    }
  }, []);

  const wipe = useCallback(async (client: IVouchflowClient) => {
    await client.wipeAndReset();
    setDeviceInfo(null);
  }, []);

  return { deviceInfo, isSimulator, refresh, wipe, setDeviceInfo };
}
