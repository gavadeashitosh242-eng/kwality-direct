const COLOR = {
  active: "var(--color-go)",
  available: "var(--color-go)",
  placed: "var(--color-wait)",
  confirmed: "var(--color-route)",
  delivered: "var(--color-go)",
  cancelled: "var(--color-stop)",
  blocked: "var(--color-stop)",
  inactive: "var(--color-slate)",
  offline: "var(--color-slate)",
  on_trip: "var(--color-route)",
  emergency: "var(--color-stop)",
  paid: "var(--color-go)",
  partial: "var(--color-wait)",
  unpaid: "var(--color-stop)",
  reported: "var(--color-stop)",
  backup_assigned: "var(--color-wait)",
  resolved: "var(--color-go)",
  no_backup_available: "var(--color-stop)",
};

export default function StatusBadge({ status }) {
  const color = COLOR[status] || "var(--color-slate)";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status?.replace(/_/g, " ")}
    </span>
  );
}
