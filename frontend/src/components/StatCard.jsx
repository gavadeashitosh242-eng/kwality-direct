export default function StatCard({ label, value, accent = "amber" }) {
  const accentMap = {
    amber: "var(--color-amber)",
    route: "var(--color-route)",
    go: "var(--color-go)",
    stop: "var(--color-stop)",
    wait: "var(--color-wait)",
  };
  return (
    <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color: accentMap[accent] }}>
        {value}
      </p>
    </div>
  );
}
