import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicle_number: "", capacity_kg: "", is_backup: false });

  function load() {
    api.get("/admin/vehicles").then((res) => setVehicles(res.data)).catch(() => setError("Could not load vehicles."));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/vehicles", { ...form, capacity_kg: Number(form.capacity_kg) });
      setForm({ vehicle_number: "", capacity_kg: "", is_backup: false });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id, status) {
    await api.patch(`/admin/vehicles/${id}`, { status });
    load();
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Vehicles</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Capacity-aware trip assignment is added in Phase 3.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add vehicle"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5 grid grid-cols-2 gap-4">
          <Field label="Vehicle number" value={form.vehicle_number} onChange={(v) => setForm({ ...form, vehicle_number: v })} required />
          <Field label="Capacity (KG)" type="number" value={form.capacity_kg} onChange={(v) => setForm({ ...form, capacity_kg: v })} required />
          <label className="text-sm font-medium text-[var(--color-ink)] flex items-center gap-2 mt-6">
            <input type="checkbox" checked={form.is_backup} onChange={(e) => setForm({ ...form, is_backup: e.target.checked })} />
            Backup vehicle
          </label>
          <div className="col-span-2">
            {error && <p className="text-sm text-[var(--color-stop)] mb-2">{error}</p>}
            <button disabled={saving} className="rounded-lg bg-[var(--color-ink)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
              {saving ? "Saving…" : "Add vehicle"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "vehicle_number", label: "Vehicle no." },
            { key: "capacity_kg", label: "Capacity (KG)" },
            { key: "is_backup", label: "Backup?", render: (r) => (r.is_backup ? "Yes" : "No") },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  {r.status !== "available" && (
                    <button className="text-xs text-[var(--color-go)] hover:underline" onClick={() => setStatus(r.id, "available")}>Mark available</button>
                  )}
                  {r.status !== "maintenance" && (
                    <button className="text-xs text-[var(--color-wait)] hover:underline" onClick={() => setStatus(r.id, "maintenance")}>Send to maintenance</button>
                  )}
                </div>
              ),
            },
          ]}
          rows={vehicles}
          emptyLabel="No vehicles yet — add the first one above."
        />
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <label className="text-sm font-medium text-[var(--color-ink)]">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
      />
    </label>
  );
}
