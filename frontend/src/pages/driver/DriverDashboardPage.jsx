import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

const PROBLEM_TYPES = [
  { value: "breakdown", label: "Vehicle breakdown" },
  { value: "accident", label: "Accident" },
  { value: "engine_problem", label: "Engine problem" },
  { value: "tyre_problem", label: "Tyre problem" },
  { value: "other", label: "Other" },
];

export default function DriverDashboardPage() {
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);
  const [loadingWeight, setLoadingWeight] = useState("");
  const [deliveryWeight, setDeliveryWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [result, setResult] = useState(null);

  const [showEmergency, setShowEmergency] = useState(false);
  const [problemType, setProblemType] = useState("breakdown");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [emergencyFiled, setEmergencyFiled] = useState(false);

  const [backupCase, setBackupCase] = useState(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [showBackupDetail, setShowBackupDetail] = useState(false);

  function load() {
    api
      .get("/drivers/dashboard")
      .then((res) => setTrip(res.data.todays_trip))
      .catch(() => setError("Could not load your dashboard."));
    api
      .get("/drivers/emergencies")
      .then((res) => {
        const active = res.data.find((c) => c.role_in_case === "backup_driver" && c.status !== "resolved");
        setBackupCase(active || null);
      })
      .catch(() => {});
  }
  useEffect(load, []);

  async function handleAcceptBackup() {
    setBackupBusy(true);
    try {
      const res = await api.post(`/drivers/emergencies/${backupCase.id}/accept`);
      setBackupCase(res.data);
    } catch {
      // surfaced inline via unchanged state; not critical to block the UI
    } finally {
      setBackupBusy(false);
    }
  }


  async function handleLoad(e) {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      const res = await api.post(`/drivers/trips/${trip.id}/load`, { loading_weight_kg: Number(loadingWeight) });
      setTrip(res.data.trip);
      setLoadingWeight("");
    } catch (err) {
      setActionError(err.response?.data?.error || "Could not record loading weight.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await api.post(`/drivers/trips/${trip.id}/start`);
      setTrip(res.data);
    } catch (err) {
      setActionError(err.response?.data?.error || "Could not start transit.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeliver(e) {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      const res = await api.post(`/drivers/trips/${trip.id}/deliver`, { delivery_weight_kg: Number(deliveryWeight) });
      setTrip(res.data.trip);
      setResult(res.data);
      setDeliveryWeight("");
    } catch (err) {
      setActionError(err.response?.data?.error || "Could not record delivery weight.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReportEmergency(e) {
    e.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/drivers/trips/${trip.id}/emergency`, { problem_type: problemType, location, notes });
      setEmergencyFiled(true);
      setShowEmergency(false);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || "Could not report the emergency.");
    } finally {
      setBusy(false);
    }
  }

  const canReportEmergency = trip && ["loaded", "in_transit"].includes(trip.status);

  return (
    <DashboardLayout role="driver">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Today's trip</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Only your own assigned trip — never another driver's numbers.
      </p>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      {backupCase && (
        <div className="mt-4 max-w-xl bg-[var(--color-stop)]/8 border-2 border-[var(--color-stop)]/40 rounded-xl p-5">
          <p className="text-sm font-semibold text-[var(--color-stop)]">🚨 Emergency Assignment</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <p className="text-[var(--color-slate)]">Original driver</p>
            <p className="text-[var(--color-ink)] font-medium">{backupCase.driver_name}</p>
            <p className="text-[var(--color-slate)]">Emergency type</p>
            <p className="text-[var(--color-ink)] font-medium capitalize">{backupCase.problem_type.replace(/_/g, " ")}</p>
            <p className="text-[var(--color-slate)]">Trip</p>
            <p className="text-[var(--color-ink)] font-medium">{backupCase.trip_code}</p>
            <p className="text-[var(--color-slate)]">Route</p>
            <p className="text-[var(--color-ink)] font-medium">{backupCase.route_name || "Unrouted"}</p>
            <p className="text-[var(--color-slate)]">Orders</p>
            <p className="text-[var(--color-ink)] font-medium">{backupCase.order_count}</p>
            <p className="text-[var(--color-slate)]">Total weight</p>
            <p className="text-[var(--color-ink)] font-medium">{backupCase.total_weight_kg} KG</p>
          </div>

          <div className="mt-3">
            <StatusBadge status={backupCase.status} />
          </div>

          {showBackupDetail && backupCase.notes && (
            <p className="mt-2 text-sm text-[var(--color-ink)]">Reported reason: "{backupCase.notes}"</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setShowBackupDetail((s) => !s)}
              className="rounded-lg border border-[var(--color-line)] text-sm font-medium px-4 py-2"
            >
              View emergency
            </button>
            {!backupCase.accepted_at && (
              <button
                onClick={handleAcceptBackup}
                disabled={backupBusy}
                className="rounded-lg bg-[var(--color-stop)] text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
              >
                {backupBusy ? "Accepting…" : "Accept emergency trip"}
              </button>
            )}
            {backupCase.accepted_at && (
              <span className="text-sm text-[var(--color-go)] px-2 py-2">
                ✓ Accepted — continue below with Load / Start / Deliver as normal.
              </span>
            )}
          </div>
        </div>
      )}

      {!trip && !error && (
        <div className="mt-6 border border-dashed border-[var(--color-line)] rounded-xl p-8 text-center text-sm text-[var(--color-slate)]">
          No trip assigned to you yet today.
        </div>
      )}

      {trip && (
        <div className="mt-6 max-w-xl">
          <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
            <div className="flex items-center justify-between">
              <p className="font-medium text-[var(--color-ink)]">
                {trip.trip_code} <span className="text-[var(--color-slate)] font-normal">· {trip.route_name || "Unrouted"}</span>
              </p>
              <StatusBadge status={trip.status} />
            </div>
            <p className="mt-1 text-sm text-[var(--color-slate)]">
              Vehicle {trip.vehicle_number} · {trip.total_weight_kg} / {trip.vehicle_capacity_kg} KG
            </p>

            <p className="mt-4 text-xs uppercase tracking-wide text-[var(--color-slate)]">Delivery sequence</p>
            <ul className="mt-2 text-sm text-[var(--color-ink)] space-y-1">
              {trip.orders.map((o) => (
                <li key={o.id} className="flex justify-between">
                  <span>{o.order_code} — {o.retailer_shop_name} ({o.area_name})</span>
                  <span className="text-[var(--color-slate)]">{o.quantity_kg} KG</span>
                </li>
              ))}
            </ul>
          </div>

          {trip.status === "emergency" && (
            <div className="mt-4 bg-[var(--color-stop)]/10 border border-[var(--color-stop)]/30 rounded-xl p-5">
              <p className="text-sm font-medium text-[var(--color-stop)]">
                Emergency reported — waiting for the company to assign a backup vehicle and driver.
              </p>
            </div>
          )}

          {trip.status === "driver_assigned" && (
            <form onSubmit={handleLoad} className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
              <label className="text-sm font-medium text-[var(--color-ink)]">
                Loading weight (KG)
                <input
                  type="number"
                  required
                  value={loadingWeight}
                  onChange={(e) => setLoadingWeight(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
                />
              </label>
              {actionError && <p className="mt-2 text-sm text-[var(--color-stop)]">{actionError}</p>}
              <button disabled={busy} className="mt-3 w-full rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium py-2.5 disabled:opacity-60">
                {busy ? "Saving…" : "Confirm loaded"}
              </button>
            </form>
          )}

          {trip.status === "loaded" && (
            <div className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
              {actionError && <p className="mb-2 text-sm text-[var(--color-stop)]">{actionError}</p>}
              <button onClick={handleStart} disabled={busy} className="w-full rounded-lg bg-[var(--color-route)] hover:opacity-90 text-white text-sm font-medium py-2.5 disabled:opacity-60">
                {busy ? "Starting…" : "Start transit"}
              </button>
            </div>
          )}

          {trip.status === "in_transit" && (
            <form onSubmit={handleDeliver} className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
              <label className="text-sm font-medium text-[var(--color-ink)]">
                Delivery weight (KG)
                <input
                  type="number"
                  required
                  value={deliveryWeight}
                  onChange={(e) => setDeliveryWeight(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/30"
                />
              </label>
              {actionError && <p className="mt-2 text-sm text-[var(--color-stop)]">{actionError}</p>}
              <button disabled={busy} className="mt-3 w-full rounded-lg bg-[var(--color-go)] hover:opacity-90 text-white text-sm font-medium py-2.5 disabled:opacity-60">
                {busy ? "Saving…" : "Confirm delivered"}
              </button>
            </form>
          )}

          {trip.status === "delivered" && result && (
            <div className="mt-4 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-slate)] mb-3">Trip settlement</p>
              <dl className="text-sm divide-y divide-[var(--color-line)]">
                <Row label="Loaded weight" value={`${result.weight_record.loading_weight_kg} KG`} />
                <Row label="Delivered weight" value={`${result.weight_record.delivery_weight_kg} KG`} />
                <Row label="Weight loss" value={`${result.weight_record.weight_loss_kg} KG (${result.weight_record.weight_loss_percent}%)`} />
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[var(--color-stop)]/8 border border-[var(--color-stop)]/20 p-3">
                  <p className="text-xs text-[var(--color-slate)]">Weight-loss amount</p>
                  <p className="text-xs text-[var(--color-slate)]">@ ₹{result.fare.weight_loss_rate_per_kg}/KG loss</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-stop)]">₹{result.fare.weight_loss_amount.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-lg bg-[var(--color-go)]/8 border border-[var(--color-go)]/20 p-3">
                  <p className="text-xs text-[var(--color-slate)]">Driver fare</p>
                  <p className="text-xs text-[var(--color-slate)]">@ ₹{result.fare.driver_fare_rate_per_kg}/KG delivered</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--color-go)]">₹{result.fare.fare_amount.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-[var(--color-slate)]">
                These are two separate records — your fare is based only on delivered weight, never on the weight loss.
              </p>
            </div>
          )}
          {trip.status === "delivered" && !result && (
            <p className="mt-4 text-sm text-[var(--color-go)]">Trip completed.</p>
          )}

          {canReportEmergency && !emergencyFiled && (
            <div className="mt-4">
              {!showEmergency ? (
                <button
                  onClick={() => setShowEmergency(true)}
                  className="w-full rounded-lg border border-[var(--color-stop)] text-[var(--color-stop)] text-sm font-semibold py-2.5 hover:bg-[var(--color-stop)]/5"
                >
                  ⚠ Emergency / Request backup
                </button>
              ) : (
                <form onSubmit={handleReportEmergency} className="bg-[var(--color-stop)]/5 border border-[var(--color-stop)]/30 rounded-xl p-5">
                  <p className="text-sm font-semibold text-[var(--color-stop)]">Report a problem</p>
                  <label className="block mt-3 text-sm font-medium text-[var(--color-ink)]">
                    What happened?
                    <select
                      value={problemType}
                      onChange={(e) => setProblemType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                    >
                      {PROBLEM_TYPES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block mt-3 text-sm font-medium text-[var(--color-ink)]">
                    Location
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. NH-66 near Ponda"
                      className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block mt-3 text-sm font-medium text-[var(--color-ink)]">
                    Notes (optional)
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                    />
                  </label>
                  {actionError && <p className="mt-2 text-sm text-[var(--color-stop)]">{actionError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button disabled={busy} className="flex-1 rounded-lg bg-[var(--color-stop)] text-white text-sm font-semibold py-2.5 disabled:opacity-60">
                      {busy ? "Reporting…" : "Report emergency"}
                    </button>
                    <button type="button" onClick={() => setShowEmergency(false)} className="rounded-lg border border-[var(--color-line)] text-sm px-4">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-[var(--color-slate)]">{label}</dt>
      <dd className="font-medium text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}
