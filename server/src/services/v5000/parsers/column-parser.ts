export type ParsedRow = Record<string, string>;

const TB = 1024 ** 4;
const GB = 1024 ** 3;
const MB = 1024 ** 2;

/**
 * Parse fixed-width column output from PanCLI.
 * Supports multi-line headers (e.g., bladeset list, volume list, sysstat).
 * Detects column boundaries from the header row(s) by looking for 2+ space gaps.
 */
export function parseColumnOutput(raw: string, headerLines = 1): ParsedRow[] {
  const lines = raw.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length < headerLines + 1) return [];

  // Use the longest header line for column position detection
  const headerSlice = nonEmpty.slice(0, headerLines);
  const widestHeader = headerSlice.reduce((a, b) => a.length >= b.length ? a : b);
  const columns = detectColumns(widestHeader);
  if (columns.length === 0) return [];

  // Merge column names from all header lines (top-down)
  for (const col of columns) {
    const parts: string[] = [];
    for (let h = 0; h < headerLines; h++) {
      const value = nonEmpty[h].substring(col.start, Math.min(col.end, nonEmpty[h].length)).trim();
      if (value) parts.push(value);
    }
    col.name = parts.join(' ');
  }

  const rows: ParsedRow[] = [];
  for (let i = headerLines; i < nonEmpty.length; i++) {
    const line = nonEmpty[i];
    // Skip separator lines (all dashes/equals)
    if (/^[-=\s]+$/.test(line)) continue;
    // Skip footer lines
    if (/^Display(ed|ing)\s+\d+/i.test(line.trim())) continue;

    const row: ParsedRow = {};
    for (const col of columns) {
      const value = line.substring(col.start, Math.min(col.end, line.length)).trim();
      row[col.name] = value;
    }
    rows.push(row);
  }

  return rows;
}

interface Column {
  name: string;
  start: number;
  end: number;
}

function detectColumns(header: string): Column[] {
  const columns: Column[] = [];

  // Find word boundaries: groups of non-space characters separated by 2+ spaces
  const re = /\S+(\s\S+)*/g;
  let match: RegExpExecArray | null;
  const positions: { name: string; start: number }[] = [];

  while ((match = re.exec(header)) !== null) {
    positions.push({ name: match[0].trim(), start: match.index });
  }

  // Build columns with start/end positions
  for (let i = 0; i < positions.length; i++) {
    columns.push({
      name: positions[i].name,
      start: positions[i].start,
      end: i < positions.length - 1 ? positions[i + 1].start : Infinity,
    });
  }

  return columns;
}

/**
 * Parse tab-delimited output (e.g., eventlog -output tab).
 * First line is headers, subsequent lines are data rows.
 */
export function parseTabOutput(raw: string): ParsedRow[] {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t').map((h) => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row: ParsedRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Parse key-value output (e.g., about, bladeset detail, volume details).
 * Lines are split on first `:` or multi-space delimiter.
 */
export function parseKeyValueOutput(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = raw.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try colon separator first
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.substring(0, colonIdx).trim();
      const value = trimmed.substring(colonIdx + 1).trim();
      if (key) result[key] = value;
      continue;
    }

    // Try multi-space separator (key   value)
    const spaceMatch = trimmed.match(/^(\S[\S ]*\S)\s{2,}(.+)$/);
    if (spaceMatch) {
      result[spaceMatch[1].trim()] = spaceMatch[2].trim();
    }
  }

  return result;
}

/**
 * Parse a capacity string like "120 TB", "500 GB", "1.5 PB" to bytes.
 */
export function parseCapacity(str: string): number {
  const match = str.trim().match(/^([\d.]+)\s*(PB|TB|GB|MB|KB|B|bytes?)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = (match[2] ?? 'B').toUpperCase().replace(/S$/, '');

  switch (unit) {
    case 'PB': return value * 1024 * TB;
    case 'TB': return value * TB;
    case 'GB': return value * GB;
    case 'MB': return value * MB;
    case 'KB': return value * 1024;
    case 'B':
    case 'BYTE': return value;
    default: return value;
  }
}

/**
 * Generate a stable ID from a prefix and name.
 */
export function nameToId(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${prefix}-${slug}`;
}

/**
 * Map node status strings from PanCLI to NodeStatus type.
 */
export function mapNodeStatus(status: string): 'online' | 'offline' | 'service' {
  const s = status.toLowerCase().trim();
  if (s.includes('warning') || s.includes('degraded')) return 'service';
  if (s.startsWith('online') || s === 'up' || s === 'ok' || s === 'active') return 'online';
  if (s === 'service' || s === 'maintenance') return 'service';
  return 'offline';
}

/**
 * Map pool/bladeset status strings from PanCLI to PoolStatus type.
 */
export function mapPoolStatus(status: string): 'online' | 'offline' | 'degraded' {
  const s = status.toLowerCase().trim();
  if (s.includes('online') || s === 'ok' || s === 'active' || s === 'up') return 'online';
  if (s === 'degraded' || s === 'warning') return 'degraded';
  return 'offline';
}

/**
 * Map volume status strings from PanCLI to VolumeStatus type.
 */
export function mapVolumeStatus(status: string): 'online' | 'offline' | 'degraded' {
  const s = status.toLowerCase().trim();
  if (s === 'online' || s === 'ok' || s === 'active' || s === 'up') return 'online';
  if (s === 'degraded' || s === 'warning') return 'degraded';
  return 'offline';
}

/**
 * Safely parse an integer, returning a default on failure.
 */
export function safeInt(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Safely parse a float, returning a default on failure.
 */
export function safeFloat(val: string | undefined, fallback = 0): number {
  if (!val) return fallback;
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}
