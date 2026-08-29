import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import api from "../../services/api";

export default function AdminFareRatePage() {
  const [history, setHistory] = useState([]);
  const [lossRate, setLossRate] = useState("");
  const [fareRate, setFareRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    api.get("/admin/fare-rate").then((res) => setHistory(res.data)).catch(() => setError("Could not load rate history."));
  }
  useEffect(load, []);

  const today = history[0];

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {};
      if (lossRate) payload.rate_per_kg_loss = Number(lossRate);
      if (fareRate) payload.driver_fare_rate_per_kg = Number(fareRate);
      await api.post("/admin/fare-rate", payload);
      setLossRate("");
      setFareRate("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not update rates.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Weight-loss & driver fare rates</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Two separate records, calculated automatically when a driver confirms delivery:
        <br />
        <span className="font-medium text-[var(--color-ink)]">Weight-loss amount</span> = weight loss (KG) × weight-loss rate — a penalty/recovery record, not the driver's pay.
        <br />
        <span className="font-medium text-[var(--color-ink)]">Driver fare</span> = delivered weight (KG) × driver fare rate — the driver's actual earning, based only on what was delivered.
      </p>

      <div className="mt-6 grid md:grid-cols-3 gap-5">
        <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Current rates</p>
          <div className="mt-2 space-y-1">
            <p className="text-2xl font-semibold text-[var(--color-stop)]">
              {today ? `₹${today.rate_per_kg_loss}` : "—"}
              <span className="text-sm font-normal text-[var(--color-slate)]"> /KG loss</span>
            </p>
            <p className="text-2xl font-semibold text-[var(--color-go)]">
              {today ? `₹${today.driver_fare_rate_per_kg}` : "—"}
              <span className="text-sm font-normal text-[var(--color-slate)]"> /KG delivered</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label className="block text-sm font-medium text-[var(--color-ink)]">
              Weight-loss rate (₹ per KG loss)
              <input
                type="number"
                step="0.5"
                value={lossRate}
                onChange={(e) => setLossRate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-stop)] focus:ring-2 focus:ring-[var(--color-stop)]/20"
              />
            </label>
            <label className="block text-sm font-medium text-[var(--color-ink)]">
              Driver fare rate (₹ per KG delivered)
              <input
                type="number"
                step="0.5"
                value={fareRate}
                onChange={(e) => setFareRate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-go)] focus:ring-2 focus:ring-[var(--color-go)]/20"
              />
            </label>
            {error && <p className="text-sm text-[var(--color-stop)]">{error}</p>}
            <button
              disabled={saving}
              className="w-full rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium py-2 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save rates"}
            </button>
          </form>
        </div>

        <div className="md:col-span-2">
          <DataTable
            columns={[
              { key: "rate_date", label: "Date" },
              { key: "rate_per_kg_loss", label: "Weight-loss rate (₹/KG)", render: (r) => `₹${r.rate_per_kg_loss}` },
              { key: "driver_fare_rate_per_kg", label: "Driver fare rate (₹/KG)", render: (r) => `₹${r.driver_fare_rate_per_kg}` },
            ]}
            rows={history}
            emptyLabel="No rate history yet."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
