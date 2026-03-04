import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useAlerts, useAcknowledgeAlert } from '@/hooks/useAlerts';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { DataTable } from '@/components/common/DataTable';
import { PageLoading } from '@/components/common/PageLoading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { Button } from '@/components/ui/button';
import { formatTimeAgo, cn } from '@/lib/utils';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import type { Alert } from '@vdura/shared';

const statusStyles: Record<string, string> = {
  active: 'bg-amber-900/30 text-amber-400 border-amber-800/50',
  acknowledged: 'bg-muted/50 text-muted-foreground border-border',
  resolved: 'bg-green-900/30 text-green-400 border-green-800/50',
};

export default function Alerts() {
  const { data: alerts, isLoading, error, refetch } = useAlerts();
  const acknowledge = useAcknowledgeAlert();

  const allAlerts = alerts ?? [];
  const criticalCount = allAlerts.filter((a) => a.severity === 'critical' && a.status === 'active').length;
  const warningCount = allAlerts.filter((a) => a.severity === 'warning' && a.status === 'active').length;
  const infoCount = allAlerts.filter((a) => a.severity === 'info' && a.status === 'active').length;

  const columns = useMemo<ColumnDef<Alert, unknown>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
        filterFn: 'equalsString',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
              statusStyles[row.original.status] ?? statusStyles.active,
            )}
          >
            {row.original.status}
          </span>
        ),
        filterFn: 'equalsString',
      },
      {
        accessorKey: 'message',
        header: 'Message',
        cell: ({ row }) => <span className="text-sm">{row.original.message}</span>,
        filterFn: 'includesString',
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.source}</span>,
      },
      {
        accessorKey: 'timestamp',
        header: 'Time',
        cell: ({ row }) => (
          <span
            className="text-muted-foreground"
            title={new Date(row.original.timestamp).toLocaleString()}
          >
            {formatTimeAgo(row.original.timestamp)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={acknowledge.isPending}
              onClick={() => acknowledge.mutate(row.original.id)}
            >
              Acknowledge
            </Button>
          ) : null,
        enableSorting: false,
      },
    ],
    [acknowledge],
  );

  const filters = useMemo(
    () => [
      {
        columnId: 'severity',
        label: 'Severity',
        options: [
          { value: 'critical', label: 'Critical' },
          { value: 'warning', label: 'Warning' },
          { value: 'info', label: 'Info' },
        ],
      },
      {
        columnId: 'status',
        label: 'Status',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'acknowledged', label: 'Acknowledged' },
          { value: 'resolved', label: 'Resolved' },
        ],
      },
    ],
    [],
  );

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-3xl font-bold">Alerts</h1>

      {/* Summary pills */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-3">
          <AlertOctagon className="h-4 w-4 text-vdura-error" />
          <span className="text-sm text-muted-foreground">Critical</span>
          <span className="text-lg font-bold">{criticalCount}</span>
        </div>
        <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-3">
          <AlertTriangle className="h-4 w-4 text-vdura-amber" />
          <span className="text-sm text-muted-foreground">Warning</span>
          <span className="text-lg font-bold">{warningCount}</span>
        </div>
        <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-3">
          <Info className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-muted-foreground">Info</span>
          <span className="text-lg font-bold">{infoCount}</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={allAlerts}
        searchColumn="message"
        searchPlaceholder="Search alerts..."
        filters={filters}
        initialSorting={[{ id: 'timestamp', desc: true }]}
      />
    </div>
  );
}
