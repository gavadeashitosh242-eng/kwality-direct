import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/retailers/orders").then((res) => setOrders(res.data)).catch(() => setError("Could not load your orders."));
  }, []);

  return (
    <DashboardLayout role="retailer">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">My orders</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        Only your own orders — each one keeps the rate it was placed at, permanently.
      </p>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "order_code", label: "Order" },
            { key: "area_name", label: "Area" },
            { key: "quantity_kg", label: "Qty (KG)" },
            { key: "rate_per_kg", label: "Rate (₹/KG)", render: (r) => `₹${r.rate_per_kg}` },
            { key: "total_amount", label: "Total", render: (r) => `₹${r.total_amount.toLocaleString("en-IN")}` },
            { key: "delivery_date", label: "Delivery date" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={orders}
          emptyLabel="You haven't placed any orders yet."
        />
      </div>
    </DashboardLayout>
  );
}
