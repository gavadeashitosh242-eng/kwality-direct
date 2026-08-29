import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import api from "../../services/api";

export default function AdminDriverFaresPage() {
  const [fares, setFares] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/admin/driver-fares").then((res) => setFares(res.data)).catch(() => setError("Could not load driver fares."));
  }, []);

  const totalFare = fares.reduce((sum, f) => sum + f.fare_amount, 0);
  const totalLossAmount = fares.reduce((sum, f) => sum + f.weight_loss_amount, 0);

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Driver fares</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Two separate records per trip — driver fare (delivered weight × fare rate) is the
            driver's pay; weight-loss amount (weight loss × loss rate) is a separate
            penalty/recovery record. They are never added together.
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Total loss amount</p>
            <p className="text-xl font-semibold text-[var(--color-stop)]">₹{totalLossAmount.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-slate)]">Total fare paid</p>
            <p className="text-xl font-semibold text-[var(--color-go)]">₹{totalFare.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "trip_code", label: "Trip" },
            { key: "driver_name", label: "Driver" },
            { key: "loaded_weight_kg", label: "Loaded (KG)" },
            { key: "delivered_weight_kg", label: "Delivered (KG)" },
            { key: "weight_loss_kg", label: "Loss (KG)" },
            { key: "weight_loss_rate_per_kg", label: "Loss rate (₹/KG)", render: (f) => `₹${f.weight_loss_rate_per_kg}` },
            {
              key: "weight_loss_amount",
              label: "Loss amount",
              render: (f) => <span className="text-[var(--color-stop)] font-medium">₹{f.weight_loss_amount.toLocaleString("en-IN")}</span>,
            },
            { key: "driver_fare_rate_per_kg", label: "Fare rate (₹/KG)", render: (f) => `₹${f.driver_fare_rate_per_kg}` },
            {
              key: "fare_amount",
              label: "Driver fare",
              render: (f) => <span className="text-[var(--color-go)] font-medium">₹{f.fare_amount.toLocaleString("en-IN")}</span>,
            },
          ]}
          rows={fares}
          emptyLabel="No driver fares recorded yet."
        />
      </div>
    </DashboardLayout>
  );
}
