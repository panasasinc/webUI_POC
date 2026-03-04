import type { PerformanceDataPoint, MetadataDataPoint } from '@vdura/shared';
import type { SshClient } from './SshClient.js';
import { parseSysstatStorage, parseSysstatDirector } from './parsers/sysstat.parser.js';

const MAX_HISTORY = 288; // 24h at 5-min intervals

export class PerformanceAccumulator {
  private storageHistory: PerformanceDataPoint[] = [];
  private metadataHistory: MetadataDataPoint[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private ssh: SshClient;
  private pollMs: number;
  private lastPollTime = 0;
  private polling: Promise<void> | null = null;

  constructor(ssh: SshClient, pollMs: number) {
    this.ssh = ssh;
    this.pollMs = pollMs;
  }

  start(): void {
    // Immediate first poll
    this.poll();
    this.timer = setInterval(() => this.poll(), this.pollMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStorageHistory(): PerformanceDataPoint[] {
    return this.storageHistory;
  }

  getMetadataHistory(): MetadataDataPoint[] {
    return this.metadataHistory;
  }

  getLatestStorage(): PerformanceDataPoint | undefined {
    return this.storageHistory[this.storageHistory.length - 1];
  }

  /** Poll on demand if at least `minIntervalMs` has elapsed since the last poll. */
  async pollIfStale(minIntervalMs: number): Promise<void> {
    if (Date.now() - this.lastPollTime < minIntervalMs) return;
    if (this.polling) return this.polling;
    await this.poll();
  }

  private async poll(): Promise<void> {
    this.lastPollTime = Date.now();
    try {
      const [storageResult, directorResult] = await Promise.all([
        this.ssh.execute('sysstat storage'),
        this.ssh.execute('sysstat director'),
      ]);

      const storagePoint = parseSysstatStorage(storageResult.output);
      const metadataPoint = parseSysstatDirector(directorResult.output);

      this.storageHistory.push(storagePoint);
      this.metadataHistory.push(metadataPoint);

      // Trim to rolling window
      if (this.storageHistory.length > MAX_HISTORY) {
        this.storageHistory.splice(0, this.storageHistory.length - MAX_HISTORY);
      }
      if (this.metadataHistory.length > MAX_HISTORY) {
        this.metadataHistory.splice(0, this.metadataHistory.length - MAX_HISTORY);
      }
    } catch (err) {
      console.error('[v5000] Performance poll failed:', err instanceof Error ? err.message : err);
    }
  }
}
