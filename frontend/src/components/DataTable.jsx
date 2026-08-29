export default function DataTable({ columns, rows, emptyLabel = "No records yet." }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="border border-dashed border-[var(--color-line)] rounded-xl p-8 text-center text-sm text-[var(--color-slate)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-[var(--color-line)] rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-ink)] text-white/80">
            {columns.map((col) => (
              <th key={col.key} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              className={`${i % 2 === 0 ? "bg-[var(--color-panel)]" : "bg-[var(--color-canvas)]"} border-t border-[var(--color-line)]`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2.5 whitespace-nowrap text-[var(--color-ink)]">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
