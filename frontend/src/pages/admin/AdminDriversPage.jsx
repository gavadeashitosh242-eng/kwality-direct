import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", mobile_number: "", licence_number: "" });

  function load() {
    api.get("/admin/drivers").then((res) => setDrivers(res.data)).catch(() => setError("Could not load drivers."));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/drivers", form);
      setForm({ username: "", password: "", full_name: "", mobile_number: "", licence_number: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create driver.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id, status) {
    await api.patch(`/admin/drivers/${id}`, { status });
    load();
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Drivers</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Rotation, trip assignment, and fare tracking are added in Phase 3–4.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add driver"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5 grid grid-cols-2 gap-4">
          <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
          <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
          <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
          <Field label="Mobile number" value={form.mobile_number} onChange={(v) => setForm({ ...form, mobile_number: v })} required />
          <Field label="Licence number" value={form.licence_number} onChange={(v) => setForm({ ...form, licence_number: v })} />
          <div className="col-span-2">
            {error && <p className="text-sm text-[var(--color-stop)] mb-2">{error}</p>}
            <button disabled={saving} className="rounded-lg bg-[var(--color-ink)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
              {saving ? "Saving…" : "Create driver"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "driver_code", label: "Code" },
            { key: "full_name", label: "Name" },
            { key: "mobile_number", label: "Mobile" },
            { key: "licence_number", label: "Licence" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  {r.status !== "available" && (
                    <button className="text-xs text-[var(--color-go)] hover:underline" onClick={() => setStatus(r.id, "available")}>Mark available</button>
                  )}
                  {r.status !== "offline" && (
                    <button className="text-xs text-[var(--color-slate)] hover:underline" onClick={() => setStatus(r.id, "offline")}>Mark offline</button>
                  )}
                </div>
              ),
            },
          ]}
          rows={drivers}
          emptyLabel="No drivers yet — add the first one above."
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
