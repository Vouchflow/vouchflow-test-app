// ─── Core enums ────────────────────────────────────────────────────────────

export type EnvName = 'local' | 'staging' | 'production';

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';

export type VerificationStatus = 'verified' | 'pending' | 'failed';

export type LogEntryType = 'request' | 'response' | 'error' | 'warn' | 'info' | 'debug';

export type LogDirection = 'out' | 'in' | 'event';

// ─── Device ────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  deviceId: string;           // dk_ prefix
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
  enrolled: boolean;
  enrolledAt?: string;        // ISO string
  attestationToken?: string;
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export interface Session {
  sessionId: string;          // ses_ prefix
  userId: string;
  status: SessionStatus;
  createdAt: string;
  expiresAt: string;
  deviceId: string;
}

// ─── Verification ───────────────────────────────────────────────────────────

export interface VerificationResult {
  status: VerificationStatus;
  challengeId: string;
  latencyMs: number;
  signatureValid: boolean;
  attestationValid: boolean;
}

export interface FallbackResult {
  otpToken: string;
  expiresInSeconds: number;
  channel: 'email';
}

export interface OTPResult {
  verified: boolean;
  sessionId?: string;
}

// ─── Network Graph ──────────────────────────────────────────────────────────

export interface ReputationSignal {
  key: string;
  label: string;
  score: number;          // 0-100
  weight: number;         // 0-1
  direction: 'positive' | 'negative' | 'neutral';
}

export interface ReputationResult {
  namespace: string;
  overallScore: number;   // 0-100
  signals: ReputationSignal[];
  peerCount: number;
  computedAt: string;
}

// ─── Log entries ─────────────────────────────────────────────────────────────

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogEntryType;
  direction: LogDirection;
  method: string;
  endpoint: string;
  statusCode?: number;
  latencyMs?: number;
  request?: object;
  response?: object;
  error?: string;
}

// ─── SDK errors ─────────────────────────────────────────────────────────────

export interface SDKError {
  code: number;
  message: string;
  detail?: string;
}
