import type { PerformanceDataPoint, MetadataDataPoint } from '@vdura/shared';
import { safeFloat } from './column-parser.js';

/**
 * Parse `sysstat storage` tabular output into a PerformanceDataPoint.
 *
 * Real PanCLI output format (2-line header, per-node rows, total row):
 *   OSD       IP             CPU  Disk  Op/s  Resp   KB/s  KB/s  Capacity (GB)
 *             Address          %     %        msec  Write  Read       Total    Used       Avail       Rsvd
 *   VCH-4,2   10.97.104.108    0     0     0  0.29      0     0   108711.26    8.77    96558.40   12144.09
 *   ...
 *             "Set 1" Total    0     0     0  0.23      0     0  1412049.96  105.25  1158683.87  253260.84
 */
export function parseSysstatStorage(raw: string): PerformanceDataPoint {
  const lines = raw.split('\n');

  // Look for the "Total" summary row (last data row containing "Total")
  let totalLine = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/Total/i.test(lines[i]) && /\d/.test(lines[i])) {
      totalLine = lines[i];
      break;
    }
  }

  if (totalLine) {
    // Strip the set-name prefix (e.g. `"Set 1" Total`) to avoid capturing
    // digits from the set identifier. Everything after "Total" is numeric data.
    const afterTotal = totalLine.replace(/^.*Total\s+/i, '');
    return buildStoragePoint(afterTotal);
  }

  // Fallback: use the last VCH data row
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed && /^VCH-/.test(trimmed)) {
      // Strip node name (VCH-4,2) and IP address before extracting numbers
      const afterIP = trimmed.replace(/^VCH-\S+\s+\d+\.\d+\.\d+\.\d+\s+/, '');
      return buildStoragePoint(afterIP);
    }
  }

  return emptyStoragePoint();
}

function buildStoragePoint(numericPart: string): PerformanceDataPoint {
  const numbers = numericPart.match(/[\d.]+/g);
  if (!numbers || numbers.length < 6) {
    return emptyStoragePoint();
  }

  // Numbers in order: CPU%, Disk%, Op/s, Resp(msec), Write(KB/s), Read(KB/s), ...capacity columns
  const opsPerSec = safeFloat(numbers[2]);
  const respMs = safeFloat(numbers[3]);
  const writeKBs = safeFloat(numbers[4]);
  const readKBs = safeFloat(numbers[5]);

  return {
    timestamp: new Date().toISOString(),
    readIOPS: 0, // PanCLI doesn't separate read/write IOPS
    writeIOPS: opsPerSec,
    readThroughputMBs: readKBs / 1024,
    writeThroughputMBs: writeKBs / 1024,
    readLatencyMs: respMs,
    writeLatencyMs: respMs,
  };
}

/**
 * Parse `sysstat director` tabular output into a MetadataDataPoint.
 *
 * Real PanCLI output format (2-line header, per-director rows):
 *   Director  IP              CPU    DF     DF   NFS    NFS   NFS
 *             Address        Util  msec  Ops/s  msec  Ops/s  MB/s
 *   VCH-1,1   10.97.104.11     2%     -      -     0      0     0
 *   VCH-2,1   10.97.104.114    9%     -      -     0      0     0
 *   VCH-3,1   10.97.104.113    9%     -      -     0      0     0
 */
export function parseSysstatDirector(raw: string): MetadataDataPoint {
  const lines = raw.split('\n');

  let totalDfOps = 0;
  let totalNfsOps = 0;
  let totalNfsMBs = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Data lines start with VCH- or a director name
    if (!trimmed || !(/^VCH-/i.test(trimmed) || /^[A-Z]+-\d+/.test(trimmed))) continue;

    // Extract numbers from the line
    // Format: Director  IP  CPU%  DF_msec  DF_Ops/s  NFS_msec  NFS_Ops/s  NFS_MB/s
    const parts = trimmed.split(/\s+/);
    // Skip name and IP, then: CPU%, DF_msec, DF_Ops/s, NFS_msec, NFS_Ops/s, NFS_MB/s
    if (parts.length < 8) continue;

    const cpuStr = parts[2]; // e.g., "2%"
    const dfMsec = parts[3]; // e.g., "-"
    const dfOps = parts[4];  // e.g., "-"
    const nfsMsec = parts[5];
    const nfsOps = parts[6];
    const nfsMBs = parts[7];

    totalDfOps += parseNum(dfOps);
    totalNfsOps += parseNum(nfsOps);
    totalNfsMBs += parseNum(nfsMBs);
  }

  return {
    timestamp: new Date().toISOString(),
    dfOps: totalDfOps,
    nfsOps: totalNfsOps,
  };
}

function parseNum(s: string): number {
  if (!s || s === '-') return 0;
  const n = parseFloat(s.replace('%', ''));
  return isNaN(n) ? 0 : n;
}

function emptyStoragePoint(): PerformanceDataPoint {
  return {
    timestamp: new Date().toISOString(),
    readIOPS: 0,
    writeIOPS: 0,
    readThroughputMBs: 0,
    writeThroughputMBs: 0,
    readLatencyMs: 0,
    writeLatencyMs: 0,
  };
}
