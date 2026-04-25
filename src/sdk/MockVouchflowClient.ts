import type { IVouchflowClient, VouchflowClientConfig } from './VouchflowClient';
import type {
  DeviceInfo,
  Session,
  SessionStatus,
  VerificationResult,
  FallbackResult,
  OTPResult,
  DeviceReputation,
  LogEntry,
  SDKError,
} from './types';
import { DEBUG_CONFIG } from '../config/debug.config';

// ─── Utilities ───────────────────────────────────────────────────────────────

function randomHex(len: number): string {
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function makeDeviceId(): string {
  return 'dk_' + randomHex(8);
}

function makeSessionId(): string {
  return 'ses_' + randomHex(8);
}

function makeOtpToken(): string {
  return 'otp_' + randomHex(16);
}

function makeLogId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function randomDelay(min = 200, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isoNow(): string {
  return new Date().toISOString();
}

function isoFuture(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

// ─── Mock state ──────────────────────────────────────────────────────────────

interface MockState {
  deviceId: string | null;
  enrolledAt: string | null;
  sessions: Map<string, Session>;
  requestCount: number;
  tamperFlag: boolean;
}

// ─── MockVouchflowClient ─────────────────────────────────────────────────────

export class MockVouchflowClient implements IVouchflowClient {
  private config: VouchflowClientConfig;
  private state: MockState;

  constructor(config: VouchflowClientConfig) {
    this.config = config;
    this.state = {
      deviceId: null,
      enrolledAt: null,
      sessions: new Map(),
      requestCount: 0,
      tamperFlag: false,
    };
  }

  // ─── Logging helpers ───────────────────────────────────────────────────────

  private emitRequest(method: string, endpoint: string, request?: object): { startTime: number } {
    const startTime = Date.now();
    const entry: LogEntry = {
      id: makeLogId(),
      timestamp: startTime,
      type: 'request',
      direction: 'out',
      method,
      endpoint,
      request,
    };
    this.config.onLog?.(entry);
    return { startTime };
  }

  private emitResponse(
    method: string,
    endpoint: string,
    startTime: number,
    statusCode: number,
    request?: object,
    response?: object,
  ): void {
    const latencyMs = Date.now() - startTime;
    const type = statusCode >= 400 ? 'error' : 'response';
    const entry: LogEntry = {
      id: makeLogId(),
      timestamp: Date.now(),
      type,
      direction: 'in',
      method,
      endpoint,
      statusCode,
      latencyMs,
      request,
      response,
    };
    this.config.onLog?.(entry);
  }

  private emitError(
    method: string,
    endpoint: string,
    startTime: number,
    statusCode: number,
    errorMessage: string,
    request?: object,
  ): void {
    const latencyMs = Date.now() - startTime;
    const entry: LogEntry = {
      id: makeLogId(),
      timestamp: Date.now(),
      type: 'error',
      direction: 'in',
      method,
      endpoint,
      statusCode,
      latencyMs,
      error: errorMessage,
      request,
    };
    this.config.onLog?.(entry);
  }

  private checkRateLimit(): boolean {
    this.state.requestCount++;
    return this.state.requestCount > DEBUG_CONFIG.rateLimitThreshold;
  }

  // ─── Device enrollment ─────────────────────────────────────────────────────

  async enroll(): Promise<DeviceInfo> {
    const endpoint = '/v1/device/enroll';
    const req = { platform: 'android', appVersion: '0.1.0' };
    const { startTime } = this.emitRequest('POST', endpoint, req);
    await randomDelay();

    if (this.checkRateLimit()) {
      const err: SDKError = { code: 429, message: 'Rate limit exceeded' };
      this.emitError('POST', endpoint, startTime, 429, err.message, req);
      throw err;
    }

    if (!this.state.deviceId) {
      this.state.deviceId = makeDeviceId();
      this.state.enrolledAt = isoNow();
    }

    const info: DeviceInfo = {
      deviceId: this.state.deviceId,
      platform: 'android',
      osVersion: '14.0',
      appVersion: '0.1.0',
      enrolled: true,
      enrolledAt: this.state.enrolledAt!,
      attestationToken: 'attest_' + randomHex(32),
    };

    this.emitResponse('POST', endpoint, startTime, 200, req, info);
    return info;
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    const endpoint = '/v1/device/info';
    const { startTime } = this.emitRequest('GET', endpoint);
    await randomDelay(100, 400);

    if (!this.state.deviceId) {
      this.emitError('GET', endpoint, startTime, 404, 'Device not enrolled', undefined);
      const err: SDKError = { code: 404, message: 'Device not enrolled' };
      throw err;
    }

    const info: DeviceInfo = {
      deviceId: this.state.deviceId,
      platform: 'android',
      osVersion: '14.0',
      appVersion: '0.1.0',
      enrolled: true,
      enrolledAt: this.state.enrolledAt!,
    };

    this.emitResponse('GET', endpoint, startTime, 200, undefined, info);
    return info;
  }

  async wipeAndReset(): Promise<void> {
    const endpoint = '/v1/device/wipe';
    const req = { deviceId: this.state.deviceId };
    const { startTime } = this.emitRequest('DELETE', endpoint, req);
    await randomDelay(300, 600);

    this.state.deviceId = null;
    this.state.enrolledAt = null;
    this.state.sessions.clear();
    this.state.requestCount = 0;

    this.emitResponse('DELETE', endpoint, startTime, 204, req, { wiped: true });
  }

  // ─── Sessions ──────────────────────────────────────────────────────────────

  async createSession(userId: string): Promise<Session> {
    const endpoint = '/v1/sessions';
    const req = { userId, deviceId: this.state.deviceId };
    const { startTime } = this.emitRequest('POST', endpoint, req);
    await randomDelay();

    if (this.checkRateLimit()) {
      const err: SDKError = { code: 429, message: 'Rate limit exceeded' };
      this.emitError('POST', endpoint, startTime, 429, err.message, req);
      throw err;
    }

    if (!this.state.deviceId) {
      const err: SDKError = { code: 400, message: 'Device not enrolled — call enroll() first' };
      this.emitError('POST', endpoint, startTime, 400, err.message, req);
      throw err;
    }

    const session: Session = {
      sessionId: makeSessionId(),
      userId,
      status: 'ACTIVE',
      createdAt: isoNow(),
      expiresAt: isoFuture(DEBUG_CONFIG.sessionTTLSeconds),
      deviceId: this.state.deviceId,
    };

    this.state.sessions.set(session.sessionId, session);
    this.emitResponse('POST', endpoint, startTime, 201, req, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session> {
    const endpoint = `/v1/sessions/${sessionId}`;
    const { startTime } = this.emitRequest('GET', endpoint);
    await randomDelay(100, 350);

    const session = this.state.sessions.get(sessionId);
    if (!session) {
      const err: SDKError = { code: 404, message: `Session ${sessionId} not found` };
      this.emitError('GET', endpoint, startTime, 404, err.message, undefined);
      throw err;
    }

    // Auto-expire check
    if (new Date(session.expiresAt) < new Date()) {
      session.status = 'EXPIRED';
    }

    this.emitResponse('GET', endpoint, startTime, 200, undefined, session);
    return session;
  }

  // ─── Verification ──────────────────────────────────────────────────────────

  async verify(sessionId: string): Promise<VerificationResult> {
    const endpoint = `/v1/verify/${sessionId}`;
    const req = { sessionId, tampered: this.state.tamperFlag };
    const { startTime } = this.emitRequest('POST', endpoint, req);
    await randomDelay(300, 700);

    const session = this.state.sessions.get(sessionId);
    if (!session) {
      const err: SDKError = { code: 404, message: `Session ${sessionId} not found` };
      this.emitError('POST', endpoint, startTime, 404, err.message, req);
      throw err;
    }

    if (session.status === 'EXPIRED') {
      const err: SDKError = { code: 401, message: 'Session expired — please create a new session' };
      this.emitError('POST', endpoint, startTime, 401, err.message, req);
      throw err;
    }

    if (this.state.tamperFlag) {
      this.state.tamperFlag = false;
      const err: SDKError = { code: 401, message: 'Signature verification failed — possible tampering detected', detail: 'SIGNATURE_INVALID' };
      this.emitError('POST', endpoint, startTime, 401, err.message, req);
      throw err;
    }

    const result: VerificationResult = {
      status: 'verified',
      deviceToken: 'dvt_' + randomHex(16),
      latencyMs: Date.now() - startTime,
      signatureValid: true,
      attestationValid: true,
    };

    this.emitResponse('POST', endpoint, startTime, 200, req, result);
    return result;
  }

  async requestFallback(sessionId: string, email: string): Promise<FallbackResult> {
    const endpoint = `/v1/verify/${sessionId}/fallback`;
    const req = { sessionId, emailHash: email.replace(/./g, '*').slice(0, 8) + '...' };
    const { startTime } = this.emitRequest('POST', endpoint, req);
    await randomDelay(400, 800);

    const session = this.state.sessions.get(sessionId);
    if (!session) {
      const err: SDKError = { code: 404, message: `Session ${sessionId} not found` };
      this.emitError('POST', endpoint, startTime, 404, err.message, req);
      throw err;
    }

    const result: FallbackResult = {
      otpToken: makeOtpToken(),
      expiresInSeconds: 300,
      channel: 'email',
    };

    this.emitResponse('POST', endpoint, startTime, 200, req, result);
    return result;
  }

  async submitOTP(otpToken: string, code: string): Promise<OTPResult> {
    const endpoint = '/v1/verify/otp/submit';
    const req = { otpToken, codeLength: code.length };
    const { startTime } = this.emitRequest('POST', endpoint, req);
    await randomDelay(300, 600);

    // Mock: any 6-digit code that's all-same-digit fails; anything else passes
    const allSame = code.split('').every(c => c === code[0]);
    if (allSame || code.length !== 6) {
      const result: OTPResult = { verified: false };
      this.emitResponse('POST', endpoint, startTime, 400, req, { verified: false, error: 'Invalid OTP code' });
      return result;
    }

    const result: OTPResult = {
      verified: true,
      sessionId: makeSessionId(),
    };
    this.emitResponse('POST', endpoint, startTime, 200, req, result);
    return result;
  }

  // ─── Network graph ─────────────────────────────────────────────────────────

  async optInToGraph(namespace: string): Promise<void> {
    const endpoint = `/v1/graph/${namespace}/opt-in`;
    const req = { namespace, deviceId: this.state.deviceId };
    const { startTime } = this.emitRequest('POST', endpoint, req);
    await randomDelay(200, 500);
    this.emitResponse('POST', endpoint, startTime, 204, req, { optedIn: true, namespace });
  }

  // ─── Device reputation ─────────────────────────────────────────────────────

  async queryReputation(deviceToken: string): Promise<DeviceReputation> {
    const endpoint = `/v1/device/${deviceToken}/reputation`;
    const { startTime } = this.emitRequest('GET', endpoint);
    await randomDelay(300, 700);

    if (!this.state.deviceId) {
      const err: SDKError = { code: 404, message: 'Device not enrolled' };
      this.emitError('GET', endpoint, startTime, 404, err.message, undefined);
      throw err;
    }

    const ageDays = this.state.enrolledAt
      ? Math.floor((Date.now() - new Date(this.state.enrolledAt).getTime()) / 86_400_000)
      : 0;

    const result: DeviceReputation = {
      device_token: deviceToken,
      first_seen: this.state.enrolledAt ?? isoNow(),
      last_seen: isoNow(),
      total_verifications: 3 + Math.floor(Math.random() * 10),
      network_verifications: 1 + Math.floor(Math.random() * 5),
      anomaly_flags: [],
      risk_score: Math.floor(Math.random() * 15),
      device_age_days: ageDays,
      platform: 'android',
      keychain_persistent: true,
      network_participant: true,
      last_verification: {
        confidence: 'high',
        context: 'login',
        completed_at: isoNow(),
        biometric_used: true,
        fallback_used: false,
      },
    };

    this.emitResponse('GET', endpoint, startTime, 200, undefined, result);
    return result;
  }

  // ─── Debug controls ────────────────────────────────────────────────────────

  tamperNextSignature(): void {
    this.state.tamperFlag = true;
    const entry: LogEntry = {
      id: makeLogId(),
      timestamp: Date.now(),
      type: 'warn',
      direction: 'event',
      method: 'DEBUG',
      endpoint: '/internal/tamper',
      error: 'Signature tamper flag armed — next verify() will return 401',
    };
    this.config.onLog?.(entry);
  }

  forceExpireSession(sessionId: string): void {
    const session = this.state.sessions.get(sessionId);
    if (session) {
      session.status = 'EXPIRED';
      session.expiresAt = new Date(Date.now() - 1000).toISOString();
    }
    const entry: LogEntry = {
      id: makeLogId(),
      timestamp: Date.now(),
      type: 'warn',
      direction: 'event',
      method: 'DEBUG',
      endpoint: `/internal/expire/${sessionId}`,
      error: `Session ${sessionId} forcibly expired`,
    };
    this.config.onLog?.(entry);
  }

  async hammerRateLimit(count: number): Promise<Array<{ attempt: number; statusCode: number }>> {
    const results: Array<{ attempt: number; statusCode: number }> = [];
    const threshold = DEBUG_CONFIG.rateLimitThreshold;

    for (let i = 1; i <= count; i++) {
      await randomDelay(30, 80);
      const statusCode = this.state.requestCount >= threshold ? 429 : 200;
      this.state.requestCount++;

      const entry: LogEntry = {
        id: makeLogId(),
        timestamp: Date.now(),
        type: statusCode === 429 ? 'error' : 'request',
        direction: 'out',
        method: 'POST',
        endpoint: `/v1/hammer/attempt-${i}`,
        statusCode,
        latencyMs: Math.floor(Math.random() * 100) + 30,
      };
      this.config.onLog?.(entry);
      results.push({ attempt: i, statusCode });
    }
    return results;
  }

  simulateReinstall(): void {
    this.state.deviceId = null;
    this.state.enrolledAt = null;
    this.state.sessions.clear();
    this.state.requestCount = 0;
    const entry: LogEntry = {
      id: makeLogId(),
      timestamp: Date.now(),
      type: 'warn',
      direction: 'event',
      method: 'DEBUG',
      endpoint: '/internal/reinstall',
      error: 'App reinstall simulated — all device state cleared',
    };
    this.config.onLog?.(entry);
  }
}
