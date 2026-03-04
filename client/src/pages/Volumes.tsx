import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { useVolumes, useCreateVolume, useDeleteVolume } from '@/hooks/useVolumes';
import { usePools } from '@/hooks/usePools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable } from '@/components/common/DataTable';
import { PageLoading } from '@/components/common/PageLoading';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { formatBytes } from '@/lib/utils';
import type { Volume } from '@vdura/shared';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';

export default function Volumes() {
  const { data: volumes, isLoading, error, refetch } = useVolumes();
  const { data: pools } = usePools();
  const createVolume = useCreateVolume();
  const deleteVolume = useDeleteVolume();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Volume | null>(null);
  const [newName, setNewName] = useState('');
  const [newCapacityGB, setNewCapacityGB] = useState('');
  const [newPoolId, setNewPoolId] = useState('');

  const columns = useMemo<ColumnDef<Volume, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Component',
        cell: ({ row }) => (
          <Link to={`/volumes/${row.original.id}`} className="font-medium text-vdura-amber hover:underline">
            /{row.original.name}
          </Link>
        ),
        filterFn: 'includesString',
      },
      {
        accessorKey: 'poolName',
        header: 'Storage Pool',
        cell: ({ row }) => (
          <Link to="/pools" className="text-vdura-amber hover:underline">
            {row.original.poolName}
          </Link>
        ),
        filterFn: 'equalsString',
      },
      {
        id: 'raid',
        header: 'RAID',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.raidLevel ?? 'RAID 6+ (8+2)'}</span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'usedBytes',
        header: 'Capacity Used',
        cell: ({ row }) => {
          const vol = row.original;
          const pct = vol.capacityBytes > 0 ? (vol.usedBytes / vol.capacityBytes) * 100 : 0;
          return (
            <div className="flex items-center gap-3">
              <span className="w-20 text-right text-sm">{formatBytes(vol.usedBytes)}</span>
              <div className="h-1.5 w-20 rounded-full bg-vdura-surface-raised">
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
        id: 'available',
        header: 'Available',
        accessorFn: (row) => row.capacityBytes - row.usedBytes,
        cell: ({ row }) => formatBytes(row.original.capacityBytes - row.original.usedBytes),
      },
      {
        id: 'reductionRatio',
        header: 'Reduction Ratio',
        cell: ({ row }) => `${(row.original.reductionRatio ?? 2.6).toFixed(1)}:1`,
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const vol = row.original;
          const pct = vol.capacityBytes > 0 ? (vol.usedBytes / vol.capacityBytes) * 100 : 0;
          return (
            <StatusBadge
              status={vol.status}
              label={
                vol.status === 'degraded'
                  ? `${pct.toFixed(0)}% \u2013 FSRC`
                  : vol.status === 'offline'
                  ? 'Offline'
                  : 'Good'
              }
            />
          );
        },
        filterFn: 'equalsString',
      },
    ],
    [],
  );

  const statusFilters = useMemo(
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
        columnId: 'poolName',
        label: 'Pool',
        options: (pools ?? []).map((p) => ({ value: p.name, label: p.name })),
      },
    ],
    [pools],
  );

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorMessage message={error.message} onRetry={() => refetch()} />;

  const handleCreate = async () => {
    if (!newName || !newCapacityGB || !newPoolId) return;
    await createVolume.mutateAsync({
      name: newName,
      capacityBytes: Number(newCapacityGB) * 1024 * 1024 * 1024,
      poolId: newPoolId,
    });
    setCreateOpen(false);
    setNewName('');
    setNewCapacityGB('');
    setNewPoolId('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteVolume.mutateAsync(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Volumes</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Create</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Volume</DialogTitle>
              <DialogDescription>Add a new volume to the storage system.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="vol-name">Name</Label>
                <Input id="vol-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="/my-volume" className="bg-vdura-surface" />
              </div>
              <div>
                <Label htmlFor="vol-cap">Capacity (GB)</Label>
                <Input id="vol-cap" type="number" value={newCapacityGB} onChange={(e) => setNewCapacityGB(e.target.value)} placeholder="1024" className="bg-vdura-surface" />
              </div>
              <div>
                <Label>Storage Pool</Label>
                <Select value={newPoolId} onValueChange={setNewPoolId}>
                  <SelectTrigger className="bg-vdura-surface"><SelectValue placeholder="Select pool" /></SelectTrigger>
                  <SelectContent>
                    {(pools ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleCreate} disabled={createVolume.isPending}>
                  {createVolume.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={volumes ?? []}
        searchColumn="name"
        searchPlaceholder="Search volumes..."
        filters={statusFilters}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Volume</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteVolume.isPending}>
              {deleteVolume.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
