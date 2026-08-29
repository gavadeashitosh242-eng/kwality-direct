import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatCard from "../../components/StatCard";
import api from "../../services/api";

export default function DriverPerformancePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/drivers/performance").then((res) => setData(res.data)).catch(() => setError("Could not load performance."));
  }, []);

  return (
    <DashboardLayout role="driver">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">My performance</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">Your own stats only.</p>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      {data && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total trips" value={data.total_trips} accent="route" />
          <StatCard label="Completed" value={data.completed_trips} accent="go" />
          <StatCard label="Cancelled" value={data.cancelled_trips} accent="stop" />
          <StatCard label="Emergency" value={data.emergency_trips} accent="stop" />
          <StatCard label="Total KG transported" value={data.total_kg_transported} accent="amber" />
          <StatCard label="Total weight loss" value={`${data.total_weight_loss_kg} KG`} accent="wait" />
          <StatCard label="Avg weight loss %" value={`${data.average_weight_loss_percent}%`} accent="wait" />
          <StatCard label="Total earnings (fare)" value={`₹${data.total_earnings.toLocaleString("en-IN")}`} accent="go" />
          <StatCard label="Total weight-loss amount" value={`₹${data.total_weight_loss_amount.toLocaleString("en-IN")}`} accent="stop" />
        </div>
      )}
    </DashboardLayout>
  );
}
