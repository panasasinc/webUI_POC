import type { SystemNode, Pool, Volume, Host, Alert } from '@vdura/shared';

const TB = 1024 ** 4;
const GB = 1024 ** 3;

export interface SimulatorSeed {
  nodes: SystemNode[];
  pools: Pool[];
  volumes: Volume[];
  hosts: Host[];
  alerts: Alert[];
  systemMeta: {
    clusterName: string;
    model: string;
    serialNumber: string;
    firmwareVersion: string;
  };
}

function makeNode(
  idx: number,
  role: 'director' | 'storage',
  pool?: { id: string; name: string },
): SystemNode {
  const isDirector = role === 'director';
  const nodeNum = idx + 1;
  const status: 'online' | 'offline' = idx === 14 ? 'offline' : 'online';
  return {
    id: `node-${String(nodeNum).padStart(3, '0')}`,
    name: `Node ${nodeNum}`,
    status,
    serialNumber: `VD5KN-${String(nodeNum).padStart(3, '0')}-A`,
    firmwareVersion: '8.6.1.0',
    cpuUsagePercent: 25 + Math.round(Math.random() * 35),
    memoryUsagePercent: 40 + Math.round(Math.random() * 30),
    role,
    ipAddress: `10.10.10.${4 + idx * 3}`,
    model: isDirector ? 'VCH-5000-D1N' : 'VCH-5000',
    poolId: pool?.id,
    poolName: pool?.name,
    dataSpaceBytes: isDirector ? 0 : (50 + Math.random() * 30) * TB,
    dataSpaceTotalBytes: isDirector ? 0 : 100 * TB,
    metadataSpaceBytes: (100 + Math.random() * 200) * GB,
    metadataSpaceTotalBytes: 400 * GB,
  };
}

export function buildSeed(): SimulatorSeed {
  // 3 pools
  const pools: Pool[] = [
    {
      id: 'pool-001',
      name: 'SSD_Pool_01',
      status: 'online',
      totalCapacityBytes: 120 * TB,
      usedCapacityBytes: 72 * TB,
      availableCapacityBytes: 48 * TB,
      volumeCount: 7,
      driveCount: 24,
      raidLevel: 'RAID 6',
      tier: 'ssd',
      displayName: 'Set 1',
      compatibilityClass: 'VCH-5050',
      raidConfig: '8+2',
      vpodCount: 24,
      vpodsOnline: 24,
      metadataUsedBytes: 28 * GB,
      metadataTotalBytes: 93.98 * GB,
      nodeCount: 5,
    },
    {
      id: 'pool-002',
      name: 'Hybrid_Pool_01',
      status: 'online',
      totalCapacityBytes: 200 * TB,
      usedCapacityBytes: 110 * TB,
      availableCapacityBytes: 90 * TB,
      volumeCount: 8,
      driveCount: 36,
      raidLevel: 'RAID 6',
      tier: 'hybrid',
      displayName: 'Set 2',
      compatibilityClass: 'VCH-5050',
      raidConfig: '8+2',
      vpodCount: 36,
      vpodsOnline: 35,
      metadataUsedBytes: 42 * GB,
      metadataTotalBytes: 140 * GB,
      nodeCount: 4,
    },
    {
      id: 'pool-003',
      name: 'NL_Pool_01',
      status: 'degraded',
      totalCapacityBytes: 500 * TB,
      usedCapacityBytes: 420 * TB,
      availableCapacityBytes: 80 * TB,
      volumeCount: 6,
      driveCount: 48,
      raidLevel: 'RAID 6',
      tier: 'nearline',
      displayName: 'Set 3',
      compatibilityClass: 'VCH-5050',
      raidConfig: '8+2',
      vpodCount: 48,
      vpodsOnline: 46,
      metadataUsedBytes: 65 * GB,
      metadataTotalBytes: 186 * GB,
      nodeCount: 4,
    },
  ];

  // 3 director nodes + 13 storage nodes = 16 total
  const nodes: SystemNode[] = [];
  for (let i = 0; i < 3; i++) {
    nodes.push(makeNode(i, 'director'));
  }
  // Assign storage nodes across pools
  const storagePoolAssignment = [
    0, 0, 0, 0, 0,    // 5 nodes → pool-001
    1, 1, 1, 1,        // 4 nodes → pool-002
    2, 2, 2, 2,        // 4 nodes → pool-003
  ];
  for (let i = 0; i < 13; i++) {
    const poolIdx = storagePoolAssignment[i];
    const pool = pools[poolIdx];
    nodes.push(makeNode(3 + i, 'storage', { id: pool.id, name: pool.name }));
  }

  // 21 volumes distributed across pools
  const volumeNames = [
    'prod-db-01', 'prod-db-02', 'prod-db-replica', 'app-data-01', 'app-data-02',
    'analytics-01', 'analytics-02', 'staging-db', 'dev-vol-01', 'dev-vol-02',
    'backup-vol-01', 'backup-vol-02', 'backup-vol-03', 'archive-vol-01', 'archive-vol-02',
    'test-vol-01', 'media-store', 'log-data-01', 'log-data-02', 'scratch-01', 'compliance-01',
  ];
  const volumePool = [
    0, 0, 0, 0, 0, 0, 0,  // 7 in pool-001
    1, 1, 1, 1, 1, 1, 1, 1,  // 8 in pool-002
    2, 2, 2, 2, 2, 2,  // 6 in pool-003
  ];
  const volumeStatuses: ('online' | 'degraded' | 'offline')[] = [
    'online', 'online', 'online', 'online', 'online', 'online', 'online',
    'online', 'online', 'online', 'online', 'online', 'degraded', 'online', 'online',
    'degraded', 'online', 'online', 'online', 'online', 'offline',
  ];

  const volumes: Volume[] = volumeNames.map((name, i) => {
    const poolIdx = volumePool[i];
    const pool = pools[poolIdx];
    const capacity = (1 + Math.random() * 20) * TB;
    const usedPct = 0.3 + Math.random() * 0.5;
    return {
      id: `vol-${String(i + 1).padStart(3, '0')}`,
      name,
      status: volumeStatuses[i],
      capacityBytes: Math.round(capacity),
      usedBytes: Math.round(capacity * usedPct),
      poolId: pool.id,
      poolName: pool.name,
      hostMappings: [],
      ioGroupId: `io-grp-${i % 2}`,
      tieringPolicy: i % 3 === 0 ? 'none' : 'auto',
      compressed: i % 2 === 0,
      createdAt: new Date(Date.now() - (180 - i * 8) * 86400_000).toISOString(),
      reductionRatio: parseFloat((1.5 + Math.random() * 2.5).toFixed(1)),
      raidLevel: `RAID 6+ (${pool.raidConfig ?? '8+2'})`,
    };
  });

  // 6 hosts
  const hosts: Host[] = [
    { id: 'host-001', name: 'esxi-prod-01', ipAddress: '10.10.1.20', status: 'online' },
    { id: 'host-002', name: 'esxi-prod-02', ipAddress: '10.10.1.21', status: 'online' },
    { id: 'host-003', name: 'linux-app-01', ipAddress: '10.10.2.30', status: 'online' },
    { id: 'host-004', name: 'win-sql-01', ipAddress: '10.10.2.31', status: 'online' },
    { id: 'host-005', name: 'esxi-dev-01', ipAddress: '10.10.1.22', status: 'degraded' },
    { id: 'host-006', name: 'backup-srv-01', ipAddress: '10.10.3.10', status: 'offline' },
  ];

  // 8 alerts
  const now = Date.now();
  const alerts: Alert[] = [
    { id: 'alert-001', severity: 'critical', status: 'active', message: 'Drive failure detected in NL_Pool_01 - Enclosure 1, Slot 14', source: 'NL_Pool_01', timestamp: new Date(now - 3600_000).toISOString() },
    { id: 'alert-002', severity: 'critical', status: 'active', message: 'VPOD offline in NL_Pool_01 - VPOD 47', source: 'NL_Pool_01', timestamp: new Date(now - 7200_000).toISOString() },
    { id: 'alert-003', severity: 'warning', status: 'active', message: 'Pool NL_Pool_01 capacity exceeds 80% threshold', source: 'NL_Pool_01', timestamp: new Date(now - 14400_000).toISOString() },
    { id: 'alert-004', severity: 'warning', status: 'active', message: 'Volume compliance-01 is in offline state', source: 'compliance-01', timestamp: new Date(now - 28800_000).toISOString() },
    { id: 'alert-005', severity: 'warning', status: 'acknowledged', message: 'Volume test-vol-01 is in degraded state', source: 'test-vol-01', timestamp: new Date(now - 43200_000).toISOString(), acknowledgedAt: new Date(now - 36000_000).toISOString() },
    { id: 'alert-006', severity: 'info', status: 'active', message: 'Firmware update available: v8.6.2.0', source: 'System', timestamp: new Date(now - 86400_000).toISOString() },
    { id: 'alert-007', severity: 'info', status: 'resolved', message: 'Node 15 restarted successfully after maintenance', source: 'node-015', timestamp: new Date(now - 172800_000).toISOString(), resolvedAt: new Date(now - 171000_000).toISOString() },
    { id: 'alert-008', severity: 'critical', status: 'resolved', message: 'FC port offline on Node 3 - Port 2', source: 'node-003', timestamp: new Date(now - 259200_000).toISOString(), resolvedAt: new Date(now - 255600_000).toISOString() },
  ];

  return {
    nodes,
    pools,
    volumes,
    hosts,
    alerts,
    systemMeta: {
      clusterName: 'VDURA-V5000-PROD',
      model: 'VDURA V5000',
      serialNumber: 'VD5K-2025-00482',
      firmwareVersion: '8.6.1.0',
    },
  };
}
