// ─── Core enums ────────────────────────────────────────────────────────────

export type EnvName = 'sandbox' | 'production';

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
  deviceToken: string;
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

// ─── Device reputation (GET /v1/device/:token/reputation) ───────────────────

export interface LastVerification {
  confidence: 'high' | 'medium' | 'low';
  context: string;
  completed_at: string;
  biometric_used: boolean;
  fallback_used: boolean;
}

export interface DeviceReputation {
  device_token: string;
  first_seen: string;
  last_seen: string;
  total_verifications: number;
  network_verifications: number;
  anomaly_flags: string[];
  risk_score: number;
  device_age_days: number;
  platform: string;
  keychain_persistent: boolean;
  network_participant: boolean;
  last_verification: LastVerification | null;
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
