import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatCard from "../../components/StatCard";
import api from "../../services/api";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load dashboard data."));
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Company dashboard</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Live counts from the database. Trips, weight-loss and driver-fare KPIs arrive in Phase 3–4.
      </p>

      {error && <p className="mt-6 text-sm text-[var(--color-stop)]">{error}</p>}

      {data && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today's orders" value={data.todays_orders} accent="amber" />
          <StatCard label="Total orders" value={data.total_orders} accent="route" />
          <StatCard label="Total KG ordered" value={data.total_kg_ordered} accent="go" />
          <StatCard
            label="Current chicken rate"
            value={data.current_chicken_rate ? `₹${data.current_chicken_rate.rate_per_kg}/KG` : "—"}
            accent="amber"
          />
          <StatCard label="Active retailers" value={data.active_retailers} accent="amber" />
          <StatCard label="Total drivers" value={data.total_drivers} accent="route" />
          <StatCard label="Available vehicles" value={data.available_vehicles} accent="go" />
          <StatCard label="Open emergencies" value={data.open_emergencies} accent={data.open_emergencies > 0 ? "stop" : "go"} />
        </div>
      )}

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <QuickLink to="/admin/orders" label="View all orders" />
        <QuickLink to="/admin/dispatch" label="Run dispatch" />
        <QuickLink to="/admin/emergencies" label="View emergencies" />
        <QuickLink to="/admin/analytics" label="View analytics" />
      </div>

      <div className="mt-6 border border-dashed border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-slate)]">
        Payments, invoices and full analytics charts are built in Phase 6.
      </div>
    </DashboardLayout>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link
      to={to}
      className="block bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-4 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-amber)] transition-colors"
    >
      {label} →
    </Link>
  );
}
