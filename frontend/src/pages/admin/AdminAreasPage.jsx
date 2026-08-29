import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import api from "../../services/api";

export default function AdminAreasPage() {
  const [areas, setAreas] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", region: "Goa" });

  function load() {
    api.get("/admin/areas").then((res) => setAreas(res.data)).catch(() => setError("Could not load areas."));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/areas", form);
      setForm({ name: "", region: "Goa" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create area.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Delivery areas</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Grouping nearby areas into practical routes is added in Phase 3.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add area"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5 grid grid-cols-2 gap-4">
          <Field label="Area name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Region" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
          <div className="col-span-2">
            {error && <p className="text-sm text-[var(--color-stop)] mb-2">{error}</p>}
            <button disabled={saving} className="rounded-lg bg-[var(--color-ink)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
              {saving ? "Saving…" : "Add area"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "name", label: "Area" },
            { key: "region", label: "Region" },
          ]}
          rows={areas}
          emptyLabel="No areas yet — add the first one above."
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
