import type { PerformanceSummary } from '@vdura/shared';
import type { IPerformanceService } from '../types.js';
import type { PerformanceAccumulator } from './PerformanceAccumulator.js';

export class V5000PerformanceService implements IPerformanceService {
  constructor(private accumulator: PerformanceAccumulator) {}

  async getSummary(intervalMs?: number): Promise<PerformanceSummary> {
    if (intervalMs) {
      await this.accumulator.pollIfStale(intervalMs);
    }
    const latest = this.accumulator.getLatestStorage();
    const history = this.accumulator.getStorageHistory();
    const metadataHistory = this.accumulator.getMetadataHistory();

    return {
      currentIOPS: latest ? latest.readIOPS + latest.writeIOPS : 0,
      currentThroughputMBs: latest ? latest.readThroughputMBs + latest.writeThroughputMBs : 0,
      currentLatencyMs: latest
        ? parseFloat(((latest.readLatencyMs + latest.writeLatencyMs) / 2).toFixed(2))
        : 0,
      history,
      metadataHistory: metadataHistory.length > 0 ? metadataHistory : undefined,
    };
  }
}
