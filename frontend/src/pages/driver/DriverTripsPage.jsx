import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function DriverTripsPage() {
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/drivers/trips").then((res) => setTrips(res.data)).catch(() => setError("Could not load trip history."));
  }, []);

  return (
    <DashboardLayout role="driver">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Trip history</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">Only your own trips.</p>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "trip_code", label: "Trip" },
            { key: "route_name", label: "Route", render: (t) => t.route_name || "Unrouted" },
            { key: "delivery_date", label: "Date" },
            { key: "total_weight_kg", label: "Load (KG)" },
            { key: "status", label: "Status", render: (t) => <StatusBadge status={t.status} /> },
          ]}
          rows={trips}
          emptyLabel="No trips yet."
        />
      </div>
    </DashboardLayout>
  );
}
