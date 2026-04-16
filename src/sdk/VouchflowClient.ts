import type {
  DeviceInfo,
  Session,
  VerificationResult,
  FallbackResult,
  OTPResult,
  ReputationResult,
  LogEntry,
  SDKError,
} from './types';

// ─── Client configuration ────────────────────────────────────────────────────

export interface VouchflowClientConfig {
  baseUrl: string;
  /** Write-scoped key (starts with vsk_live_ or vsk_test_). Passed to the native SDK configure(). */
  writeKey: string;
  /** Read-scoped key. Used for server-side reputation queries. */
  readKey: string;
  onLog?: (entry: LogEntry) => void;
}

// ─── SDK Client Interface ────────────────────────────────────────────────────

export interface IVouchflowClient {
  // Device enrollment
  enroll(): Promise<DeviceInfo>;
  getDeviceInfo(): Promise<DeviceInfo>;
  wipeAndReset(): Promise<void>;

  // Sessions
  createSession(userId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session>;

  // Verification
  verify(sessionId: string): Promise<VerificationResult>;
  requestFallback(sessionId: string, email: string): Promise<FallbackResult>;
  submitOTP(otpToken: string, code: string): Promise<OTPResult>;

  // Network graph
  optInToGraph(namespace: string): Promise<void>;
  queryReputation(namespace: string): Promise<ReputationResult>;

  // Debug / test controls (mock only)
  tamperNextSignature?: () => void;
  forceExpireSession?: (sessionId: string) => void;
  hammerRateLimit?: (count: number) => Promise<Array<{ attempt: number; statusCode: number }>>;
  simulateReinstall?: () => void;
}
