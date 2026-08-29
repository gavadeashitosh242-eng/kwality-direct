import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import api from "../../services/api";

export default function AdminWeightLossPage() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/admin/weight-loss").then((res) => setRecords(res.data)).catch(() => setError("Could not load weight loss data."));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Weight loss</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Driver-wise, vehicle-wise, and route-wise weight loss for every completed trip. Rows above 5% are flagged.
      </p>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "trip_code", label: "Trip" },
            { key: "driver_name", label: "Driver" },
            { key: "vehicle_number", label: "Vehicle" },
            { key: "route_name", label: "Route", render: (r) => r.route_name || "Unrouted" },
            { key: "loading_weight_kg", label: "Loaded (KG)" },
            { key: "delivery_weight_kg", label: "Delivered (KG)" },
            { key: "weight_loss_kg", label: "Loss (KG)" },
            {
              key: "weight_loss_percent",
              label: "Loss %",
              render: (r) => (
                <span className={r.high_loss_alert ? "text-[var(--color-stop)] font-semibold" : ""}>
                  {r.weight_loss_percent}% {r.high_loss_alert ? "⚠" : ""}
                </span>
              ),
            },
            {
              key: "weight_loss_amount",
              label: "Loss amount",
              render: (r) => (r.weight_loss_amount != null ? `₹${r.weight_loss_amount.toLocaleString("en-IN")}` : "—"),
            },
            {
              key: "driver_fare_amount",
              label: "Driver fare",
              render: (r) => (r.driver_fare_amount != null ? `₹${r.driver_fare_amount.toLocaleString("en-IN")}` : "—"),
            },
          ]}
          rows={records}
          emptyLabel="No completed trips with weight data yet."
        />
      </div>
    </DashboardLayout>
  );
}
