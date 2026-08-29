import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function AdminRetailersPage() {
  const [retailers, setRetailers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", shop_name: "", owner_name: "", mobile_number: "", area_id: "",
  });

  function load() {
    api.get("/admin/retailers").then((res) => setRetailers(res.data)).catch(() => setError("Could not load retailers."));
    api.get("/admin/areas").then((res) => setAreas(res.data)).catch(() => {});
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/retailers", { ...form, area_id: form.area_id || null });
      setForm({ username: "", password: "", shop_name: "", owner_name: "", mobile_number: "", area_id: "" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not create retailer.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id, status) {
    await api.patch(`/admin/retailers/${id}`, { status });
    load();
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Retailers</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Only approved (active) retailers can log in and place orders.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add retailer"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5 grid grid-cols-2 gap-4">
          <Field label="Username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
          <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
          <Field label="Shop name" value={form.shop_name} onChange={(v) => setForm({ ...form, shop_name: v })} required />
          <Field label="Owner name" value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} required />
          <Field label="Mobile number" value={form.mobile_number} onChange={(v) => setForm({ ...form, mobile_number: v })} required />
          <label className="text-sm font-medium text-[var(--color-ink)]">
            Delivery area
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
              value={form.area_id}
              onChange={(e) => setForm({ ...form, area_id: e.target.value })}
            >
              <option value="">— none —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <div className="col-span-2">
            {error && <p className="text-sm text-[var(--color-stop)] mb-2">{error}</p>}
            <button disabled={saving} className="rounded-lg bg-[var(--color-ink)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60">
              {saving ? "Saving…" : "Create retailer"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "retailer_code", label: "Code" },
            { key: "shop_name", label: "Shop" },
            { key: "owner_name", label: "Owner" },
            { key: "mobile_number", label: "Mobile" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  {r.status !== "active" && (
                    <button className="text-xs text-[var(--color-go)] hover:underline" onClick={() => setStatus(r.id, "active")}>Approve</button>
                  )}
                  {r.status !== "blocked" && (
                    <button className="text-xs text-[var(--color-stop)] hover:underline" onClick={() => setStatus(r.id, "blocked")}>Block</button>
                  )}
                </div>
              ),
            },
          ]}
          rows={retailers}
          emptyLabel="No retailers yet — add the first one above."
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
