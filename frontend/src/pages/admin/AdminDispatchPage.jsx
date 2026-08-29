import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function AdminDispatchPage() {
  const [demand, setDemand] = useState([]);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState(null);

  function loadDemand() {
    api.get("/admin/orders/area-summary").then((res) => setDemand(res.data)).catch(() => setError("Could not load demand."));
  }
  useEffect(loadDemand, []);

  async function handleRunDispatch() {
    setRunning(true);
    setRunError(null);
    setResult(null);
    try {
      const res = await api.post("/admin/dispatch/run", {});
      setResult(res.data);
      loadDemand();
    } catch (err) {
      setRunError(err.response?.data?.error || "Dispatch failed.");
    } finally {
      setRunning(false);
    }
  }

  const totalKg = demand.reduce((sum, d) => sum + d.quantity_kg, 0);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Dispatch</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Groups today's confirmed orders by area and route, packs them into vehicles by capacity
        (never activating a second vehicle while the first still has room), and assigns a driver by
        fair rotation.
      </p>

      <div className="mt-6 grid md:grid-cols-2 gap-5">
        <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Today's confirmed demand, by area</p>
          {error && <p className="mt-2 text-sm text-[var(--color-stop)]">{error}</p>}
          {demand.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-slate)]">No confirmed orders waiting to be dispatched.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {demand.map((d) => (
                <div key={d.area_id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-ink)]">
                    {d.area_name}
                    {d.route_name ? (
                      <span className="text-[var(--color-slate)]"> · {d.route_name}</span>
                    ) : (
                      <span className="text-[var(--color-stop)]"> · unrouted</span>
                    )}
                  </span>
                  <span className="font-medium text-[var(--color-amber-deep)]">{d.quantity_kg} KG</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-[var(--color-line)] flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{totalKg} KG</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-5 flex flex-col">
          <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Run dispatch</p>
          <p className="mt-2 text-sm text-[var(--color-slate)]">
            Confirms which vehicles and drivers to use for today's demand above.
          </p>
          <button
            onClick={handleRunDispatch}
            disabled={running || demand.length === 0}
            className="mt-4 rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium py-2.5 disabled:opacity-50"
          >
            {running ? "Dispatching…" : "Run dispatch for today"}
          </button>
          {runError && <p className="mt-3 text-sm text-[var(--color-stop)]">{runError}</p>}
        </div>
      </div>

      {result && (
        <div className="mt-6">
          <p className="text-sm font-medium text-[var(--color-ink)] mb-2">
            {result.trips_created.length} trip{result.trips_created.length !== 1 ? "s" : ""} created
          </p>
          <div className="space-y-3">
            {result.trips_created.map((t) => (
              <div key={t.id} className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[var(--color-ink)]">
                    {t.trip_code} <span className="text-[var(--color-slate)] font-normal">· {t.route_name || "Unrouted"}</span>
                  </p>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-1 text-sm text-[var(--color-slate)]">
                  Vehicle {t.vehicle_number} ({t.total_weight_kg}/{t.vehicle_capacity_kg} KG) · Driver {t.driver_name}
                </p>
                <ul className="mt-2 text-sm text-[var(--color-ink)] space-y-0.5">
                  {t.orders.map((o) => (
                    <li key={o.id}>
                      {o.order_code} — {o.retailer_shop_name} — {o.quantity_kg} KG
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {result.unrouted_orders.length > 0 && (
            <p className="mt-3 text-sm text-[var(--color-stop)]">
              Unrouted (no route assigned to their area): {result.unrouted_orders.join(", ")}
            </p>
          )}
          {result.errors.length > 0 && (
            <p className="mt-3 text-sm text-[var(--color-stop)]">{result.errors.join(" · ")}</p>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
