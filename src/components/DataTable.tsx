'use client';
import { useMemo } from 'react';
import { useTable } from '@tanstack/react-table';

type Row = Record<string, any>;
export default function DataTable({ rows }: { rows: Row[] }) {
  const columns = useMemo(() => Object.keys(rows?.[0] ?? {}).map(key => ({ header: key, accessorKey: key })), [rows]);
  const table = useTable({ data: rows, columns });
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th key={header.id} className="border px-2 py-1 text-left">{header.column.columnDef.header as string}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="border px-2 py-1">{String(cell.getValue() ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}