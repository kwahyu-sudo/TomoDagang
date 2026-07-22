import { ReactNode } from "react";

type Column = { key: string; label: string };

type Props<T> = {
  columns: Column[];
  data: T[];
  renderRow: (item: T) => ReactNode;
  emptyText?: string;
};

export default function Table<T>({ columns, data, renderRow, emptyText = "Tidak ada data." }: Props<T>) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-canvas">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="th">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i}>{renderRow(item)}</tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td className="td text-ink-faint" colSpan={columns.length}>{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
