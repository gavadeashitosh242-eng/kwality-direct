import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import StatCard from "../../components/StatCard";
import api from "../../services/api";

export default function AdminEmergenciesPage() {
  const [cases, setCases] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  function load() {
    api.get("/admin/emergencies").then((res) => setCases(res.data)).catch(() => setError("Could not load emergencies."));
  }
  useEffect(load, []);

  async function handleAssignBackup(id) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.post(`/admin/emergencies/${id}/assign-backup`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Could not assign a backup.");
      load(); // status may still have moved to no_backup_available — refresh to show it
    } finally {
      setBusyId(null);
    }
  }

  async function handleResolve(id) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.patch(`/admin/emergencies/${id}`, {});
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Could not resolve the case.");
    } finally {
      setBusyId(null);
    }
  }

  const openCount = cases.filter((c) => c.status !== "resolved").length;

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Emergencies</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        A reported breakdown never cancels the trip — find a backup vehicle and driver, transfer the
        remaining load, and keep the delivery moving. Admin and the assigned backup driver are
        notified automatically at every step.
      </p>

      <div className="mt-4 max-w-xs">
        <StatCard label="Open emergencies" value={openCount} accent={openCount > 0 ? "stop" : "go"} />
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}
      {actionError && <p className="mt-4 text-sm text-[var(--color-stop)]">{actionError}</p>}

      {cases.length === 0 ? (
        <div className="mt-6 border border-dashed border-[var(--color-line)] rounded-xl p-8 text-center text-sm text-[var(--color-slate)]">
          No emergencies reported.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {cases.map((c) => (
            <div key={c.id} className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium text-[var(--color-ink)]">
                  Emergency #{c.id} · {c.trip_code}{" "}
                  <span className="text-[var(--color-slate)] font-normal capitalize">· {c.problem_type.replace(/_/g, " ")}</span>
                </p>
                <StatusBadge status={c.status} />
              </div>

              <div className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-[var(--color-slate)]">
                <p>Original driver: <span className="text-[var(--color-ink)]">{c.driver_name}</span></p>
                <p>Vehicle: <span className="text-[var(--color-ink)]">{c.vehicle_number}</span></p>
                <p>Route: <span className="text-[var(--color-ink)]">{c.route_name || "Unrouted"}</span></p>
                <p>Orders: <span className="text-[var(--color-ink)]">{c.order_count}</span> · Weight: <span className="text-[var(--color-ink)]">{c.total_weight_kg} KG</span></p>
                {c.location && <p>Location: <span className="text-[var(--color-ink)]">{c.location}</span></p>}
                <p>Reported: <span className="text-[var(--color-ink)]">{new Date(c.reported_at).toLocaleString()}</span></p>
                {c.resolved_at && <p>Resolved: <span className="text-[var(--color-ink)]">{new Date(c.resolved_at).toLocaleString()}</span></p>}
              </div>

              {c.notes && <p className="mt-2 text-sm text-[var(--color-ink)]">"{c.notes}"</p>}

              {c.backup_assignment && (
                <p className="mt-3 text-sm text-[var(--color-go)] bg-[var(--color-go)]/8 rounded-lg px-3 py-2">
                  Backup: {c.backup_assignment.backup_driver_name} · {c.backup_assignment.backup_vehicle_number} ·{" "}
                  {c.backup_assignment.load_transferred_kg} KG transferred
                  {c.accepted_at && <> · accepted {new Date(c.accepted_at).toLocaleString()}</>}
                </p>
              )}

              {c.status === "no_backup_available" && (
                <p className="mt-3 text-sm text-[var(--color-stop)] bg-[var(--color-stop)]/8 rounded-lg px-3 py-2">
                  No backup was available when last tried — assign manually once a vehicle/driver frees up.
                </p>
              )}

              <div className="mt-3 flex gap-2">
                {(c.status === "reported" || c.status === "no_backup_available") && (
                  <button
                    onClick={() => handleAssignBackup(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
                  >
                    {busyId === c.id ? "Assigning…" : "Assign backup"}
                  </button>
                )}
                {c.status !== "resolved" && (
                  <button
                    onClick={() => handleResolve(c.id)}
                    disabled={busyId === c.id}
                    className="rounded-lg border border-[var(--color-line)] text-sm font-medium px-4 py-2 disabled:opacity-60"
                  >
                    {busyId === c.id ? "Resolving…" : "Resolve case"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
