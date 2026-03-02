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
        accessorKey: 'ipAddress',
        header: 'IP Address',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">{row.original.ipAddress}</span>
        ),
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
