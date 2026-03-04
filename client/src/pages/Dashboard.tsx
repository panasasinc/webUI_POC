import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useSystem } from '@/hooks/useSystem';
import { useVolumes } from '@/hooks/useVolumes';
import { usePools } from '@/hooks/usePools';
import { useAlerts } from '@/hooks/useAlerts';
import { usePerformance } from '@/hooks/usePerformance';
import { CapacityBar } from '@/components/common/CapacityBar';
import { PerformanceChart, type ChartSeries } from '@/components/common/PerformanceChart';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PageLoading } from '@/components/common/PageLoading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { formatBytes, formatNumber } from '@/lib/utils';
import { CheckCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import { Link } from 'react-router';

const POLL_OPTIONS = [
  { value: '1000', label: '1 sec' },
  { value: '5000', label: '5 sec' },
  { value: '10000', label: '10 sec' },
  { value: '30000', label: '30 sec' },
  { value: '60000', label: '1 min' },
  { value: '300000', label: '5 min' },
  { value: '900000', label: '15 min' },
];

export default function Dashboard() {
  const [pollInterval, setPollInterval] = useState(30_000);
  const system = useSystem();
  const volumes = useVolumes();
  const pools = usePools();
  const alerts = useAlerts();
  const perf = usePerformance(pollInterval);

  if (system.isLoading || volumes.isLoading) return <PageLoading />;
  if (system.error) return <ErrorMessage message={system.error.message} onRetry={() => system.refetch()} />;

  const sys = system.data!;
  const vols = volumes.data ?? [];
  const poolList = pools.data ?? [];
  const allAlerts = alerts.data ?? [];
  const activeAlerts = allAlerts.filter((a) => a.status === 'active' || a.status === 'acknowledged');
  const perfData = perf.data;

  const directorNodes = sys.directorNodeCount ?? sys.nodes.filter((n) => n.role === 'director').length;
  const storageNodes = sys.storageNodeCount ?? sys.nodes.filter((n) => n.role === 'storage').length;
  const onlineStorageNodes = sys.nodes.filter((n) => n.role === 'storage' && n.status === 'online').length;
  const offlineStorageNodes = storageNodes - onlineStorageNodes;

  const onlineVols = vols.filter((v) => v.status === 'online').length;
  const degradedVols = vols.filter((v) => v.status === 'degraded').length;
  const offlineVols = vols.filter((v) => v.status === 'offline').length;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Dashboards</h1>

      {/* Summary Pills */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-3">
          <span className="text-sm text-muted-foreground">Director Nodes</span>
          <span className="text-lg font-bold">{directorNodes}</span>
        </div>
        <div className="flex items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-3">
          <span className="text-sm text-muted-foreground">Storage Nodes</span>
          <span className="text-lg font-bold">{storageNodes}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-vdura-green"><CheckCircle className="h-3 w-3" />{onlineStorageNodes}</span>
            {offlineStorageNodes > 0 && (
              <span className="flex items-center gap-1 text-vdura-amber"><AlertTriangle className="h-3 w-3" />{offlineStorageNodes}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-3">
          <span className="text-sm text-muted-foreground">Volumes</span>
          <span className="text-lg font-bold">{vols.length}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-vdura-green"><CheckCircle className="h-3 w-3" />{onlineVols}</span>
            {degradedVols > 0 && <span className="flex items-center gap-1 text-vdura-amber"><AlertTriangle className="h-3 w-3" />{degradedVols}</span>}
            {offlineVols > 0 && <span className="flex items-center gap-1 text-muted-foreground"><MinusCircle className="h-3 w-3" />{offlineVols}</span>}
          </div>
        </div>
      </div>

      {/* Storage Capacity + Alerts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-vdura-amber">
              Storage Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CapacityBar used={sys.totalUsedCapacityBytes} total={sys.totalUsableCapacityBytes} />
            <div className="flex gap-6 text-xs text-muted-foreground">
              <span>Used {formatBytes(sys.totalUsedCapacityBytes)}</span>
              <span>Free {formatBytes(sys.totalUsableCapacityBytes - sys.totalUsedCapacityBytes)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-vdura-amber">
              <Link to="/alerts" className="hover:underline">Alerts</Link> <span className="text-foreground">{activeAlerts.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAlerts.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-muted-foreground">
                <CheckCircle className="mb-2 h-8 w-8 text-vdura-green" />
                <span className="text-sm">No Alerts Found</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAlerts.slice(0, 6).map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 text-sm">
                    <AlertTriangle className={alert.severity === 'critical' ? 'h-4 w-4 text-vdura-error' : 'h-4 w-4 text-vdura-amber'} />
                    <span className="flex-1 truncate text-muted-foreground">{alert.message}</span>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
                {activeAlerts.length > 6 && (
                  <Link to="/alerts" className="block text-center text-xs text-vdura-amber hover:underline">
                    View all
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File System Metadata */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-vdura-amber">
            File System Metadata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CapacityBar
            used={poolList.reduce((sum, p) => sum + p.usedCapacityBytes, 0)}
            total={poolList.reduce((sum, p) => sum + p.totalCapacityBytes, 0)}
          />
        </CardContent>
      </Card>

      {/* System Performance */}
      {perfData && <PerformanceSection perfData={perfData} pollInterval={pollInterval} onPollIntervalChange={setPollInterval} />}
    </div>
  );
}

/** Map poll interval → visible time window and x-axis tick format. */
function timeWindow(intervalMs: number): { windowMs: number; format: Intl.DateTimeFormatOptions } {
  if (intervalMs <= 1_000)   return { windowMs:  5 * 60_000, format: { minute: '2-digit', second: '2-digit' } };
  if (intervalMs <= 5_000)   return { windowMs: 15 * 60_000, format: { minute: '2-digit', second: '2-digit' } };
  if (intervalMs <= 10_000)  return { windowMs: 30 * 60_000, format: { hour: '2-digit', minute: '2-digit', second: '2-digit' } };
  if (intervalMs <= 30_000)  return { windowMs:      3_600_000, format: { hour: '2-digit', minute: '2-digit' } };
  if (intervalMs <= 60_000)  return { windowMs:  2 * 3_600_000, format: { hour: '2-digit', minute: '2-digit' } };
  if (intervalMs <= 300_000) return { windowMs: 12 * 3_600_000, format: { hour: '2-digit', minute: '2-digit' } };
  return                            { windowMs: 24 * 3_600_000, format: { hour: '2-digit', minute: '2-digit' } };
}

function sliceToWindow<T extends { timestamp: string }>(data: T[], windowMs: number): T[] {
  const cutoff = new Date(Date.now() - windowMs).toISOString();
  return data.filter((p) => p.timestamp >= cutoff);
}

function PerformanceSection({ perfData, pollInterval, onPollIntervalChange }: {
  perfData: import('@vdura/shared').PerformanceSummary;
  pollInterval: number;
  onPollIntervalChange: (ms: number) => void;
}) {
  const { windowMs, format: timeFormat } = timeWindow(pollInterval);
  const history = useMemo(() => sliceToWindow(perfData.history, windowMs), [perfData.history, windowMs]);
  const metaHistory = useMemo(
    () => sliceToWindow(perfData.metadataHistory ?? [], windowMs),
    [perfData.metadataHistory, windowMs],
  );

  const iopsSeries: ChartSeries[] = [
    { dataKey: 'readIOPS', name: 'Read IOPS', color: '#22c55e' },
    { dataKey: 'writeIOPS', name: 'Write IOPS', color: '#8b5cf6' },
  ];

  const throughputSeries: ChartSeries[] = [
    { dataKey: 'readThroughputMBs', name: 'Read MB/s', color: '#22c55e' },
    { dataKey: 'writeThroughputMBs', name: 'Write MB/s', color: '#ef4444' },
  ];

  const latencySeries: ChartSeries[] = [
    { dataKey: 'readLatencyMs', name: 'Read Latency', color: '#22c55e' },
    { dataKey: 'writeLatencyMs', name: 'Write Latency', color: '#ef4444' },
  ];

  const metaSeries: ChartSeries[] = [
    { dataKey: 'dfOps', name: 'DF Ops/s', color: '#d4a017' },
    { dataKey: 'nfsOps', name: 'NFS Ops/s', color: '#22c55e' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">System Performance</CardTitle>
          <Select value={String(pollInterval)} onValueChange={(v) => onPollIntervalChange(Number(v))}>
            <SelectTrigger className="h-7 w-28 bg-vdura-surface text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POLL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PerformanceChart
            title="IOPS"
            data={history}
            series={iopsSeries}
            valueFormatter={(v) => formatNumber(Math.round(v))}
            timeFormat={timeFormat}
            yAxisUnit="IOPS"
          />
          <PerformanceChart
            title="Throughput"
            data={history}
            series={throughputSeries}
            valueFormatter={(v) => `${v.toFixed(2)} MB/s`}
            timeFormat={timeFormat}
            yAxisUnit="MB/s"
          />
          <PerformanceChart
            title="Latency"
            data={history}
            series={latencySeries}
            valueFormatter={(v) => `${v.toFixed(2)} ms`}
            timeFormat={timeFormat}
            yAxisUnit="ms"
          />
          {metaHistory.length > 0 && metaSeries.length > 0 && (
            <PerformanceChart
              title="Metadata Operations"
              data={metaHistory}
              series={metaSeries}
              valueFormatter={(v) => formatNumber(Math.round(v))}
              timeFormat={timeFormat}
              yAxisUnit="Ops/s"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
