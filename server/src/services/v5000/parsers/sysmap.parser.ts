import type { SystemNode, NodeRole } from '@vdura/shared';
import {
  nameToId,
  mapNodeStatus,
  parseCapacity,
} from './column-parser.js';

/**
 * Parse `sysmap nodes allcolumns` output into SystemNode[].
 *
 * Real PanCLI output format (single header line, multi-line per node):
 *   Node      Type            BladeSet      Capacity  VP              Serial              Data Serial     IP Address     State
 *   VCH-1,1   Director        -                    -  -               526e0001304001001   72c3405261a219  10.97.104.11   Online (warning)
 *                                                                     IPMI:
 *                                                                                Status:  active
 *                                                                            IP Address:  10.96.4.133
 *                                                                     ...
 *   VCH-4,2   VPOD            Set 1     108711.26 GB  not applicable  f5a9be461d4032001   000000f5a1ab9a  10.97.104.108  Online
 *                                                                     Services:           -
 */
export function parseSysmapNodes(raw: string): SystemNode[] {
  const lines = raw.split('\n');
  const nodes: SystemNode[] = [];

  // Find the header line
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*Node\s+/i.test(lines[i]) && /State/i.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  // Detect column positions from the header
  const header = lines[headerIdx];
  const nodeStart = 0;
  const typeStart = header.indexOf('Type');
  const bsStart = header.indexOf('BladeSet');
  const capStart = header.indexOf('Capacity');
  const serialStart = header.indexOf('Serial');
  const ipStart = header.indexOf('IP Address');
  const stateStart = header.indexOf('State');

  // Parse data lines (each node's primary line starts with a non-space character)
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Node data lines start with a non-space char (node name like VCH-x,y)
    if (/^\s/.test(line)) continue; // Skip continuation lines (IPMI, Services, etc.)

    try {
      const name = line.substring(nodeStart, typeStart).trim();
      if (!name) continue;

      const typeStr = line.substring(typeStart, bsStart).trim();
      const bladesetRaw = line.substring(bsStart, capStart).trim();
      // Strip trailing numeric fragments that bleed from the Capacity column
      const bladeset = bladesetRaw.replace(/\s+\d[\d.]*$/, '').trim();
      const serial = serialStart > 0 ? line.substring(serialStart, ipStart > 0 ? ipStart : line.length).trim() : '';
      const ipAddress = ipStart > 0 ? line.substring(ipStart, stateStart > 0 ? stateStart : line.length).trim() : '';
      const state = stateStart > 0 ? line.substring(stateStart).trim() : 'online';

      // Clean up serial - may contain "Data Serial" value too
      const serialClean = serial.split(/\s{2,}/)[0].trim();

      const role = inferRole(typeStr);
      const poolName = (bladeset === '-' || !bladeset) ? undefined : bladeset;

      const node: SystemNode = {
        id: nameToId('node', name),
        name,
        model: typeStr || undefined,
        status: mapNodeStatus(state),
        serialNumber: serialClean,
        firmwareVersion: '',
        cpuUsagePercent: 0,
        memoryUsagePercent: 0,
        role,
        ipAddress: ipAddress || undefined,
        poolId: poolName ? nameToId('pool', poolName) : undefined,
        poolName,
      };

      nodes.push(node);
    } catch (err) {
      console.warn('[v5000] Failed to parse sysmap node row:', err);
    }
  }

  return nodes;
}

/**
 * Parse `sysmap nodes storage capacity` output.
 *
 * Real PanCLI output:
 *   Node      Type      Capacity  Serial             IP Address     State
 *   VCH-4,2   VPOD  108711.26 GB  f5a9be461d4032001  10.97.104.108  Online
 */
export function parseSysmapCapacity(raw: string): Map<string, NodeCapacityInfo> {
  const lines = raw.split('\n');
  const result = new Map<string, NodeCapacityInfo>();

  // Find header
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*Node\s+/i.test(lines[i]) && /Capacity/i.test(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return result;

  const header = lines[headerIdx];
  const typeStart = header.indexOf('Type');
  const capStart = header.indexOf('Capacity');
  const serialStart = header.indexOf('Serial');

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s/.test(line)) continue;

    try {
      const name = line.substring(0, typeStart).trim();
      if (!name) continue;

      // Extract capacity value (between Type and Serial columns)
      const capStr = line.substring(capStart, serialStart).trim();
      const totalBytes = parseCapacity(capStr);

      result.set(name, {
        dataSpaceBytes: 0,
        dataSpaceTotalBytes: totalBytes,
        metadataSpaceBytes: 0,
        metadataSpaceTotalBytes: 0,
      });
    } catch (err) {
      console.warn('[v5000] Failed to parse sysmap capacity row:', err);
    }
  }

  return result;
}

export interface NodeCapacityInfo {
  dataSpaceBytes: number;
  dataSpaceTotalBytes: number;
  metadataSpaceBytes: number;
  metadataSpaceTotalBytes: number;
}

/**
 * Enrich nodes with capacity data from a separate query.
 */
export function enrichNodesWithCapacity(
  nodes: SystemNode[],
  capacityMap: Map<string, NodeCapacityInfo>,
): SystemNode[] {
  return nodes.map((node) => {
    const cap = capacityMap.get(node.name);
    if (!cap) return node;
    return {
      ...node,
      dataSpaceBytes: cap.dataSpaceBytes,
      dataSpaceTotalBytes: cap.dataSpaceTotalBytes,
      metadataSpaceBytes: cap.metadataSpaceBytes,
      metadataSpaceTotalBytes: cap.metadataSpaceTotalBytes,
    };
  });
}

function inferRole(typeStr: string): NodeRole {
  const s = typeStr.toLowerCase();
  if (s.includes('director') || s.includes('dir') || s.includes('mgmt') || s.includes('management')) {
    return 'director';
  }
  // VPOD Container is a storage enclosure controller, treat as storage
  return 'storage';
}
