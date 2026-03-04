import type { PerformanceSummary } from '@vdura/shared';
import type { IPerformanceService } from '../types.js';
import type { SimulatorSystem } from './SimulatorSystem.js';

export class SimulatorPerformanceService implements IPerformanceService {
  constructor(private sim: SimulatorSystem) {}

  async getSummary(intervalMs?: number): Promise<PerformanceSummary> {
    if (intervalMs) {
      this.sim.perfEngine.tickIfStale(intervalMs);
    }
    const latest = this.sim.perfEngine.getLatestStorage();
    return {
      currentIOPS: latest.readIOPS + latest.writeIOPS,
      currentThroughputMBs: latest.readThroughputMBs + latest.writeThroughputMBs,
      currentLatencyMs: parseFloat(((latest.readLatencyMs + latest.writeLatencyMs) / 2).toFixed(2)),
      history: this.sim.perfEngine.getStorageHistory(),
      metadataHistory: this.sim.perfEngine.getMetadataHistory(),
    };
  }
}
