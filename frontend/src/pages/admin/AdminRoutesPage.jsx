import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import api from "../../services/api";

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", source: "Chandgad", region: "Goa", area_ids: [] });

  function load() {
    api.get("/admin/routes").then((res) => setRoutes(res.data)).catch(() => setError("Could not load routes."));
    api.get("/admin/areas").then((res) => setAreas(res.data)).catch(() => {});
  }
  useEffect(load, []);

  function toggleArea(id) {
    setForm((f) => {
      const has = f.area_ids.includes(id);
      return { ...f, area_ids: has ? f.area_ids.filter((a) => a !== id) : [...f.area_ids, id] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/routes", form);
      setForm({ name: "", source: "Chandgad", region: "Goa", area_ids: [] });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create route.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Routes</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Group nearby areas into a practical route — the order you tick them in becomes the delivery sequence.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add route"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Route name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Source depot" value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
            <Field label="Region" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
          </div>

          <p className="mt-4 text-sm font-medium text-[var(--color-ink)]">Areas on this route (tick in delivery order)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {areas.map((a) => {
              const idx = form.area_ids.indexOf(a.id);
              const selected = idx !== -1;
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggleArea(a.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? "bg-[var(--color-route)] border-[var(--color-route)] text-white"
                      : "border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-amber)]"
                  }`}
                >
                  {selected ? `${idx + 1}. ` : ""}{a.name}
                </button>
              );
            })}
          </div>

          {error && <p className="mt-3 text-sm text-[var(--color-stop)]">{error}</p>}
          <button disabled={saving} className="mt-4 rounded-lg bg-[var(--color-ink)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
            {saving ? "Saving…" : "Create route"}
          </button>
        </form>
      )}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "name", label: "Route" },
            { key: "source", label: "Source" },
            { key: "region", label: "Region" },
            {
              key: "areas",
              label: "Sequence",
              render: (r) => r.areas.map((a) => a.name).join(" → ") || "—",
            },
          ]}
          rows={routes}
          emptyLabel="No routes yet — add the first one above."
        />
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange, required }) {
  return (
    <label className="text-sm font-medium text-[var(--color-ink)]">
      {label}
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
      />
    </label>
  );
}
