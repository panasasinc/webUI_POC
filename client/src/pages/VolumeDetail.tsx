import { useParams } from 'react-router';
import { useVolume } from '@/hooks/useVolumes';
import { usePools } from '@/hooks/usePools';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageLoading } from '@/components/common/PageLoading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { formatBytes } from '@/lib/utils';

export default function VolumeDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: volume, isLoading, error, refetch } = useVolume(id!);
  const { data: pools } = usePools();

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => refetch()} />;
  if (!volume) return <ErrorMessage message="Volume not found" />;

  const pool = pools?.find((p) => p.id === volume.poolId);
  const poolUsed = pool?.usedCapacityBytes ?? 0;
  const poolTotal = pool?.totalCapacityBytes ?? 0;
  const volumeUsed = volume.usedBytes;
  const otherData = Math.max(0, poolUsed - volumeUsed);
  const available = Math.max(0, poolTotal - poolUsed);
  const total = poolTotal;

  const reductionRatio = volume.reductionRatio ?? 1;
  const logicalUsed = volumeUsed * reductionRatio;
  const logicalOther = otherData * reductionRatio;
  const logicalAvailable = available * reductionRatio;
  const logicalTotal = total * reductionRatio;

  const usedPct = total > 0 ? (volumeUsed / total) * 100 : 0;
  const otherPct = total > 0 ? (otherData / total) * 100 : 0;
  const availPct = total > 0 ? (available / total) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">/{volume.name}</h1>
            <StatusBadge status={volume.status} />
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {volume.description ?? 'No description available.'}
              </p>
            </CardContent>
          </Card>

          {/* Availability Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Availability Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Recovery Priority</dt>
                  <dd className="text-sm font-medium capitalize">{volume.recoveryPriority ?? 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Extended FS Availability Mode</dt>
                  <dd className="text-sm font-medium">{volume.availabilityMode ?? 'N/A'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quota row */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Soft Quota</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">
                  {volume.softQuotaBytes != null ? formatBytes(volume.softQuotaBytes) : 'N/A'}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Hard Quota</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">
                  {volume.hardQuotaBytes != null ? formatBytes(volume.hardQuotaBytes) : 'N/A'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Storage Capacity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Storage Capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stacked bar */}
              <div className="flex h-4 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-vdura-amber"
                  style={{ width: `${usedPct}%` }}
                  title={`Used: ${formatBytes(volumeUsed)}`}
                />
                <div
                  className="bg-zinc-600"
                  style={{ width: `${otherPct}%` }}
                  title={`Other Volumes & Data: ${formatBytes(otherData)}`}
                />
                <div
                  className="bg-zinc-800"
                  style={{ width: `${availPct}%` }}
                  title={`Available: ${formatBytes(available)}`}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-vdura-amber" />
                  Used
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-600" />
                  Other Volumes &amp; Data
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-800" />
                  Available
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 font-medium" />
                      <th className="pb-2 pr-4 text-right font-medium">Physical</th>
                      <th className="pb-2 text-right font-medium">Logical</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2">Used</td>
                      <td className="py-2 pr-4 text-right">{formatBytes(volumeUsed)}</td>
                      <td className="py-2 text-right">{formatBytes(logicalUsed)}</td>
                    </tr>
                    <tr>
                      <td className="py-2">Other Volumes &amp; Data</td>
                      <td className="py-2 pr-4 text-right">{formatBytes(otherData)}</td>
                      <td className="py-2 text-right">{formatBytes(logicalOther)}</td>
                    </tr>
                    <tr>
                      <td className="py-2">Available</td>
                      <td className="py-2 pr-4 text-right">{formatBytes(available)}</td>
                      <td className="py-2 text-right">{formatBytes(logicalAvailable)}</td>
                    </tr>
                    <tr className="font-medium">
                      <td className="py-2">Total</td>
                      <td className="py-2 pr-4 text-right">{formatBytes(total)}</td>
                      <td className="py-2 text-right">{formatBytes(logicalTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                * Data reduction ratio {reductionRatio.toFixed(2)}:1
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
