import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  function load() {
    api.get("/admin/orders").then((res) => setOrders(res.data)).catch(() => setError("Could not load orders."));
  }
  useEffect(load, []);

  async function confirmOrder(id) {
    await api.patch(`/admin/orders/${id}`, { status: "confirmed" });
    load();
  }

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">Orders</h1>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Confirm placed orders so they're picked up by dispatch.
          </p>
        </div>
        <Link
          to="/admin/dispatch"
          className="rounded-lg bg-[var(--color-amber)] hover:bg-[var(--color-amber-deep)] text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          Go to dispatch →
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-[var(--color-stop)]">{error}</p>}

      <div className="mt-5">
        <DataTable
          columns={[
            { key: "order_code", label: "Order" },
            { key: "retailer_shop_name", label: "Retailer" },
            { key: "area_name", label: "Area" },
            { key: "quantity_kg", label: "Qty (KG)" },
            { key: "rate_per_kg", label: "Rate (₹/KG)", render: (r) => `₹${r.rate_per_kg}` },
            { key: "total_amount", label: "Total", render: (r) => `₹${r.total_amount.toLocaleString("en-IN")}` },
            { key: "delivery_date", label: "Delivery date" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div className="flex gap-2 items-center">
                  {r.status === "placed" && (
                    <button className="text-xs text-[var(--color-go)] hover:underline" onClick={() => confirmOrder(r.id)}>
                      Confirm
                    </button>
                  )}
                  {r.status === "delivered" && (
                    <Link to={`/admin/payments?order_id=${r.id}`} className="text-xs text-[var(--color-route)] hover:underline">
                      Payment
                    </Link>
                  )}
                  {r.status === "delivered" && (
                    <Link to={`/admin/invoices?order_id=${r.id}`} className="text-xs text-[var(--color-amber-deep)] hover:underline">
                      Invoice
                    </Link>
                  )}
                  {r.status !== "placed" && r.status !== "delivered" && (
                    <span className="text-xs text-[var(--color-slate)]">—</span>
                  )}
                </div>
              ),
            },
          ]}
          rows={orders}
          emptyLabel="No orders placed yet."
        />
      </div>
    </DashboardLayout>
  );
}
