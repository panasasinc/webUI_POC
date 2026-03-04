import type { PerformanceSummary, PerformanceDataPoint } from '@vdura/shared';
import type { IPerformanceService } from '../types.js';

function generateHistory(hours: number): PerformanceDataPoint[] {
  const points: PerformanceDataPoint[] = [];
  const now = Date.now();
  for (let i = hours; i >= 0; i--) {
    const ts = new Date(now - i * 3600_000).toISOString();
    points.push({
      timestamp: ts,
      readIOPS: 8000 + Math.round(Math.random() * 4000),
      writeIOPS: 3000 + Math.round(Math.random() * 2000),
      readThroughputMBs: 400 + Math.round(Math.random() * 200),
      writeThroughputMBs: 150 + Math.round(Math.random() * 100),
      readLatencyMs: 0.3 + Math.random() * 0.4,
      writeLatencyMs: 0.5 + Math.random() * 0.6,
    });
  }
  return points;
}

export class MockPerformanceService implements IPerformanceService {
  async getSummary(_intervalMs?: number): Promise<PerformanceSummary> {
    const history = generateHistory(24);
    const latest = history[history.length - 1];
    return {
      currentIOPS: latest.readIOPS + latest.writeIOPS,
      currentThroughputMBs: latest.readThroughputMBs + latest.writeThroughputMBs,
      currentLatencyMs: (latest.readLatencyMs + latest.writeLatencyMs) / 2,
      history,
    };
  }
}
