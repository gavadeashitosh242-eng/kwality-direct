import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import StatCard from "../../components/StatCard";
import api from "../../services/api";

export default function RetailerDashboardPage() {
  const [rate, setRate] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/retailers/current-rate").then((res) => setRate(res.data)).catch(() => setError("Could not load today's rate."));
    api.get("/retailers/orders").then((res) => setOrders(res.data)).catch(() => {});
  }, []);

  const openOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const totalSpend = orders.reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <DashboardLayout role="retailer">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Your dashboard</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        You only ever see your own shop's data — never other retailers' orders or company internals.
      </p>

      {error && <p className="mt-6 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Today's chicken rate" value={rate ? `₹${rate.rate_per_kg}/KG` : "—"} accent="amber" />
        <StatCard label="Open orders" value={openOrders} accent="route" />
        <StatCard label="Lifetime order value" value={`₹${totalSpend.toLocaleString("en-IN")}`} accent="go" />
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <Link to="/retailer/place-order" className="block bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] transition-colors text-white rounded-xl p-5 font-medium">
          Place a new order →
        </Link>
        <Link to="/retailer/orders" className="block bg-[var(--color-panel)] border border-[var(--color-line)] hover:border-[var(--color-amber)] transition-colors rounded-xl p-5 font-medium text-[var(--color-ink)]">
          View my order history →
        </Link>
      </div>
    </DashboardLayout>
  );
}
