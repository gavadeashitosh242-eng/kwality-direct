import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatCard from "../../components/StatCard";
import api from "../../services/api";

export default function DriverFarePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/drivers/fare").then((res) => setData(res.data)).catch(() => setError("Could not load fare history."));
  }, []);

  return (
    <DashboardLayout role="driver">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">My fare</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Your fare is calculated only on delivered weight. Weight-loss amount is a separate record,
        not part of your pay.
      </p>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      {data && (
        <>
          <div className="mt-5 grid grid-cols-3 gap-4 max-w-xl">
            <StatCard label="This month's fare" value={`₹${data.monthly_fare.toLocaleString("en-IN")}`} accent="go" />
            <StatCard label="All-time fare" value={`₹${data.total_fare.toLocaleString("en-IN")}`} accent="amber" />
            <StatCard label="All-time weight-loss amount" value={`₹${data.total_weight_loss_amount.toLocaleString("en-IN")}`} accent="stop" />
          </div>

          <div className="mt-5">
            <DataTable
              columns={[
                { key: "trip_code", label: "Trip" },
                { key: "loaded_weight_kg", label: "Loaded (KG)" },
                { key: "delivered_weight_kg", label: "Delivered (KG)" },
                { key: "weight_loss_kg", label: "Weight loss (KG)" },
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
              rows={data.fares}
              emptyLabel="No completed trips yet."
            />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
