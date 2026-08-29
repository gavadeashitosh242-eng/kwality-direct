import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function AdminTripsPage() {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/admin/trips").then((res) => setTrips(res.data)).catch(() => setError("Could not load trips."));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Trips</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Every dispatched trip — vehicle, driver, route, and load. Weight-loss and fare are recorded once loading/delivery is tracked in Phase 4.
      </p>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "trip_code", label: "Trip" },
            { key: "route_name", label: "Route", render: (t) => t.route_name || "Unrouted" },
            { key: "vehicle_number", label: "Vehicle" },
            { key: "driver_name", label: "Driver", render: (t) => t.driver_name || "Unassigned" },
            { key: "total_weight_kg", label: "Load (KG)", render: (t) => `${t.total_weight_kg} / ${t.vehicle_capacity_kg}` },
            { key: "order_count", label: "Orders" },
            { key: "delivery_date", label: "Date" },
            { key: "status", label: "Status", render: (t) => <StatusBadge status={t.status} /> },
          ]}
          rows={trips}
          emptyLabel="No trips yet — run dispatch to create the first one."
        />
      </div>
    </DashboardLayout>
  );
}
