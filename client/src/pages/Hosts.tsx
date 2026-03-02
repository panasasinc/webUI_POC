import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useHosts } from '@/hooks/useHosts';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable } from '@/components/common/DataTable';
import { PageLoading } from '@/components/common/PageLoading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { CheckCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import type { Host } from '@vdura/shared';

export default function Hosts() {
  const { data: hosts = [], isLoading, error, refetch } = useHosts();

  const onlineCount = hosts.filter((h) => h.status === 'online').length;
  const offlineCount = hosts.filter((h) => h.status === 'offline').length;
  const warningCount = hosts.filter((h) => h.status === 'degraded').length;

  const columns = useMemo<ColumnDef<Host, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        filterFn: 'includesString',
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const t = row.original.type;
          return (
            <span className="inline-flex items-center rounded-full bg-vdura-surface-raised px-2 py-0.5 text-xs font-medium">
              {t === 'fc' ? 'FC' : 'iSCSI'}
            </span>
          );
        },
        filterFn: 'equalsString',
      },
      {
        accessorKey: 'portCount',
        header: 'Ports',
        cell: ({ row }) => <span>{row.original.portCount}</span>,
      },
      {
        id: 'identifiers',
        header: 'WWPNs / iSCSI Names',
        cell: ({ row }) => {
          const h = row.original;
          const values = h.type === 'fc' ? h.wwpns : h.iscsiNames;
          if (!values.length) return <span className="text-muted-foreground">{'\u2014'}</span>;
          return (
            <div className="flex flex-col gap-0.5">
              {values.map((v) => (
                <span key={v} className="font-mono text-xs">{v}</span>
              ))}
            </div>
          );
        },
      },
      {
        id: 'mappedVolumeCount',
        header: 'Mapped Volumes',
        accessorFn: (row) => row.mappedVolumes.length,
        cell: ({ row }) => <span>{row.original.mappedVolumes.length}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        filterFn: 'equalsString',
      },
    ],
    [],
  );

  const filters = useMemo(
    () => [
      {
        columnId: 'status',
        label: 'Status',
        options: [
          { value: 'online', label: 'Good' },
          { value: 'degraded', label: 'Warning' },
          { value: 'offline', label: 'Offline' },
        ],
      },
      {
        columnId: 'type',
        label: 'Type',
        options: [
          { value: 'fc', label: 'FC' },
          { value: 'iscsi', label: 'iSCSI' },
        ],
      },
    ],
    [],
  );

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-3xl font-bold">Hosts</h1>

      {/* Summary */}
      <div className="flex items-center justify-center gap-8">
        <p className="text-sm text-muted-foreground">
          Total Hosts <span className="font-bold text-foreground">{hosts.length}</span>
        </p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-vdura-green"><CheckCircle className="h-3 w-3" />{onlineCount}</span>
          <span className="flex items-center gap-1 text-muted-foreground"><MinusCircle className="h-3 w-3" />{offlineCount}</span>
          <span className="flex items-center gap-1 text-vdura-amber"><AlertTriangle className="h-3 w-3" />{warningCount}</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={hosts}
        searchColumn="name"
        searchPlaceholder="Search hosts..."
        filters={filters}
      />
    </div>
  );
}
