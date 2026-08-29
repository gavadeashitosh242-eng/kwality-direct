import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DashboardLayout from "../../layouts/DashboardLayout";
import api from "../../services/api";

export default function AdminChickenRatesPage() {
  const [history, setHistory] = useState([]);
  const [newRate, setNewRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    api.get("/admin/chicken-rate").then((res) => setHistory([...res.data].reverse())).catch(() => setError("Could not load rate history."));
  }
  useEffect(load, []);

  const today = history[history.length - 1];

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/chicken-rate", { rate_per_kg: Number(newRate) });
      setNewRate("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not update rate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Chicken rate</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Every order permanently keeps the rate that was live when it was placed — changing today's
        rate never touches past orders.
      </p>

      <div className="mt-6 grid md:grid-cols-3 gap-5">
        <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Today's rate</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-amber-deep)]">
            {today ? `₹${today.rate_per_kg}` : "—"}
            <span className="text-sm font-normal text-[var(--color-slate)]"> /KG</span>
          </p>

          <form onSubmit={handleSubmit} className="mt-5">
            <label className="text-sm font-medium text-[var(--color-ink)]">
              Update today's rate (₹/KG)
              <input
                type="number"
                step="0.5"
                required
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
              />
            </label>
            {error && <p className="mt-2 text-sm text-[var(--color-stop)]">{error}</p>}
            <button
              disabled={saving}
              className="mt-3 w-full rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium py-2 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save rate"}
            </button>
          </form>
        </div>

        <div className="md:col-span-2 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-slate)] mb-3">Rate history</p>
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                <XAxis dataKey="rate_date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip formatter={(v) => [`₹${v}/KG`, "Rate"]} />
                <Line type="monotone" dataKey="rate_per_kg" stroke="var(--color-amber-deep)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--color-slate)]">No rate history yet.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
