import { NativeModules } from 'react-native';
import type { IVouchflowClient, VouchflowClientConfig } from './VouchflowClient';
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

const { VouchflowBridge } = NativeModules;

function makeLogId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Real SDK client — delegates to the native VouchflowBridgeModule (Kotlin).
 * Biometric prompt is raised by the device OS. Email OTP is delivered via
 * the Vouchflow server (Resend).
 *
 * Sessions are managed internally by the SDK — the sessionId from verify()
 * is stored and reused for requestFallback() / submitFallbackOtp().
 */
export class RealVouchflowClient implements IVouchflowClient {
  private config: VouchflowClientConfig;
  private lastSessionId: string | null = null;
  private configured = false;

  constructor(config: VouchflowClientConfig) {
    this.config = config;
  }

  private log(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    this.config.onLog?.({
      id: makeLogId(),
      timestamp: Date.now(),
      ...entry,
    });
  }

  private async ensureConfigured(): Promise<void> {
    if (this.configured) return;

    const { writeKey, baseUrl } = this.config;

    if (!writeKey || !writeKey.startsWith('vsk_')) {
      const err: SDKError = {
        code: 400,
        message: 'Write key is required and must start with "vsk_". Enter it in the API CONFIG section.',
      };
      throw err;
    }

    const env = baseUrl.includes('sandbox') ? 'sandbox' : 'production';
    await VouchflowBridge.configure(writeKey, env);
    this.configured = true;
  }

  // ── Enrollment ──────────────────────────────────────────────────────────────
  // Enrollment is automatic on the first verify() call in the real SDK.
  // This returns synthetic device info without triggering configure, so the
  // user can see device state before entering API credentials.

  async enroll(): Promise<DeviceInfo> {
    this.log({ type: 'info', direction: 'event', method: 'SDK', endpoint: '/internal/configure',
      response: { note: 'Real SDK: enrollment is automatic on first verify()' } });
    return {
      deviceId: 'real_device',
      platform: 'android',
      osVersion: String(require('react-native').Platform.Version),
      appVersion: '0.1.0',
      enrolled: false,
    };
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    return this.enroll();
  }

  async wipeAndReset(): Promise<void> {
    this.configured = false;
    this.lastSessionId = null;
    this.log({ type: 'warn', direction: 'event', method: 'SDK', endpoint: '/internal/wipe',
      error: 'Real SDK: wipe clears local state only. AccountManager data persists on device.' });
  }

  // ── Sessions ────────────────────────────────────────────────────────────────
  // Session lifecycle is managed internally by the SDK's VerificationManager.

  async createSession(userId: string): Promise<Session> {
    const sessionId = 'real_ses_' + Math.random().toString(36).slice(2);
    this.lastSessionId = sessionId;
    this.log({ type: 'info', direction: 'event', method: 'SDK', endpoint: '/internal/session',
      response: { note: 'Real SDK: session will be created by the SDK during verify()', userId } });
    const now = new Date();
    return {
      sessionId,
      userId,
      status: 'ACTIVE',
      createdAt: isoNow(),
      expiresAt: new Date(now.getTime() + 300_000).toISOString(),
      deviceId: 'real_device',
    };
  }

  async getSession(sessionId: string): Promise<Session> {
    return {
      sessionId,
      userId: 'real_user',
      status: 'ACTIVE',
      createdAt: isoNow(),
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      deviceId: 'real_device',
    };
  }

  // ── Verification ────────────────────────────────────────────────────────────

  async verify(_sessionId: string): Promise<VerificationResult> {
    await this.ensureConfigured();
    const startTime = Date.now();
    this.log({ type: 'request', direction: 'out', method: 'POST', endpoint: '/v1/verify',
      request: { note: 'Raising device biometric prompt…' } });

    try {
      const result = await VouchflowBridge.verify();
      const latencyMs = Date.now() - startTime;
      this.lastSessionId = result.sessionId ?? _sessionId;
      this.log({ type: 'response', direction: 'in', method: 'POST', endpoint: '/v1/verify/complete',
        statusCode: 200, latencyMs, response: result });
      return {
        status: result.verified ? 'verified' : 'failed',
        challengeId: result.deviceToken ?? 'real_challenge',
        latencyMs,
        signatureValid: result.verified,
        attestationValid: true,
      };
    } catch (e: any) {
      const code = e.code ?? 'VERIFY_ERROR';
      this.log({ type: 'error', direction: 'in', method: 'POST', endpoint: '/v1/verify',
        statusCode: code === 'BIOMETRIC_CANCELLED' ? 401 : 500,
        latencyMs: Date.now() - startTime, error: e.message });
      const err: SDKError = { code: 401, message: e.message ?? String(e) };
      throw err;
    }
  }

  // ── Fallback ────────────────────────────────────────────────────────────────

  async requestFallback(sessionId: string, email: string): Promise<FallbackResult> {
    await this.ensureConfigured();
    const startTime = Date.now();
    this.log({ type: 'request', direction: 'out', method: 'POST',
      endpoint: `/v1/verify/${sessionId}/fallback`, request: { email: email.replace(/./g, '*').slice(0, 6) + '...' } });

    try {
      const result = await VouchflowBridge.requestFallback(sessionId, email);
      this.log({ type: 'response', direction: 'in', method: 'POST',
        endpoint: `/v1/verify/${sessionId}/fallback`,
        statusCode: 200, latencyMs: Date.now() - startTime, response: { expiresAt: result.expiresAt } });
      return {
        otpToken: result.fallbackSessionId,
        expiresInSeconds: 300,
        channel: 'email',
      };
    } catch (e: any) {
      this.log({ type: 'error', direction: 'in', method: 'POST',
        endpoint: `/v1/verify/${sessionId}/fallback`,
        statusCode: 500, latencyMs: Date.now() - startTime, error: e.message });
      const err: SDKError = { code: 500, message: e.message ?? String(e) };
      throw err;
    }
  }

  async submitOTP(otpToken: string, code: string): Promise<OTPResult> {
    await this.ensureConfigured();
    const startTime = Date.now();
    this.log({ type: 'request', direction: 'out', method: 'POST',
      endpoint: '/v1/verify/otp/submit', request: { codeLength: code.length } });

    try {
      const result = await VouchflowBridge.submitFallbackOtp(otpToken, code);
      this.log({ type: 'response', direction: 'in', method: 'POST',
        endpoint: '/v1/verify/otp/submit',
        statusCode: 200, latencyMs: Date.now() - startTime, response: result });
      return {
        verified: result.verified,
        sessionId: otpToken,
      };
    } catch (e: any) {
      this.log({ type: 'error', direction: 'in', method: 'POST',
        endpoint: '/v1/verify/otp/submit',
        statusCode: 400, latencyMs: Date.now() - startTime, error: e.message });
      const err: SDKError = { code: 400, message: e.message ?? String(e) };
      throw err;
    }
  }

  // ── Network Graph ────────────────────────────────────────────────────────────
  // Not available via the current SDK bridge — log and no-op.

  async optInToGraph(namespace: string): Promise<void> {
    this.log({ type: 'info', direction: 'event', method: 'SDK', endpoint: '/internal/graph',
      response: { note: 'Network graph not available in current bridge', namespace } });
  }

  async queryReputation(_namespace: string): Promise<ReputationResult> {
    const err: SDKError = { code: 501, message: 'Network graph not available in real SDK bridge' };
    throw err;
  }
}
