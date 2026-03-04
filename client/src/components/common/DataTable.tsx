import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterOption {
  columnId: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchColumn?: string;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  /** Render a group header row before certain data rows */
  groupHeader?: (row: TData, index: number) => React.ReactNode | null;
  /** Initial sorting state so the table starts pre-sorted with a visible indicator */
  initialSorting?: SortingState;
}

export function DataTable<TData>({
  columns,
  data,
  searchColumn,
  searchPlaceholder = 'Search...',
  filters = [],
  groupHeader,
  initialSorting,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const hasActiveFilters = columnFilters.length > 0 || globalFilter !== '';

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        {showSearch && (
          <div className="flex items-center gap-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchColumn
                ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''
                : globalFilter
              }
              onChange={(e) => {
                if (searchColumn) {
                  table.getColumn(searchColumn)?.setFilterValue(e.target.value);
                } else {
                  setGlobalFilter(e.target.value);
                }
              }}
              className="h-8 w-56 bg-vdura-surface text-sm"
            />
          </div>
        )}
        {showFilters && filters.length > 0 && (
          <div className="flex items-center gap-2">
            {filters.map((f) => (
              <Select
                key={f.columnId}
                value={(table.getColumn(f.columnId)?.getFilterValue() as string) ?? ''}
                onValueChange={(val) =>
                  table.getColumn(f.columnId)?.setFilterValue(val === 'all' ? '' : val)
                }
              >
                <SelectTrigger className="h-8 w-36 bg-vdura-surface text-xs">
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {f.label}</SelectItem>
                  {f.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setColumnFilters([]);
              setGlobalFilter('');
            }}
            className="h-8 text-xs"
          >
            <X className="mr-1 h-3 w-3" />Clear
          </Button>
        )}
        <button
          onClick={() => setShowSearch((v) => !v)}
          className={cn('text-muted-foreground hover:text-foreground', showSearch && 'text-vdura-amber')}
        >
          <Search className="h-4 w-4" />
        </button>
        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn('text-muted-foreground hover:text-foreground', showFilters && 'text-vdura-amber')}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(header.column.getCanSort() && 'cursor-pointer select-none')}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-muted-foreground">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, idx) => {
                const group = groupHeader?.(row.original, idx);
                return (
                  <>{group !== null && group !== undefined && (
                    <TableRow key={`group-${idx}`} className="border-border hover:bg-transparent">
                      <TableCell colSpan={columns.length} className="py-2">
                        {group}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow key={row.id} className="border-border">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Row count */}
      <p className="text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} of {data.length} row(s)
      </p>
    </div>
  );
}
