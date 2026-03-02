import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useSystem } from '@/hooks/useSystem';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable } from '@/components/common/DataTable';
import { PageLoading } from '@/components/common/PageLoading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { formatBytes } from '@/lib/utils';
import { CheckCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import type { SystemNode } from '@vdura/shared';

export default function Nodes() {
  const { data: system, isLoading, error, refetch } = useSystem();

  const nodes = system?.nodes ?? [];
  const directors = nodes.filter((n) => n.role === 'director');
  const storageNodes = nodes.filter((n) => n.role === 'storage');
  const onlineDirectors = directors.filter((n) => n.status === 'online').length;
  const onlineStorage = storageNodes.filter((n) => n.status === 'online').length;
  const warningStorage = storageNodes.filter((n) => n.status === 'service').length;
  const offlineStorage = storageNodes.filter((n) => n.status === 'offline').length;

  // Sorted: directors first, then storage
  const sortedNodes = useMemo(() => [...directors, ...storageNodes], [directors, storageNodes]);

  const columns = useMemo<ColumnDef<SystemNode, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        filterFn: 'includesString',
      },
      {
        accessorKey: 'ipAddress',
        header: 'IP',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.ipAddress ?? '\u2014'}</span>
        ),
      },
      {
        accessorKey: 'model',
        header: 'Model',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.model ?? '\u2014'}</span>
        ),
      },
      {
        accessorKey: 'poolName',
        header: 'Storage Pool',
        cell: ({ row }) => {
          const val = row.original.poolName;
          return !val ? (
            <span className="text-muted-foreground">{'\u2014'}</span>
          ) : (
            <span className="text-vdura-amber">{val}</span>
          );
        },
      },
      {
        accessorKey: 'dataSpaceBytes',
        header: 'Data Space',
        cell: ({ row }) => {
          const n = row.original;
          if (n.role === 'director' || (!n.dataSpaceBytes && !n.dataSpaceTotalBytes)) {
            return <span className="text-muted-foreground">{'\u2014'}</span>;
          }
          if (!n.dataSpaceBytes && n.dataSpaceTotalBytes) {
            return <span className="text-sm">{formatBytes(n.dataSpaceTotalBytes)} total</span>;
          }
          const pct = n.dataSpaceTotalBytes ? (n.dataSpaceBytes! / n.dataSpaceTotalBytes) * 100 : 0;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm">{formatBytes(n.dataSpaceBytes!)}</span>
              <div className="h-1.5 w-16 rounded-full bg-vdura-surface-raised">
                <div
                  className="h-full rounded-full bg-vdura-amber"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'metadataSpaceBytes',
        header: 'Metadata Space',
        cell: ({ row }) => {
          const n = row.original;
          if (!n.metadataSpaceBytes) return <span className="text-muted-foreground">{'\u2014'}</span>;
          const pct = n.metadataSpaceTotalBytes
            ? (n.metadataSpaceBytes / n.metadataSpaceTotalBytes) * 100
            : 0;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm">{formatBytes(n.metadataSpaceBytes)}</span>
              <div className="h-1.5 w-16 rounded-full bg-vdura-surface-raised">
                <div
                  className="h-full rounded-full bg-vdura-amber"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
        filterFn: 'equalsString',
      },
      {
        accessorKey: 'serialNumber',
        header: 'Serial',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.serialNumber}
          </span>
        ),
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
          { value: 'service', label: 'Warning' },
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
      <h1 className="text-3xl font-bold">Realm Nodes</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            Director Nodes <span className="font-bold text-foreground">{directors.length}</span>
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-vdura-green"><CheckCircle className="h-3 w-3" />{onlineDirectors}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><MinusCircle className="h-3 w-3" />{directors.length - onlineDirectors}</span>
            <span className="flex items-center gap-1 text-vdura-amber"><AlertTriangle className="h-3 w-3" />0</span>
          </div>
        </div>
        <div className="text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            Storage Nodes <span className="font-bold text-foreground">{storageNodes.length}</span>
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-vdura-green"><CheckCircle className="h-3 w-3" />{onlineStorage}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><MinusCircle className="h-3 w-3" />{offlineStorage}</span>
            <span className="flex items-center gap-1 text-vdura-amber"><AlertTriangle className="h-3 w-3" />{warningStorage}</span>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sortedNodes}
        searchColumn="name"
        searchPlaceholder="Search nodes..."
        filters={filters}
        groupHeader={(row, idx) => {
          if (idx === 0 && row.role === 'director') {
            return <span className="text-xs font-semibold uppercase tracking-wider text-vdura-amber">Director Nodes</span>;
          }
          const isFirstStorage = row.role === 'storage' && (idx === 0 || sortedNodes[idx - 1]?.role === 'director');
          if (isFirstStorage) {
            return <span className="text-xs font-semibold uppercase tracking-wider text-vdura-amber">Storage Nodes</span>;
          }
          return null;
        }}
      />
    </div>
  );
}
